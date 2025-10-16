from rest_framework import serializers
from django.contrib.auth.models import AnonymousUser
from django.db.models import F, Value, ExpressionWrapper, DateTimeField
from django.utils import timezone
from datetime import timedelta

# Importamos Aviso para gestionar el quick-contact
from avisos.models import Aviso 
from .models import EstadoLead, Contacto, Evento, EstadoLeadHistorial
from propiedades.models import Propiedad

# Duración por defecto de un evento (minutos)
DEFAULT_EVENT_DURATION_MIN = 60

class EstadoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoLead
        fields = ["id", "fase", "descripcion"]


class ContactoSerializer(serializers.ModelSerializer):
    # read-only para multi-tenant (id del auth.User dueño)
    owner = serializers.ReadOnlyField(source="owner.id")

    # escribible por id
    estado = serializers.PrimaryKeyRelatedField(
        queryset=EstadoLead.objects.all(), allow_null=True, required=False
    )
    # lectura expandida
    estado_detalle = EstadoLeadSerializer(source="estado", read_only=True)
    telefono = serializers.CharField(required=False, allow_blank=True, max_length=15)
    # === Seguimiento: campos expuestos ===
    last_contact_at = serializers.DateTimeField(required=False, allow_null=True)
    next_contact_at = serializers.DateTimeField(required=False, allow_null=True)
    next_contact_note = serializers.CharField(required=False, allow_blank=True, max_length=255)

    # === Derivados del modelo (solo lectura) ===
    proximo_contacto_estado = serializers.ReadOnlyField()
    dias_sin_seguimiento = serializers.ReadOnlyField()

    class Meta:
        model = Contacto
        fields = [
            "id",
            "owner",
            "nombre",
            "apellido",
            "email",
            "telefono",
            "estado",
            "estado_detalle",
            # seguimiento
            "last_contact_at",
            "next_contact_at",
            "next_contact_note",
            # derivados
            "proximo_contacto_estado",
            "dias_sin_seguimiento",
            # metadatos
            "creado_en",
        ]
        read_only_fields = [
            "id",
            "owner",
            "estado_detalle",
            "proximo_contacto_estado",
            "dias_sin_seguimiento",
            "creado_en",
        ]
        
    def validate_telefono(self, v: str):
        # permitir vacío
        if not v:
            return v
        digits = "".join(ch for ch in v if ch.isdigit())
        # Si querés forzar exactamente lo mismo que el Regex del modelo:
        if not (1 <= len(digits) <= 15):
            raise serializers.ValidationError("Ingrese solo dígitos (1–15).")
        return digits
    # ---- Validaciones suaves de coherencia ----
    def validate(self, attrs):
        note = attrs.get("next_contact_note", getattr(self.instance, "next_contact_note", ""))
        if note and len(note) > 255:
            raise serializers.ValidationError({"next_contact_note": "Máximo 255 caracteres."})
        return attrs

    # ---- Create / Update (el historial lo maneja la signal) ----
    def create(self, validated_data):
        # Aseguramos el owner en la creación si está disponible
        user = self.context['request'].user
        if not isinstance(user, AnonymousUser) and user.is_authenticated:
             validated_data['owner'] = user
             
        contacto = Contacto.objects.create(**validated_data)
        return contacto

    def update(self, instance, validated_data):
        # Guardamos cambios ANTES de cualquier sincronización
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save() # Guarda Contacto y dispara signal para EstadoLeadHistorial

        # ----------------------------------------------------
        # Lógica de sincronización de Evento (para Quick-Contact/Dashboard)
        # ----------------------------------------------------
        
        # 1. Chequeamos si el próximo contacto fue modificado
        if "next_contact_at" in validated_data or "next_contact_note" in validated_data:
            
            next_contact_at = validated_data.get("next_contact_at")
            next_contact_note = validated_data.get("next_contact_note")
            
            # 💡 CLAVE: Usamos un Evento ficticio (sin propiedad) como marcador para el Quick Contact
            # Buscamos o creamos el Evento asociado al Lead y sin Propiedad
            evento_marcador, created = Evento.objects.get_or_create(
                 contacto=instance, 
                 propiedad__isnull=True, # Evento sin propiedad = Quick Contact
                 defaults={
                     'tipo': 'Llamada', 
                     'fecha_hora': timezone.now(), # Usar una fecha inicial para get_or_create
                     'owner': instance.owner, 
                 }
            )
            
            if next_contact_at is not None and instance.next_contact_at:
                # Caso A: Se programa un próximo contacto
                
                # Actualizamos el Evento Marcador
                evento_marcador.nombre = instance.nombre
                evento_marcador.apellido = instance.apellido
                evento_marcador.email = instance.email
                evento_marcador.tipo = 'Llamada' # Default para quick contact
                evento_marcador.fecha_hora = instance.next_contact_at # Usar la fecha ya guardada en instance
                evento_marcador.notas = next_contact_note or "Seguimiento rápido."
                evento_marcador.save() # Dispara signal para actualizar el Aviso
                
                # 📢 Notificación al frontend para actualizar el Dashboard (Calendario)
                try:
                     from django.core.signals import request_finished
                     request_finished.send(sender=self.__class__, refresh_dashboard=True)
                except ImportError:
                    pass

            else:
                # Caso B: next_contact_at es None (Se limpia el próximo contacto)
                # Eliminamos el Evento Marcador (y la señal post_delete eliminará el Aviso)
                evento_marcador.delete()
        
        return instance # Devuelve la instancia actualizada


class EstadoLeadHistorialSerializer(serializers.ModelSerializer):
    estado = EstadoLeadSerializer(read_only=True)

    class Meta:
        model = EstadoLeadHistorial
        fields = ["id", "contacto", "estado", "changed_at"]


class EventoSerializer(serializers.ModelSerializer):
    # read-only para multi-tenant
    owner = serializers.ReadOnlyField(source="owner.id")

    contacto = serializers.PrimaryKeyRelatedField(
        queryset=Contacto.objects.all(), allow_null=True, required=False
    )
    propiedad = serializers.PrimaryKeyRelatedField(queryset=Propiedad.objects.all())

    class Meta:
        model = Evento
        fields = [
            "id",
            "owner",
            "nombre",
            "apellido",
            "email",
            "contacto",
            "propiedad",
            "tipo",
            "fecha_hora",
            "notas",
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]

    # ----- Filtro de queryset por usuario autenticado (anti cross-tenant) -----
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not isinstance(user, AnonymousUser) and not (user.is_staff or user.is_superuser):
            # Limitá las opciones disponibles a lo del owner
            self.fields["contacto"].queryset = Contacto.objects.filter(owner=user)
            self.fields["propiedad"].queryset = Propiedad.objects.filter(owner=user)

    # ----- Validaciones anti cross-tenant (por si cambian el ID a mano) -----
    def validate_contacto(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not (user.is_staff or user.is_superuser):
            if value.owner_id != user.id:
                raise serializers.ValidationError("Contacto no pertenece al usuario autenticado.")
        return value

    def validate_propiedad(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not (user.is_staff or user.is_superuser):
            if value.owner_id != user.id:
                raise serializers.ValidationError("Propiedad no pertenece al usuario autenticado.")
        return value

    # ----- Validación anti-solapamiento, duplicado y fecha pasada (por propiedad) -----
    def validate(self, attrs):
        """
        - Previene eventos en el pasado (fecha_hora < ahora).
        - Previene duplicados exactos: misma propiedad + misma fecha_hora
        - Previene solapamiento: intervalo [fecha_hora, fecha_hora + duration) no debe
          intersectar con otros eventos de la misma propiedad.
        """
        fecha_hora = attrs.get("fecha_hora", getattr(self.instance, "fecha_hora", None))
        propiedad = attrs.get("propiedad", getattr(self.instance, "propiedad", None))
        if not fecha_hora or not propiedad:
            # Si faltan, dejamos que otras validaciones manejen el error
            return attrs

        # Normalizamos a timezone local
        fecha_hora_local = timezone.localtime(fecha_hora)
        now_local = timezone.localtime(timezone.now())
        if fecha_hora_local < now_local:
            raise serializers.ValidationError("No se puede programar un evento en una fecha/hora pasada.")

        duration_min = DEFAULT_EVENT_DURATION_MIN
        new_start = fecha_hora_local
        new_end = new_start + timedelta(minutes=duration_min)

        # Construimos queryset base (mismo propiedad), excluimos si estamos en update
        base_qs = Evento.objects.filter(propiedad=propiedad)
        if self.instance and getattr(self.instance, "id", None):
            base_qs = base_qs.exclude(id=self.instance.id)

        # Duplicado exacto
        if base_qs.filter(fecha_hora=fecha_hora).exists():
            raise serializers.ValidationError("Ya existe un evento exactamente en esa fecha y hora para la misma propiedad.")

        # Anotamos existing_end = fecha_hora + duration y chequeamos overlap:
        existing_end_expr = ExpressionWrapper(
            F("fecha_hora") + Value(timedelta(minutes=duration_min)),
            output_field=DateTimeField(),
        )
        overlap_qs = base_qs.annotate(existing_end=existing_end_expr).filter(
            fecha_hora__lt=new_end,
            existing_end__gt=new_start,
        )

        if overlap_qs.exists():
            first = overlap_qs.order_by("fecha_hora").first()
            raise serializers.ValidationError(
                f"El horario solapa con otro evento en la misma propiedad (desde {timezone.localtime(first.fecha_hora).isoformat()})."
            )

        return attrs

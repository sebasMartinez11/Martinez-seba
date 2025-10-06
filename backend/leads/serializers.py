from rest_framework import serializers
from django.contrib.auth.models import AnonymousUser

from .models import EstadoLead, Contacto, Evento, EstadoLeadHistorial
from propiedades.models import Propiedad


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

    # === Seguimiento: campos expuestos ===
    last_contact_at = serializers.DateTimeField(required=False, allow_null=True)
    next_contact_at = serializers.DateTimeField(required=False, allow_null=True)
    next_contact_note = serializers.CharField(required=False, allow_blank=True, max_length=255)

    # === Derivados del modelo (solo lectura) ===
    # Nota: si el nombre del field coincide con el atributo/property del modelo, no uses `source`
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
    # ...
        read_only_fields = [
            "id",
            "owner",
            "estado_detalle",
            "proximo_contacto_estado",
            "dias_sin_seguimiento",
            "creado_en",
        ]

    # ---- Validaciones suaves de coherencia ----
    def validate(self, attrs):
        note = attrs.get("next_contact_note", getattr(self.instance, "next_contact_note", ""))
        if note and len(note) > 255:
            raise serializers.ValidationError({"next_contact_note": "Máximo 255 caracteres."})
        return attrs

    # ---- Create / Update (el historial lo maneja la signal) ----
    def create(self, validated_data):
        contacto = Contacto.objects.create(**validated_data)
        # ⛔️ No crear historial acá: lo hace la signal post_save(Contacto).
        return contacto

    def update(self, instance, validated_data):
        # Guardamos cambios; si cambió 'estado', la signal generará el historial.
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class EstadoLeadHistorialSerializer(serializers.ModelSerializer):
    estado = EstadoLeadSerializer(read_only=True)

    class Meta:
        model = EstadoLeadHistorial
        fields = ["id", "contacto", "estado", "changed_at"]


class EventoSerializer(serializers.ModelSerializer):
<<<<<<< HEAD
    # 📌 Relación por ID (escribible)
=======
    # read-only para multi-tenant
    owner = serializers.ReadOnlyField(source="owner.id")

>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281
    contacto = serializers.PrimaryKeyRelatedField(
        queryset=Contacto.objects.all(), allow_null=True, required=False
    )
    propiedad = serializers.PrimaryKeyRelatedField(
        queryset=Propiedad.objects.all()
    )

    # 📌 Lectura expandida (nested, opcional)
    contacto_detalle = ContactoSerializer(source="contacto", read_only=True)
    propiedad_detalle = serializers.StringRelatedField(source="propiedad", read_only=True)

    # 📌 Campo tipo con choices del modelo
    tipo = serializers.ChoiceField(choices=Evento.TIPO_EVENTO_CHOICES)

    class Meta:
        model = Evento
        fields = [
            "id",
            "owner",
            "nombre",
            "apellido",
            "email",
            "contacto",
            "contacto_detalle",
            "propiedad",
            "propiedad_detalle",
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

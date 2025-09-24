from rest_framework import serializers
from .models import EstadoLead, Contacto, Evento, EstadoLeadHistorial
from propiedades.models import Propiedad


class EstadoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoLead
        fields = ["id", "fase", "descripcion"]


class ContactoSerializer(serializers.ModelSerializer):
    # escribible por id
    estado = serializers.PrimaryKeyRelatedField(
        queryset=EstadoLead.objects.all(), allow_null=True, required=False
    )
    # lectura expandida
    estado_detalle = EstadoLeadSerializer(source="estado", read_only=True)

    class Meta:
        model = Contacto
        fields = ["id", "nombre", "apellido", "email", "telefono", "estado", "estado_detalle"]


class EstadoLeadHistorialSerializer(serializers.ModelSerializer):
    estado = EstadoLeadSerializer(read_only=True)

    class Meta:
        model = EstadoLeadHistorial
        fields = ["id", "contacto", "estado", "changed_at"]


class EventoSerializer(serializers.ModelSerializer):
    # 📌 Relación por ID (escribible)
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

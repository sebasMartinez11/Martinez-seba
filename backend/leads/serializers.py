from rest_framework import serializers
from .models import EstadoLead, Contacto, Evento
from propiedades.models import Propiedad

class EstadoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoLead
        fields = ["id", "fase", "descripcion"]

class ContactoSerializer(serializers.ModelSerializer):
    estado = EstadoLeadSerializer(read_only=True)

    class Meta:
        model = Contacto
        fields = ["id", "nombre", "apellido", "email", "telefono", "estado"]

# === NUEVO ===
class EventoSerializer(serializers.ModelSerializer):
    contacto = serializers.PrimaryKeyRelatedField(
        queryset=Contacto.objects.all(), allow_null=True, required=False
    )
    propiedad = serializers.PrimaryKeyRelatedField(queryset=Propiedad.objects.all())

    class Meta:
        model = Evento
        fields = [
            "id", "nombre", "apellido", "email",
            "contacto", "propiedad",
            "tipo", "fecha_hora", "notas", "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]

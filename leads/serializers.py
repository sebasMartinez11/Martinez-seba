from rest_framework import serializers
from .models import EstadoLead, Contacto

class EstadoLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoLead
        fields = ["id", "fase", "descripcion"]

class ContactoSerializer(serializers.ModelSerializer):
    estado = EstadoLeadSerializer(read_only=True)
    estado_id = serializers.PrimaryKeyRelatedField(
        source="estado", queryset=EstadoLead.objects.all(),
        write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Contacto
        fields = [
            "id", "nombre", "apellido", "telefono", "email",
            "estado", "estado_id",
            "proximo_contacto", "ultimo_contacto",
        ]

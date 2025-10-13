from rest_framework import serializers
from .models import Propiedad, PropiedadImagen

class PropiedadImagenSerializer(serializers.ModelSerializer):
    imagen = serializers.ImageField(read_only=True)

    class Meta:
        model = PropiedadImagen
        fields = ["id", "imagen", "descripcion"]
        read_only_fields = ["id"]


class PropiedadSerializer(serializers.ModelSerializer):
    # multi-tenant (solo lectura): id del auth.User dueño
    owner = serializers.ReadOnlyField(source="owner.id")
    imagenes = PropiedadImagenSerializer(many=True, read_only=True)

    class Meta:
        model = Propiedad
        fields = [
            "id",
            "owner",
            "codigo",
            "titulo",
            "descripcion",
            "ubicacion",
            "tipo_de_propiedad",
            "disponibilidad",
            "precio",
            "moneda",
            "ambiente",
            "antiguedad",
            "banos",
            "superficie",
            "fecha_alta",
            "estado",
            "imagenes",
        ]
        read_only_fields = ["id", "fecha_alta"]
        

class SubirImagenesSerializer(serializers.Serializer):
    imagenes = serializers.ListField(child=serializers.ImageField(), allow_empty=False, required=False)
    imagen = serializers.ImageField(required=False)  # por si suben una sola con key 'imagen'
    descripcion = serializers.CharField(required=False, allow_blank=True)

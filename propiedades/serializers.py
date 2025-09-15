from rest_framework import serializers
from .models import Propiedad

class PropiedadSerializer(serializers.ModelSerializer):
    

    class Meta:
        model = Propiedad
        fields = [
            "id",
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
            "baño",
            "superficie",
            "fecha_alta",
            "estado",
            
        ]
        read_only_fields = ["id", "fecha_alta"]
        





        
      
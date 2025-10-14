from rest_framework import serializers
from .models import Aviso

# 1. Serializer reducido para Contacto (solo lo necesario para el aviso)
class ContactoMinSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    nombre = serializers.CharField(read_only=True)
    apellido = serializers.CharField(read_only=True)
    
# 2. Serializer reducido para Propiedad (solo lo necesario para el aviso)
class PropiedadMinSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    titulo = serializers.CharField(read_only=True)


# 3. Serializer principal para Aviso
class AvisoSerializer(serializers.ModelSerializer):
    # Campos anidados para expandir la información del Lead y la Propiedad
    lead_detalle = ContactoMinSerializer(source='lead', read_only=True)
    propiedad_detalle = PropiedadMinSerializer(source='propiedad', read_only=True)
    
<<<<<<< HEAD
    # 👇 ======================= INICIO DE LA CORRECCIÓN ======================= 👇
    # Declaramos manualmente el campo "estado" para evitar el error.
    estado = serializers.ChoiceField(choices=Aviso.ESTADOS)
    # 👆 ======================== FIN DE LA CORRECCIÓN ======================== 👆

=======
>>>>>>> 5e25755c4aec0e720dc5ffd0e1caf94445721e39
    class Meta:
        model = Aviso
        fields = [
            "id",
            "titulo",
            "descripcion",
            "fecha",
            "estado",
            "evento",
            "lead",
            "propiedad",
            "creado_en",
            "actualizado_en",
            "lead_detalle",        # Nuevo campo expandido
            "propiedad_detalle",   # Nuevo campo expandido
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]
        extra_kwargs = {
            # Hacemos estos campos de solo lectura ya que usaremos los detalles
            'lead': {'write_only': True, 'required': False}, 
            'propiedad': {'write_only': True, 'required': False},
<<<<<<< HEAD
        }
=======
        }
>>>>>>> 5e25755c4aec0e720dc5ffd0e1caf94445721e39

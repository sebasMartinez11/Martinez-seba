from rest_framework import serializers
from .models import Aviso
# Importamos los modelos relacionados para usarlos en los PrimaryKeyRelatedField
from leads.models import Evento, Contacto
from propiedades.models import Propiedad

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
    # Campos anidados para expandir la información del Lead y la Propiedad (para lectura)
    lead_detalle = ContactoMinSerializer(source='lead', read_only=True)
    propiedad_detalle = PropiedadMinSerializer(source='propiedad', read_only=True)
    
    # Declaramos manualmente el campo con "choices"
    estado = serializers.ChoiceField(choices=Aviso.ESTADOS)

    # 👇 ======================= INICIO DE LA CORRECCIÓN ======================= 👇
    # Declaramos manualmente los campos ForeignKey para evitar el error 'serializer_related_field'
    # Estos campos se usarán para escribir (crear/editar) el aviso por ID.
    evento = serializers.PrimaryKeyRelatedField(
        queryset=Evento.objects.all(), required=False, allow_null=True
    )
    lead = serializers.PrimaryKeyRelatedField(
        queryset=Contacto.objects.all(), required=False, allow_null=True
    )
    propiedad = serializers.PrimaryKeyRelatedField(
        queryset=Propiedad.objects.all(), required=False, allow_null=True
    )
    # 👆 ======================== FIN DE LA CORRECCIÓN ======================== 👆

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
            "lead_detalle",        # Campo expandido para lectura
            "propiedad_detalle",   # Campo expandido para lectura
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]
        # Ya no necesitamos extra_kwargs porque definimos los campos manualmente arriba
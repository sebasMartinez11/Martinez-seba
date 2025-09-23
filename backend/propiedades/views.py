from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Propiedad, PropiedadImagen
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Propiedad, PropiedadImagen
from .serializers import PropiedadSerializer, SubirImagenesSerializer, PropiedadImagenSerializer

class PropiedadViewSet(viewsets.ModelViewSet):
    queryset = Propiedad.objects.all()
    serializer_class = PropiedadSerializer

    @action(detail=True, methods=["post"], url_path="subir-imagenes")
    def subir_imagenes(self, request, pk=None):
        """
        Permite subir una o varias imágenes para la propiedad {pk}.
        Acepta:
          - 'imagen' (una sola)  o
          - 'imagenes' (lista de archivos)
          - 'descripcion' (opcional, misma para todas las subidas)
        """
        propiedad = self.get_object()
        serializer = SubirImagenesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        imagenes_subidas = []
        descripcion = serializer.validated_data.get("descripcion", "")

        # caso 1: una sola
        imagen = serializer.validated_data.get("imagen")
        if imagen:
            obj = PropiedadImagen.objects.create(
                propiedad=propiedad, imagen=imagen, descripcion=descripcion
            )
            imagenes_subidas.append(obj)

        # caso 2: lista
        imagenes = serializer.validated_data.get("imagenes", [])
        for img in imagenes:
            obj = PropiedadImagen.objects.create(
                propiedad=propiedad, imagen=img, descripcion=descripcion
            )
            imagenes_subidas.append(obj)

        data = PropiedadImagenSerializer(imagenes_subidas, many=True).data
        return Response({"subidas": len(imagenes_subidas), "imagenes": data}, status=status.HTTP_201_CREATED)


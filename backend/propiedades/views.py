from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Propiedad, PropiedadImagen
from .serializers import PropiedadSerializer, SubirImagenesSerializer, PropiedadImagenSerializer


# ---------- Mixin multi-tenant ----------
class OwnedQuerysetMixin:
    """
    - Exige autenticación
    - Filtra el queryset por owner=request.user (salvo staff/súperuser)
    - Setea owner automáticamente en create
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return qs
        return qs.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PropiedadViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
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
        # Asegurar ownership antes de subir
        try:
            propiedad = self.get_queryset().get(pk=pk)  # respeta filtro de owner
        except Propiedad.DoesNotExist:
            return Response({"detail": "Propiedad no encontrada"}, status=status.HTTP_404_NOT_FOUND)

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

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Propiedad, PropiedadImagen

from .serializers import (
    PropiedadSerializer,
    PropiedadImagenSerializer,
    SubirImagenesSerializer,  
)


class PropiedadViewSet(viewsets.ModelViewSet):
    queryset = Propiedad.objects.all()
    serializer_class = PropiedadSerializer

    # Habilitamos multipart para uploads y JSON para el resto
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    # Búsqueda y orden
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "titulo", "ubicacion", "tipo_de_propiedad", "estado", "disponibilidad", "moneda"]
    ordering_fields = ["precio", "fecha_alta", "ambiente", "antiguedad", "superficie"]
    ordering = ["-fecha_alta"]

    @action(
        detail=True,
        methods=["post"],
        url_path="subir-imagenes",
        serializer_class=SubirImagenesSerializer,   # <- hace que la UI muestre inputs de archivo
        parser_classes=[MultiPartParser, FormParser],
    )
    def subir_imagenes(self, request, pk=None):
        """Sube una o varias imágenes a la propiedad."""
        propiedad = self.get_object()

        # Validamos con el serializer de la acción (para Browsable API y errores claros)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # Aceptamos 'imagenes' (múltiple) o 'imagen' (una)
        files = request.FILES.getlist("imagenes") or request.FILES.getlist("imagen")
        if not files:
            return Response(
                {"detail": "Adjunta al menos un archivo en el campo 'imagenes'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        descripcion = ser.validated_data.get("descripcion", "")

        creadas = []
        for f in files:
            obj = PropiedadImagen.objects.create(
                propiedad=propiedad,
                imagen=f,
                descripcion=descripcion,
            )
            creadas.append(obj)

        data = PropiedadImagenSerializer(creadas, many=True, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="imagenes")
    def listar_imagenes(self, request, pk=None):
        """Lista las imágenes de la propiedad."""
        propiedad = self.get_object()
        qs = propiedad.imagenes.order_by("-id")
        data = PropiedadImagenSerializer(qs, many=True, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["delete"], url_path=r"imagenes/(?P<img_id>\d+)")
    def borrar_imagen(self, request, pk=None, img_id=None):
        """Elimina la imagen y el archivo físico."""
        propiedad = self.get_object()
        try:
            img = propiedad.imagenes.get(id=img_id)
        except PropiedadImagen.DoesNotExist:
            return Response({"detail": "Imagen no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        # Borrar archivo físico primero
        if img.imagen:
            img.imagen.delete(save=False)
        img.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

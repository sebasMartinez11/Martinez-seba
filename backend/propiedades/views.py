from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction 
from .models import Propiedad, PropiedadImagen
from .serializers import PropiedadSerializer, SubirImagenesSerializer, PropiedadImagenSerializer 


# ---------- TU Mixin multi-tenant (SIN CAMBIOS) ----------
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
    queryset = Propiedad.objects.all().order_by('-id') 
    serializer_class = PropiedadSerializer
    permission_classes = [IsAuthenticated] 

    # --- NUEVO MÉTODO 'CREATE' (REEMPLAZA AL DE POR DEFECTO) ---
    @transaction.atomic 
    def create(self, request, *args, **kwargs):
        """
        Sobrescribe el método 'create' para manejar la subida de múltiples imágenes
        JUNTO con los datos de la propiedad, en una sola petición.
        """
        
        # 1. Validar y crear la Propiedad (sin las imágenes)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            propiedad = serializer.save(owner=self.request.user)
        
        except Exception as e:
            return Response(
                {"detail": f"Error al guardar la propiedad: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Obtener la lista de archivos de imagen
        imagenes_data = request.FILES.getlist('imagenes')

        # 3. Iterar y crear cada PropiedadImagen
        for imagen_file in imagenes_data:
            PropiedadImagen.objects.create(
                propiedad=propiedad,
                imagen=imagen_file
            )

        # 4. Devolver la respuesta exitosa
        response_serializer = self.get_serializer(propiedad)
        headers = self.get_success_headers(response_serializer.data)
        return Response(
            response_serializer.data, 
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    # --- TU ACCIÓN PERSONALIZADA (SIN CAMBIOS) ---
    # Esto sigue siendo útil para AÑADIR/EDITAR imágenes después
    @action(detail=True, methods=["post"], url_path="subir-imagenes")
    def subir_imagenes(self, request, pk=None):
        """
        Permite subir una o varias imágenes para la propiedad {pk}.
        """
        try:
            propiedad = self.get_queryset().get(pk=pk)  # respeta filtro de owner
        except Propiedad.DoesNotExist:
            return Response({"detail": "Propiedad no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # (Tu lógica de Serializer... todo esto está perfecto)
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


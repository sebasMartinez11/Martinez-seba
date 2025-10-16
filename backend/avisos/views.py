from rest_framework import viewsets, permissions
from .models import Aviso
from .serializers import AvisoSerializer

class AvisoViewSet(viewsets.ModelViewSet):
    # Usamos IsAuthenticated para asegurar que solo usuarios logeados accedan
    permission_classes = [permissions.IsAuthenticated]
    
    # Ordenamos por fecha, los más próximos primero
    queryset = Aviso.objects.all().order_by("fecha") 
    serializer_class = AvisoSerializer

    def get_queryset(self):
        """
        Devuelve solo los avisos que pertenecen al usuario autenticado.
        """
        user = self.request.user
        if user.is_authenticated:
            # Filtramos por el owner del Lead o Propiedad asociada, asumiendo
            # que estos modelos tienen el campo 'owner' relacionado.
            # Sin embargo, tu modelo Aviso tiene campos 'lead' y 'propiedad'. 
            # Lo más simple y correcto es filtrar por el dueño del Lead.
            # Asumimos que Aviso también debería tener un campo 'owner' para consistencia,
            # pero por ahora, filtramos por lead si existe, o mostramos todo si no está relacionado.
            # Ya que no hay campo 'owner' en Aviso directamente, nos enfocamos en el lead.
            # 
            # Nota: Si tu modelo Aviso fue diseñado para tener el owner a través de Contacto,
            # lo correcto es buscar avisos donde el lead tenga al usuario como dueño.
            return Aviso.objects.filter(lead__owner=user).order_by("fecha")
        
        # Devolver un QuerySet vacío si no hay usuario autenticado
        return Aviso.objects.none()

    def perform_create(self, serializer):
        # Aseguramos que el usuario dueño sea el usuario de la solicitud.
        # Esto es crucial para la seguridad Multi-Tenant.
        if self.request.user.is_authenticated:
            # Aquí es complejo si Aviso se crea a través de Evento/Contacto, 
            # pero si fuera a mano, guardaríamos el owner.
            # Como Aviso se crea por señal, solo necesitamos asegurar el filtrado (get_queryset).
            serializer.save()
        else:
            # No permitir crear si no está autenticado
            raise permissions.PermissionDenied("Debes estar autenticado para crear un Aviso.")

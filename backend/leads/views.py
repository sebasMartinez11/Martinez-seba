# leads/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import EstadoLead, Contacto, Evento, EstadoLeadHistorial
from .serializers import (
    EstadoLeadSerializer,
    ContactoSerializer,
    EventoSerializer,
    EstadoLeadHistorialSerializer,
)

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


# === Estados === (globales; si querés que sean por user, hacelo Owned)
class EstadoLeadViewSet(viewsets.ModelViewSet):
    queryset = EstadoLead.objects.all().order_by("fase")
    serializer_class = EstadoLeadSerializer


# === Contactos ===
class ContactoViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Contacto.objects.all().order_by("-id")
    serializer_class = ContactoSerializer

    # GET /api/contactos/{id}/estado-historial/
    @action(detail=True, methods=["get"], url_path="estado-historial")
    def estado_historial(self, request, pk=None):
        # Garantizar que el contacto sea del owner actual (o admin)
        try:
            contacto = Contacto.objects.get(pk=pk)
        except Contacto.DoesNotExist:
            return Response({"detail": "Contacto no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not (user.is_staff or user.is_superuser) and contacto.owner_id != user.id:
            return Response({"detail": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)

        qs = (
            EstadoLeadHistorial.objects
            .filter(contacto_id=pk)
            .select_related("estado")
            .order_by("-changed_at")
        )
        ser = EstadoLeadHistorialSerializer(qs, many=True)
        return Response(ser.data)


# === Eventos ===
class EventoViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Evento.objects.all().select_related("contacto", "propiedad").order_by("-fecha_hora", "-id")
    serializer_class = EventoSerializer

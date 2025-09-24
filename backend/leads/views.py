# leads/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import EstadoLead, Contacto, Evento, EstadoLeadHistorial
from .serializers import (
    EstadoLeadSerializer,
    ContactoSerializer,
    EventoSerializer,
    EstadoLeadHistorialSerializer,
)

# === Estados ===
class EstadoLeadViewSet(viewsets.ModelViewSet):
    queryset = EstadoLead.objects.all().order_by("fase")
    serializer_class = EstadoLeadSerializer


# === Contactos ===
class ContactoViewSet(viewsets.ModelViewSet):
    queryset = Contacto.objects.all().order_by("-id")
    serializer_class = ContactoSerializer

    # GET /api/contactos/{id}/estado-historial/
    @action(detail=True, methods=["get"], url_path="estado-historial")
    def estado_historial(self, request, pk=None):
        qs = (
            EstadoLeadHistorial.objects
            .filter(contacto_id=pk)
            .select_related("estado")
            .order_by("-changed_at")
        )
        ser = EstadoLeadHistorialSerializer(qs, many=True)
        return Response(ser.data)


# === Eventos ===
class EventoViewSet(viewsets.ModelViewSet):
    queryset = Evento.objects.all().select_related("contacto", "propiedad").order_by("-fecha_hora", "-id")
    serializer_class = EventoSerializer

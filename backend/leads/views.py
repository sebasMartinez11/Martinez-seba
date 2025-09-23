from rest_framework import viewsets
from .models import EstadoLead, Contacto, Evento
from .serializers import EstadoLeadSerializer, ContactoSerializer, EventoSerializer

class EstadoLeadViewSet(viewsets.ModelViewSet):
    queryset = EstadoLead.objects.all()
    serializer_class = EstadoLeadSerializer

class ContactoViewSet(viewsets.ModelViewSet):
    queryset = Contacto.objects.all()
    serializer_class = ContactoSerializer

# === NUEVO ===
class EventoViewSet(viewsets.ModelViewSet):
    queryset = Evento.objects.select_related("contacto", "propiedad").all()
    serializer_class = EventoSerializer

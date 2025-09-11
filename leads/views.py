from rest_framework import viewsets
from .models import EstadoLead, Contacto
from .serializers import EstadoLeadSerializer, ContactoSerializer

class EstadoLeadViewSet(viewsets.ModelViewSet):
    queryset = EstadoLead.objects.all().order_by("fase")
    serializer_class = EstadoLeadSerializer

class ContactoViewSet(viewsets.ModelViewSet):
    queryset = Contacto.objects.all().order_by("id")
    serializer_class = ContactoSerializer

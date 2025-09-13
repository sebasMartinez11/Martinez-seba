from rest_framework import viewsets
from .models import Propiedad
from .serializers import  PropiedadSerializer


class PropiedadViewSet(viewsets.ModelViewSet):
    queryset = Propiedad.objects.all().order_by("-fecha_alta")
    serializer_class = PropiedadSerializer

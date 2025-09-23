import django_filters
from .models import Contacto

class ContactoFilter(django_filters.FilterSet):
    # /api/leads/contactos/?estado=ID
    estado = django_filters.NumberFilter(field_name="estado_id")
    # /api/leads/contactos/?desde=2025-08-20&hasta=2025-09-10  (sobre ultimo_contacto)
    desde = django_filters.DateFilter(field_name="ultimo_contacto", lookup_expr="date__gte")
    hasta = django_filters.DateFilter(field_name="ultimo_contacto", lookup_expr="date__lte")

    class Meta:
        model = Contacto
        fields = ["estado", "desde", "hasta"]

from django.shortcuts import render
from django.utils import timezone
from django.db.models import Count
from rest_framework.decorators import api_view
from rest_framework.response import Response

from leads.models import Contacto, EstadoLead


@api_view(["GET"])
def dashboard_data(request):
    """API REST para métricas del dashboard basadas en Contacto"""

    # Total de contactos
    total_contactos = Contacto.objects.count()

    # Contactos por estado (fase del lead)
    contactos_por_estado = (
        Contacto.objects.values("estado__fase")
        .annotate(total=Count("estado"))
        .order_by("estado__fase")
    )

    # Próximos contactos programados (para hoy en adelante)
    ahora = timezone.now()
    proximos_contactos = Contacto.objects.filter(
        proximo_contacto__gte=ahora
    ).count()

    # Contactos atrasados (proximo_contacto en el pasado)
    atrasados = Contacto.objects.filter(
        proximo_contacto__lt=ahora
    ).count()

    # Últimos 5 contactos registrados
    ultimos_contactos = list(
        Contacto.objects.order_by("-id").values("id", "nombre", "apellido", "email")[:5]
    )

    data = {
        "total_contactos": total_contactos,
        "contactos_por_estado": list(contactos_por_estado),
        "proximos_contactos": proximos_contactos,
        "atrasados": atrasados,
        "ultimos_contactos": ultimos_contactos,
    }
    return Response(data)


# Si también querés usar Templates (HTML)
def index(request):
    """Renderiza dashboard en HTML"""
    ahora = timezone.now()

    context = {
        "total_contactos": Contacto.objects.count(),
        "contactos_por_estado": Contacto.objects.values("estado__fase")
                                    .annotate(total=Count("estado")),
        "proximos_contactos": Contacto.objects.filter(proximo_contacto__gte=ahora).count(),
        "atrasados": Contacto.objects.filter(proximo_contacto__lt=ahora).count(),
        "ultimos_contactos": Contacto.objects.order_by("-id")[:5],
    }
    return render(request, "dashboard/index.html", context)

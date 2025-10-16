from django.shortcuts import render
from django.utils import timezone
from django.db.models import Count
from rest_framework.decorators import api_view
from rest_framework.response import Response

from leads.models import Contacto, EstadoLead
from avisos.models import Aviso # Nueva importación


@api_view(["GET"])
def dashboard_data(request):
    """API REST para métricas del dashboard basadas en Contacto y Avisos"""

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
    proximos_contactos_count = Contacto.objects.filter(
        next_contact_at__gte=ahora
    ).count()

    # Contactos atrasados (proximo_contacto en el pasado)
    atrasados_count = Contacto.objects.filter(
        next_contact_at__lt=ahora
    ).count()

    # Últimos 5 contactos registrados
    ultimos_contactos = list(
        Contacto.objects.order_by("-id").values("id", "nombre", "apellido", "email")[:5]
    )
    
    # Nuevas consultas para avisos pendientes y atrasados
    avisos_pendientes_count = Aviso.objects.filter(estado="pendiente").count()
    avisos_atrasados_count = Aviso.objects.filter(estado="atrasado").count()

    data = {
        "total_contactos": total_contactos,
        "contactos_por_estado": list(contactos_por_estado),
        "proximos_contactos": proximos_contactos_count,
        "atrasados": atrasados_count,
        "ultimos_contactos": ultimos_contactos,
        "avisos_pendientes": avisos_pendientes_count,
        "avisos_atrasados": avisos_atrasados_count,
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
        "proximos_contactos": Contacto.objects.filter(next_contact_at__gte=ahora).count(),
        "atrasados": Contacto.objects.filter(next_contact_at__lt=ahora).count(),
        "ultimos_contactos": Contacto.objects.order_by("-id")[:5],
    }
    return render(request, "dashboard/index.html", context)
# leads/views.py
from datetime import timedelta
from django.db.models import Q
from django.utils import timezone

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


# === Estados ===
class EstadoLeadViewSet(viewsets.ModelViewSet):
    queryset = EstadoLead.objects.all().order_by("fase")
    serializer_class = EstadoLeadSerializer


# === Contactos ===
class ContactoViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Contacto.objects.all().order_by("-id")
    serializer_class = ContactoSerializer

    # --------- Búsqueda / Filtros / Orden ----------
    def get_queryset(self):
        qs = super().get_queryset()
        request = self.request
        params = request.query_params

        # Búsqueda simple
        q = params.get("q")
        if q:
            qs = qs.filter(
                Q(nombre__icontains=q)
                | Q(apellido__icontains=q)
                | Q(email__icontains=q)
                | Q(telefono__icontains=q)
            )

        # Filtro por estado
        estado_id = params.get("estado")
        if estado_id:
            qs = qs.filter(estado_id=estado_id)

        # Filtro por vencimiento
        vencimiento = params.get("vencimiento")
        proximo_en_dias = params.get("proximo_en_dias")
        try:
            proximo_en_dias = int(proximo_en_dias) if proximo_en_dias is not None else 3
        except ValueError:
            proximo_en_dias = 3

        now = timezone.localtime()
        hoy = now.date()
        manana = hoy + timedelta(days=1)
        limite_proximo = hoy + timedelta(days=proximo_en_dias)

        if vencimiento == "pendiente":
            qs = qs.filter(next_contact_at__isnull=True)
        elif vencimiento == "vencido":
            qs = qs.filter(
                next_contact_at__lt=timezone.make_aware(
                    timezone.datetime.combine(hoy, timezone.datetime.min.time())
                )
            )
        elif vencimiento == "hoy":
            inicio_hoy = timezone.make_aware(timezone.datetime.combine(hoy, timezone.datetime.min.time()))
            fin_hoy = inicio_hoy + timedelta(days=1)
            qs = qs.filter(next_contact_at__gte=inicio_hoy, next_contact_at__lt=fin_hoy)
        elif vencimiento == "proximo":
            inicio_manana = timezone.make_aware(timezone.datetime.combine(manana, timezone.datetime.min.time()))
            fin_limite = timezone.make_aware(
                timezone.datetime.combine(limite_proximo + timedelta(days=1), timezone.datetime.min.time())
            )
            qs = qs.filter(next_contact_at__gte=inicio_manana, next_contact_at__lt=fin_limite)

        # Filtro sin seguimiento
        sin_seg_dias = params.get("sin_seguimiento_en_dias")
        if sin_seg_dias:
            try:
                dias = int(sin_seg_dias)
                borde = hoy - timedelta(days=dias)
                borde_dt = timezone.make_aware(timezone.datetime.combine(borde, timezone.datetime.min.time()))
                qs = qs.filter(Q(last_contact_at__lt=borde_dt) | Q(last_contact_at__isnull=True))
            except ValueError:
                pass

        # Ordenamiento
        ordering = params.get("ordering")
        allowed = {"id", "creado_en", "last_contact_at", "next_contact_at"}
        if ordering:
            raw = ordering.split(",")
            safe_fields = []
            for f in raw:
                f = f.strip()
                base = f[1:] if f.startswith("-") else f
                if base in allowed:
                    safe_fields.append(f)
            if safe_fields:
                qs = qs.order_by(*safe_fields)

        return qs

    # ----- Guardar historial de estado -----
    def perform_create(self, serializer):
        contacto = serializer.save(owner=self.request.user)
        if contacto.estado:
            EstadoLeadHistorial.objects.create(contacto=contacto, estado=contacto.estado)

    def perform_update(self, serializer):
        contacto = serializer.save()
        if contacto.estado:
            EstadoLeadHistorial.objects.create(contacto=contacto, estado=contacto.estado)

    # GET /api/contactos/{id}/estado-historial/
    @action(detail=True, methods=["get"], url_path="estado-historial")
    def estado_historial(self, request, pk=None):
        try:
            contacto = Contacto.objects.get(pk=pk)
        except Contacto.DoesNotExist:
            return Response({"detail": "Contacto no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not (user.is_staff or user.is_superuser) and contacto.owner_id != user.id:
            return Response({"detail": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)

        qs = EstadoLeadHistorial.objects.filter(contacto_id=pk).select_related("estado").order_by("-changed_at")
        ser = EstadoLeadHistorialSerializer(qs, many=True)
        return Response(ser.data)

    # GET /api/contactos/avisos/
    @action(detail=False, methods=["get"], url_path="avisos")
    def avisos(self, request):
        recordame_param = request.query_params.get("recordame_cada", None)
        recordame_cada = None

        if recordame_param is None:
            try:
                from usuarios.models import Usuario  # noqa
                auth_user = request.user
                email = getattr(auth_user, "email", None) or getattr(auth_user, "username", None)
                pref = None
                if email:
                    u = Usuario.objects.filter(email__iexact=email).only("reminder_every_days").first()
                    if u and u.reminder_every_days:
                        pref = int(u.reminder_every_days)
                recordame_cada = pref if (isinstance(pref, int) and pref > 0) else 3
            except Exception:
                recordame_cada = 3
        else:
            try:
                recordame_cada = int(recordame_param)
                if recordame_cada <= 0:
                    recordame_cada = 3
            except ValueError:
                recordame_cada = 3

        try:
            proximo_en_dias = int(request.query_params.get("proximo_en_dias", 3))
        except ValueError:
            proximo_en_dias = 3

        try:
            limit = int(request.query_params.get("limit", 50))
        except ValueError:
            limit = 50

        now = timezone.localtime()
        hoy = now.date()
        inicio_hoy = timezone.make_aware(timezone.datetime.combine(hoy, timezone.datetime.min.time()))
        fin_hoy = inicio_hoy + timedelta(days=1)
        inicio_manana = fin_hoy
        fin_proximos = timezone.make_aware(
            timezone.datetime.combine(hoy + timedelta(days=proximo_en_dias + 1), timezone.datetime.min.time())
        )
        borde_sin_seg = hoy - timedelta(days=recordame_cada)
        borde_sin_seg_dt = timezone.make_aware(timezone.datetime.combine(borde_sin_seg, timezone.datetime.min.time()))

        base_qs = self.get_queryset()

        def serialize_subset(qs):
            qs = qs.only(
                "id", "nombre", "apellido", "last_contact_at", "next_contact_at", "next_contact_note", "creado_en"
            )
            data = ContactoSerializer(qs, many=True, context={"request": request}).data
            return [
                {
                    "id": it["id"],
                    "nombre": it["nombre"],
                    "apellido": it["apellido"],
                    "last_contact_at": it["last_contact_at"],
                    "next_contact_at": it["next_contact_at"],
                    "next_contact_note": it["next_contact_note"],
                    "proximo_contacto_estado": it["proximo_contacto_estado"],
                    "dias_sin_seguimiento": it["dias_sin_seguimiento"],
                    "creado_en": it["creado_en"],
                }
                for it in data
            ]

        pendientes_qs = base_qs.filter(next_contact_at__isnull=True).order_by("-id")[:limit]
        vencidos_qs = base_qs.filter(next_contact_at__lt=inicio_hoy).order_by("next_contact_at")[:limit]
        hoy_qs = base_qs.filter(next_contact_at__gte=inicio_hoy, next_contact_at__lt=fin_hoy).order_by("next_contact_at")[:limit]
        proximos_qs = base_qs.filter(next_contact_at__gte=inicio_manana, next_contact_at__lt=fin_proximos).order_by("next_contact_at")[:limit]
        sin_seg_qs = base_qs.filter(Q(last_contact_at__lt=borde_sin_seg_dt) | Q(last_contact_at__isnull=True)).order_by("last_contact_at")[:limit]

        payload = {
            "params": {
                "recordame_cada": recordame_cada,
                "proximo_en_dias": proximo_en_dias,
                "limit": limit,
            },
            "pendientes": {"count": pendientes_qs.count(), "items": serialize_subset(pendientes_qs)},
            "vencidos": {"count": vencidos_qs.count(), "items": serialize_subset(vencidos_qs)},
            "vence_hoy": {"count": hoy_qs.count(), "items": serialize_subset(hoy_qs)},
            "proximos": {"count": proximos_qs.count(), "items": serialize_subset(proximos_qs)},
            "sin_seguimiento": {"count": sin_seg_qs.count(), "items": serialize_subset(sin_seg_qs)},
        }
        return Response(payload)


# === Eventos ===
class EventoViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Evento.objects.all().select_related("contacto", "propiedad").order_by("-fecha_hora", "-id")
    serializer_class = EventoSerializer

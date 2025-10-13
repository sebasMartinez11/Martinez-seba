# leads/views.py
from datetime import datetime, timedelta, time as dt_time
from django.db.models import Q, F, ExpressionWrapper, DateTimeField, Value
from django.utils import timezone
from django.db import transaction

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from .models import EstadoLead, Contacto, Evento, EstadoLeadHistorial
from .serializers import (
    EstadoLeadSerializer,
    ContactoSerializer,
    EventoSerializer,
    EstadoLeadHistorialSerializer,
)

# Duración por defecto de un evento en minutos (ajustable)
DEFAULT_EVENT_DURATION_MIN = 60

# ---------- Helpers de fecha/hora (sin dependencias externas) ----------
def _to_local_aware(dt: datetime) -> datetime:
    """Asegura datetimes conscientes en la tz local."""
    if dt.tzinfo is None:
        return timezone.make_aware(dt)
    return timezone.localtime(dt)

def _parse_date_or_datetime(s: str, end_of_day: bool = False) -> datetime | None:
    """
    Admite:
      - 'YYYY-MM-DD'  -> 00:00 (o fin de día si end_of_day=True)
      - ISO parcial/total 'YYYY-MM-DDTHH:MM[:SS]' (sin tz): se asume local tz
      - ISO con tz: se normaliza a tz local
    """
    if not s:
        return None
    s = s.strip()
    # Solo fecha
    if len(s) == 10 and s[4] == "-" and s[7] == "-":
        try:
            d = datetime.strptime(s, "%Y-%m-%d").date()
            base = datetime.combine(d, dt_time.max if end_of_day else dt_time.min)
            return _to_local_aware(base)
        except Exception:
            return None
    # ISO con hora (permite sin segundos)
    try:
        dt = datetime.fromisoformat(s)
        return _to_local_aware(dt)
    except Exception:
        # Intento sin tz HH:MM
        try:
            dt = datetime.strptime(s, "%Y-%m-%d %H:%M")
            return _to_local_aware(dt)
        except Exception:
            return None


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
        # Solo seteamos el owner; el historial lo crean las signals
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
                    datetime.combine(hoy, dt_time.min)
                )
            )
        elif vencimiento == "hoy":
            inicio_hoy = timezone.make_aware(datetime.combine(hoy, dt_time.min))
            fin_hoy = inicio_hoy + timedelta(days=1)
            qs = qs.filter(next_contact_at__gte=inicio_hoy, next_contact_at__lt=fin_hoy)
        elif vencimiento == "proximo":
            inicio_manana = timezone.make_aware(datetime.combine(manana, dt_time.min))
            fin_limite = timezone.make_aware(
                datetime.combine(limite_proximo + timedelta(days=1), dt_time.min)
            )
            qs = qs.filter(next_contact_at__gte=inicio_manana, next_contact_at__lt=fin_limite)

        # Filtro sin seguimiento
        sin_seg_dias = params.get("sin_seguimiento_en_dias")
        if sin_seg_dias:
            try:
                dias = int(sin_seg_dias)
                borde = hoy - timedelta(days=dias)
                borde_dt = timezone.make_aware(datetime.combine(borde, dt_time.min))
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
        inicio_hoy = timezone.make_aware(datetime.combine(hoy, dt_time.min))
        fin_hoy = inicio_hoy + timedelta(days=1)
        inicio_manana = fin_hoy
        fin_proximos = timezone.make_aware(
            datetime.combine(hoy + timedelta(days=proximo_en_dias + 1), dt_time.min)
        )
        borde_sin_seg = hoy - timedelta(days=recordame_cada)
        borde_sin_seg_dt = timezone.make_aware(datetime.combine(borde_sin_seg, dt_time.min))

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

    # --------- Filtros / Orden para listar agenda (Paso 1) ----------
    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params

        # Rango de fechas:
        # - from=... (inclusive)   - to=... (exclusivo si es fecha + 1 día, inclusivo si datetime)
        # - date=YYYY-MM-DD (atajo para todo ese día)
        date_only = p.get("date")
        if date_only and not p.get("from") and not p.get("to"):
            start = _parse_date_or_datetime(date_only, end_of_day=False)
            if start:
                end = _parse_date_or_datetime(date_only, end_of_day=True)
                end = end + timedelta(microseconds=1)  # evitar colisión max time
                qs = qs.filter(fecha_hora__gte=start, fecha_hora__lt=end)

        else:
            start_s = p.get("from")
            end_s = p.get("to")
            if start_s:
                start = _parse_date_or_datetime(start_s, end_of_day=False)
                if start:
                    qs = qs.filter(fecha_hora__gte=start)
            if end_s:
                # Si viene solo fecha, interpretamos fin de día (exclusivo -> +1 día)
                if len(end_s.strip()) == 10:
                    end = _parse_date_or_datetime(end_s, end_of_day=True)
                    end = end + timedelta(microseconds=1)
                else:
                    end = _parse_date_or_datetime(end_s, end_of_day=False)
                if end:
                    qs = qs.filter(fecha_hora__lt=end)

        # Filtro por tipos (CSV o repetido ?types=Reunion&types=Visita)
        types_param = p.getlist("types") or ([p.get("types")] if p.get("types") else [])
        tipos = []
        for t in types_param:
            if not t:
                continue
            for piece in t.split(","):
                val = piece.strip()
                if val:
                    tipos.append(val)
        if tipos:
            qs = qs.filter(tipo__in=tipos)

        # Orden seguro
        allowed = {"id", "fecha_hora", "tipo", "creado_en"}
        ordering = p.get("ordering")
        if ordering:
            raw = ordering.split(",")
            safe = []
            for f in raw:
                f = f.strip()
                base = f[1:] if f.startswith("-") else f
                if base in allowed:
                    safe.append(f)
            if safe:
                qs = qs.order_by(*safe)

        return qs

    # ---------- Helpers de validación server-side (re-check en DB) ----------
    def _events_overlapping(self, propiedad, new_start, duration_minutes=DEFAULT_EVENT_DURATION_MIN, ignore_id=None):
        """
        Retorna queryset de eventos que solapan con el rango [new_start, new_start + duration).
        Solo compara eventos de la misma propiedad.
        """
        new_start = timezone.localtime(new_start)
        new_end = new_start + timedelta(minutes=duration_minutes)

        base_qs = Evento.objects.filter(propiedad=propiedad)
        if ignore_id:
            base_qs = base_qs.exclude(id=ignore_id)

        # Annotate existing_end = fecha_hora + duration
        existing_end_expr = ExpressionWrapper(
            F("fecha_hora") + Value(timedelta(minutes=duration_minutes)),
            output_field=DateTimeField(),
        )
        qs = base_qs.annotate(existing_end=existing_end_expr).filter(
            fecha_hora__lt=new_end,
            existing_end__gt=new_start,
        )
        return qs

    def perform_create(self, serializer):
        """
        Revalidación en transacción para evitar race conditions:
        - evita eventos en el pasado
        - evita duplicado exacto (misma propiedad + misma fecha_hora)
        - evita solapamiento (misma propiedad + interval overlap)
        """
        fecha_hora = serializer.validated_data.get("fecha_hora")
        propiedad = serializer.validated_data.get("propiedad")
        if fecha_hora and propiedad:
            now_local = timezone.localtime(timezone.now())
            fecha_local = timezone.localtime(fecha_hora)
            if fecha_local < now_local:
                raise ValidationError("No se puede crear un evento en el pasado.")

            with transaction.atomic():
                # duplicado exacto
                dup = Evento.objects.filter(propiedad=propiedad, fecha_hora=fecha_hora).exists()
                if dup:
                    raise ValidationError("Ya existe un evento exactamente en esa fecha y hora para la misma propiedad.")
                # solapamientos
                overlap_qs = self._events_overlapping(propiedad, fecha_hora)
                if overlap_qs.exists():
                    first = overlap_qs.order_by("fecha_hora").first()
                    raise ValidationError(
                        f"El horario solapa con otro evento en la misma propiedad (desde {timezone.localtime(first.fecha_hora).isoformat()})."
                    )
                # si todo ok, guardamos con owner (OwnedQuerysetMixin.perform_create)
                super().perform_create(serializer)
        else:
            # si faltan campos, fallback al comportamiento normal (dejar que serializer valide)
            super().perform_create(serializer)

    def perform_update(self, serializer):
        """
        Mismo re-check para updates: ignoramos el propio id en la búsqueda.
        Además valida que no se mueva la fecha a pasado.
        """
        fecha_hora = serializer.validated_data.get("fecha_hora", getattr(serializer.instance, "fecha_hora", None))
        propiedad = serializer.validated_data.get("propiedad", getattr(serializer.instance, "propiedad", None))
        ignore_id = getattr(serializer.instance, "id", None)
        if fecha_hora and propiedad:
            now_local = timezone.localtime(timezone.now())
            fecha_local = timezone.localtime(fecha_hora)
            if fecha_local < now_local:
                raise ValidationError("No se puede actualizar un evento a una fecha en el pasado.")

            with transaction.atomic():
                # duplicado exacto
                dup = Evento.objects.filter(propiedad=propiedad, fecha_hora=fecha_hora).exclude(id=ignore_id).exists()
                if dup:
                    raise ValidationError("Ya existe un evento exactamente en esa fecha y hora para la misma propiedad.")
                # solapamientos
                overlap_qs = self._events_overlapping(propiedad, fecha_hora, ignore_id=ignore_id)
                if overlap_qs.exists():
                    first = overlap_qs.order_by("fecha_hora").first()
                    raise ValidationError(
                        f"El horario solapa con otro evento en la misma propiedad (desde {timezone.localtime(first.fecha_hora).isoformat()})."
                    )
                super().perform_update(serializer)
        else:
            super().perform_update(serializer)

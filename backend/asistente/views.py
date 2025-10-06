# asistente/views.py
from __future__ import annotations

import re
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, List, Optional, Tuple

from django.utils import timezone
from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from leads.models import Evento, Contacto  # type: ignore
from propiedades.models import Propiedad  # type: ignore

# =========================
# Helpers de fecha y parsing
# =========================
DATE_DDMMYYYY = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b")
DATE_YYYYMMDD = re.compile(r"\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b")
TIME_HHMM = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\b")

TIPO_ALIASES = {
    "reunion": "Reunion", "reunión": "Reunion", "reuniones": "Reunion",
    "llamada": "Llamada", "llamadas": "Llamada",
    "visita": "Visita", "visitas": "Visita",
}

CREATE_ALIASES = re.compile(
    r"\b(agrega|agregá|agregar|crea|creá|crear|programa|programar|agenda|agendá|agendar)\b",
    re.IGNORECASE,
)

def _local_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return timezone.make_aware(dt)
    return timezone.localtime(dt)

def _day_bounds_local(d: datetime) -> Tuple[datetime, datetime]:
    d_local = _local_aware(d)
    start = _local_aware(datetime.combine(d_local.date(), dt_time.min))
    end = start + timedelta(days=1)
    return start, end

def _parse_date_from_text(text: str) -> Optional[datetime]:
    t = text.lower().strip()
    now = timezone.localtime()
    if "hoy" in t:
        return now
    if "mañana" in t or "manana" in t:
        return now + timedelta(days=1)
    if "pasado mañana" in t or "pasado manana" in t:
        return now + timedelta(days=2)

    m = DATE_DDMMYYYY.search(t)
    if m:
        dd, mm, yyyy = map(int, m.groups())
        try:
            return _local_aware(datetime(year=yyyy, month=mm, day=dd))
        except ValueError:
            return None

    m = DATE_YYYYMMDD.search(t)
    if m:
        yyyy, mm, dd = map(int, m.groups())
        try:
            return _local_aware(datetime(year=yyyy, month=mm, day=dd))
        except ValueError:
            return None
    return None

def _parse_time_from_text(text: str) -> Optional[Tuple[int, int]]:
    # pistas típicas: "a las 15:30", "15hs", "a las 9"
    hint = re.search(r"(a\s+las|las|hs|hora|horas)\s+(\d{1,2}(:\d{2})?)", text, re.IGNORECASE)
    if hint:
        txt = hint.group(2)
        m = TIME_HHMM.fullmatch(txt) or TIME_HHMM.search(txt)
    else:
        m = TIME_HHMM.search(text)
    if not m:
        return None
    hh = int(m.group(1))
    mm = int(m.group(2) or "0")
    if 0 <= hh <= 23 and 0 <= mm <= 59:
        return hh, mm
    return None

def _extract_tipo(text: str) -> Optional[str]:
    t = text.lower()
    for key, val in TIPO_ALIASES.items():
        if re.search(rf"\b{re.escape(key)}\b", t):
            return val
    return None

def _extract_prop_id(text: str) -> Optional[int]:
    """
    Soporta: '@123', '#123', '@propiedad 123', '@Propiedad 123',
             'propiedad 123', 'propiedad: 123', 'propiedad #123'
    """
    # @123  |  #123
    m = re.search(r"(?:@|#)\s*(\d+)\b", text, re.IGNORECASE)
    if m:
        return int(m.group(1))

    # @propiedad 123
    m = re.search(r"@\s*propiedad\s*(\d+)\b", text, re.IGNORECASE)
    if m:
        return int(m.group(1))

    # propiedad 123 | propiedad: 123 | propiedad #123
    m = re.search(r"\bpropiedad(?:\s*#|:\s*|\s+)(\d+)\b", text, re.IGNORECASE)
    if m:
        return int(m.group(1))

    return None

def _extract_lead_id(text: str) -> Optional[int]:
    """
    Soporta: '@lead 45', '@Lead 45', '@contacto 45', 'contacto #45', '@45' cuando
    viene acompañado de palabras 'lead' o 'contacto' cerca.
    """
    # @lead 123  |  @contacto 123
    m = re.search(r"@\s*(lead|contacto)\s*(\d+)\b", text, re.IGNORECASE)
    if m:
        return int(m.group(2))

    # 'contacto #123' | 'lead: 123' | 'lead 123'
    m = re.search(r"\b(lead|contacto)(?:\s*#|:\s*|\s+)(\d+)\b", text, re.IGNORECASE)
    if m:
        return int(m.group(2))

    # Caso laxo: '@123' pero con palabra 'lead/contacto' en frase
    if re.search(r"\b(lead|contacto)s?\b", text, re.IGNORECASE):
        m = re.search(r"(?:@|#)\s*(\d+)\b", text, re.IGNORECASE)
        if m:
            return int(m.group(1))

    return None

def _fmt_time_local(dt: datetime) -> str:
    dloc = timezone.localtime(dt)
    return dloc.strftime("%Y-%m-%d %H:%M")

# =========================
# Vista principal del asistente
# =========================
class AskAssistantAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = (request.data.get("query") or "").strip()
        if not query:
            return Response({"detail": "Falta 'query' en el body."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if CREATE_ALIASES.search(query):
            return self._handle_create_intent(user, query)
        return self._handle_query_intent(user, query)

    # -------- Consultas --------
    def _handle_query_intent(self, user, query: str):
        target_day = _parse_date_from_text(query)
        tipo = _extract_tipo(query)
        prop_id = _extract_prop_id(query)
        lead_id = _extract_lead_id(query)

        ask_week = bool(re.search(r"\b(esta\s+semana|semana)\b", query.lower()))
        start: Optional[datetime] = None
        end: Optional[datetime] = None

        if ask_week and not target_day:
            today = timezone.localtime()
            start, end = _day_bounds_local(today)
            end = start + timedelta(days=7)
        elif target_day:
            start, end = _day_bounds_local(target_day)

        qs = Evento.objects.all().select_related("contacto", "propiedad")
        if not (user.is_staff or user.is_superuser):
            qs = qs.filter(owner=user)

        if start and end:
            qs = qs.filter(fecha_hora__gte=start, fecha_hora__lt=end)
        if tipo:
            qs = qs.filter(tipo=tipo)
        if prop_id:
            qs = qs.filter(propiedad_id=prop_id)
        if lead_id:
            qs = qs.filter(contacto_id=lead_id)

        if not (start and end):
            today = timezone.localtime()
            start, end = _day_bounds_local(today)
            end = start + timedelta(days=7)
            qs = qs.filter(fecha_hora__gte=start, fecha_hora__lt=end)

        qs = qs.order_by("fecha_hora")

        items: List[Dict] = []
        for ev in qs[:200]:
            items.append({
                "id": ev.id,
                "tipo": ev.tipo,
                "fecha_hora": _fmt_time_local(ev.fecha_hora),
                "propiedad": getattr(ev.propiedad, "id", None),
                "propiedad_titulo": getattr(ev.propiedad, "titulo", None),
                "contacto": getattr(ev.contacto, "id", None),
                "contacto_nombre": (
                    f"{getattr(ev.contacto, 'nombre', '')} {getattr(ev.contacto, 'apellido', '')}".strip()
                    if ev.contacto_id else None
                ),
                "notas": ev.notas or "",
            })

        count = len(items)
        tipo_label = {"Reunion": "reunión", "Llamada": "llamada", "Visita": "visita"}.get(tipo or "", "evento")
        if tipo and count != 1:
            if tipo_label.endswith("a"):
                tipo_label += "s"
            elif tipo_label.endswith("ón"):
                tipo_label = tipo_label[:-2] + "ones"

        if ask_week and not target_day:
            when_txt = "esta semana"
        elif target_day:
            when_txt = timezone.localtime(target_day).strftime("el %d/%m/%Y")
        else:
            when_txt = "los próximos 7 días"

        extra = []
        if prop_id:
            extra.append(f"en propiedad #{prop_id}")
        if lead_id:
            extra.append(f"con lead #{lead_id}")
        extra_txt = (" " + " y ".join(extra)) if extra else ""

        if count == 0:
            answer = f"No encontré {('' if tipo is None else (tipo_label + ' '))}para {when_txt}{extra_txt}."
        else:
            times = ", ".join([i["fecha_hora"][-5:] for i in items[:5]])
            prefix = "Tenés" if not tipo else f"Tenés {count} {tipo_label}"
            answer = f"{prefix} para {when_txt}{extra_txt}" + (f": {times}." if times else ".")

        payload = {
            "answer": answer,
            "data": {
                "count": count,
                "from": start.isoformat() if start else None,
                "to": end.isoformat() if end else None,
                "type": tipo,
                "items": items,
            },
        }
        return Response(payload, status=status.HTTP_200_OK)

    # -------- Creación de eventos --------
    def _handle_create_intent(self, user, query: str):
        # Fecha y hora
        target_day = _parse_date_from_text(query) or timezone.localtime()
        hhmm = _parse_time_from_text(query)
        if not hhmm:
            return Response(
                {"detail": "No pude detectar la hora del evento. Indicá, por ejemplo: 'a las 15:30'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        hh, mm = hhmm
        event_dt = _local_aware(datetime.combine(target_day.date(), dt_time(hour=hh, minute=mm)))

        # Tipo (por defecto: Reunión)
        tipo = _extract_tipo(query) or "Reunion"

        # Objetos mencionados
        prop_id = _extract_prop_id(query)
        lead_id = _extract_lead_id(query)

        if prop_id is None and lead_id is None:
            return Response(
                {"detail": "Indicá al menos una referencia: @propiedad o @lead (ej: '@Propiedad 12' o '@lead 45')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Propiedad (opcional)
        propiedad = None
        if prop_id is not None:
            try:
                # No filtramos por owner porque una propiedad puede ser visible para toda la oficina
                propiedad = Propiedad.objects.get(pk=prop_id)
            except Propiedad.DoesNotExist:
                return Response({"detail": f"No encontré la propiedad #{prop_id}."},
                                status=status.HTTP_404_NOT_FOUND)

        # Lead/Contacto (opcional, se limita por owner)
        contacto = None
        if lead_id is not None:
            contacto = Contacto.objects.filter(pk=lead_id, owner=user).first()
            if contacto is None:
                return Response(
                    {"detail": f"No encontré el lead/contacto #{lead_id} tuyo."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Notas libres (patrón: "notas: ...")
        notas_match = re.search(r"(?:nota|notas)\s*:\s*(.+)$", query, flags=re.IGNORECASE)
        notas = notas_match.group(1).strip() if notas_match else ""

        ev = Evento.objects.create(
            owner=user,
            tipo=tipo,
            fecha_hora=event_dt,
            propiedad=propiedad,
            contacto=contacto,
            nombre="" if contacto else "",
            apellido="" if contacto else "",
            email=None,
            notas=notas,
        )

        item = {
            "id": ev.id,
            "tipo": ev.tipo,
            "fecha_hora": _fmt_time_local(ev.fecha_hora),
            "propiedad": getattr(ev.propiedad, "id", None),
            "propiedad_titulo": getattr(ev.propiedad, "titulo", None),
            "contacto": getattr(ev.contacto, "id", None),
            "contacto_nombre": (
                f"{getattr(ev.contacto, 'nombre', '')} {getattr(ev.contacto, 'apellido', '')}".strip()
                if ev.contacto_id else None
            ),
            "notas": ev.notas or "",
        }

        fecha_txt = timezone.localtime(event_dt).strftime("%d/%m/%Y %H:%M")
        tipo_label = {"Reunion": "reunión", "Llamada": "llamada", "Visita": "visita"}.get(ev.tipo, "evento")

        parts = []
        if propiedad:
            parts.append(f"Propiedad #{propiedad.id}" + (f" · {getattr(propiedad, 'titulo', '')}" if getattr(propiedad, "titulo", "") else ""))
        if contacto:
            parts.append(f"Lead #{contacto.id}" + (f" · {contacto.nombre} {contacto.apellido}".strip() if (contacto.nombre or contacto.apellido) else ""))

        en_txt = " en " + " y ".join(parts) if parts else ""
        answer = f"Listo, agendé una {tipo_label} para el {fecha_txt}{en_txt}."

        payload = {"answer": answer, "data": {"count": 1, "from": None, "to": None, "type": ev.tipo, "items": [item]}}
        return Response(payload, status=status.HTTP_201_CREATED)

# Alias para mantener import existente
AskAssistantView = AskAssistantAPIView

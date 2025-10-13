from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

from propiedades.models import Propiedad


# =====================
#  MODELO: EstadoLead
# =====================
class EstadoLead(models.Model):
    fase = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, default="")

    def __str__(self):
        return self.fase


# =====================
#  MODELO: Contacto
# =====================
class Contacto(models.Model):
    # Multi-tenant
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contactos",
        null=True,
        blank=True,
    )

    nombre = models.CharField(max_length=120, blank=True, default="")
    apellido = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    telefono = models.CharField(max_length=50, blank=True, default="")
    estado = models.ForeignKey(
        EstadoLead, null=True, blank=True, on_delete=models.SET_NULL, related_name="contactos"
    )

    # Seguimiento
    last_contact_at = models.DateTimeField(null=True, blank=True)
    next_contact_at = models.DateTimeField(null=True, blank=True)
    next_contact_note = models.CharField(max_length=255, blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        base = f"{self.nombre} {self.apellido}".strip()
        return base or self.email or f"Contacto #{self.pk}"

    @property
    def proximo_contacto_estado(self) -> str:
        now = timezone.localtime()
        if not self.next_contact_at:
            return "Pendiente / Por definir"

        hoy = now.date()
        fecha = timezone.localtime(self.next_contact_at).date()

        if fecha < hoy:
            return "Vencido"
        if fecha == hoy:
            return "Vence hoy"
        delta = (fecha - hoy).days
        return f"Próximo en {delta} día{'s' if delta != 1 else ''}"

    @property
    def dias_sin_seguimiento(self) -> int | None:
        if not self.last_contact_at:
            return None
        now = timezone.localtime()
        return (now.date() - timezone.localtime(self.last_contact_at).date()).days


# =====================
#  MODELO: Evento
# =====================
class Evento(models.Model):
    # Choices definidos dentro de la clase
    TIPO_EVENTO_CHOICES = [
        ("llamada", "Llamada"),
        ("reunion", "Reunión"),
        ("visita", "Visita"),
        ("seguimiento", "Seguimiento"),
        ("otros", "Otros"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="eventos",
        null=True,
        blank=True,
    )

    contacto = models.ForeignKey(
        Contacto, null=True, blank=True, on_delete=models.SET_NULL, related_name="eventos"
    )
    propiedad = models.ForeignKey(
        Propiedad, on_delete=models.CASCADE, related_name="eventos", null=True, blank=True
    )
    tipo = models.CharField(max_length=20, choices=TIPO_EVENTO_CHOICES)
    fecha_hora = models.DateTimeField()
    notas = models.TextField(blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_hora", "-id"]

    def __str__(self):
        return f"{self.tipo} {self.fecha_hora:%Y-%m-%d %H:%M}"


# ==============================
#  MODELO: EstadoLeadHistorial
# ==============================
class EstadoLeadHistorial(models.Model):
    contacto = models.ForeignKey(
        Contacto, on_delete=models.CASCADE, related_name="historial_estados"
    )
    estado = models.ForeignKey(
        EstadoLead, null=True, blank=True, on_delete=models.SET_NULL
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.contacto} -> {self.estado or '—'} @ {self.changed_at:%Y-%m-%d %H:%M}"


# =========================
#  SEÑALES DE SINCRONIZACIÓN
# =========================
@receiver(post_save, sender=Evento)
def sync_contacto_fechas_from_evento(sender, instance: Evento, created: bool, **kwargs):
    """
    Sincroniza los campos de contacto (last_contact_at / next_contact_at)
    cuando se crea o actualiza un evento.
    """
    contacto = instance.contacto
    if not contacto:
        return

    now = timezone.localtime()
    evento_dt = timezone.localtime(instance.fecha_hora)

    # Evento pasado o de hoy -> último contacto
    if evento_dt <= now:
        if not contacto.last_contact_at or evento_dt > contacto.last_contact_at:
            contacto.last_contact_at = evento_dt
            if contacto.next_contact_at and evento_dt >= contacto.next_contact_at:
                contacto.next_contact_at = None
            contacto.save(update_fields=["last_contact_at", "next_contact_at"])
        return

    # Evento futuro -> próximo contacto
    should_update_next = (
        not contacto.next_contact_at or evento_dt < timezone.localtime(contacto.next_contact_at)
    )
    if should_update_next:
        contacto.next_contact_at = evento_dt
        if not contacto.next_contact_note:
            base = f"{instance.tipo}"
            if instance.notas:
                snippet = instance.notas.strip().replace("\n", " ")
                if len(snippet) > 80:
                    snippet = snippet[:77] + "..."
                base = f"{base} · {snippet}"
            contacto.next_contact_note = base
        contacto.save(update_fields=["next_contact_at", "next_contact_note"])

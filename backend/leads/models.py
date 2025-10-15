from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.validators import RegexValidator
from propiedades.models import Propiedad
from avisos.models import Aviso

solo_digitos = RegexValidator(
    regex=r'^\d{1,15}$',           
    message='Ingrese solo dígitos.'
)

class EstadoLead(models.Model):
    fase = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, default="")

    def __str__(self):
        return self.fase


class Contacto(models.Model):
    # === Multi-tenant ===
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
    telefono = models.CharField(
        max_length=15,             
        blank=True,
        default="",
        validators=[solo_digitos],
        db_index=True,             # útil para búsquedas
        help_text="Solo dígitos, sin + ni guiones"
    )
    estado = models.ForeignKey(
        EstadoLead, null=True, blank=True, on_delete=models.SET_NULL, related_name="contactos"
    )

    # Último contacto efectivo con el lead (ej.: llamada/visita/reunión ya ocurrida)
    last_contact_at = models.DateTimeField(null=True, blank=True)
    # Próximo contacto planificado (si no hay, queda null => “Pendiente / Por definir”)
    next_contact_at = models.DateTimeField(null=True, blank=True)
    # Nota opcional asociada al próximo contacto (motivo/recordatorio corto)
    next_contact_note = models.CharField(max_length=255, blank=True, default="")

    # timestamp de creación real del lead
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido}".strip()

    # --- Helpers de estado derivado (opcionales, útiles para serializers/plantillas) ---
    @property
    def proximo_contacto_estado(self) -> str:
        """
        Devuelve un texto derivado para el próximo contacto según la fecha actual:
          - 'Pendiente / Por definir' si no hay next_contact_at
          - 'Vencido' si next_contact_at < hoy
          - 'Vence hoy' si es hoy
          - 'Próximo en N días' si es futuro
        """
        now = timezone.localtime()
        if not self.next_contact_at:
            return "Pendiente / Por definir"

        # Normalizamos a fechas (sin hora) solo para el label
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
        """
        Retorna días transcurridos desde el último contacto (int) o None si nunca hubo.
        """
        if not self.last_contact_at:
            return None
        now = timezone.localtime()
        return (now.date() - timezone.localtime(self.last_contact_at).date()).days
    
    class Meta:
        indexes = [
            models.Index(fields=["next_contact_at"]),
            models.Index(fields=["last_contact_at"]),
            models.Index(fields=["creado_en"]),
        ]


TIPO_EVENTO_CHOICES = [
    ("Reunion", "Reunion"),
    ("Visita", "Visita"),
    ("Llamada", "Llamada"),
]


class Evento(models.Model):
    # === Multi-tenant ===
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="eventos",
        null=True,
        blank=True,
    )

    nombre = models.CharField(max_length=120, blank=True, default="")
    apellido = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    contacto = models.ForeignKey(
        Contacto, null=True, blank=True, on_delete=models.SET_NULL, related_name="eventos"
    )
    propiedad = models.ForeignKey(Propiedad, on_delete=models.CASCADE, related_name="eventos")
    tipo = models.CharField(max_length=20, choices=TIPO_EVENTO_CHOICES)
    fecha_hora = models.DateTimeField()
    notas = models.TextField(blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_hora", "-id"]

    def __str__(self):
        return f"{self.tipo} {self.fecha_hora:%Y-%m-%d %H:%M}"


# historial de cambios de estado
class EstadoLeadHistorial(models.Model):
    contacto = models.ForeignKey(Contacto, on_delete=models.CASCADE, related_name="historial_estados")
    estado = models.ForeignKey(EstadoLead, null=True, blank=True, on_delete=models.SET_NULL)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.contacto} -> {self.estado or '—'} @ {self.changed_at:%Y-%m-%d %H:%M}"


# =========================
# Señales de sincronización
# =========================
@receiver(post_save, sender=Evento)
def sync_contacto_and_aviso_from_evento(sender, instance: Evento, created: bool, **kwargs):
    """
    Gestiona la sincronización del Contacto y el Aviso a partir de un Evento.
    - Si el Evento es pasado o de hoy: actualiza el last_contact_at del Contacto y elimina el Aviso.
    - Si el Evento es futuro: crea o actualiza el next_contact_at del Contacto y el Aviso asociado.
    """
    contacto = instance.contacto
    if not contacto:
        return

    now = timezone.localtime()
    evento_dt = timezone.localtime(instance.fecha_hora)

    # Evento ocurrido (pasado o hoy)
    if evento_dt <= now:
        # Actualiza el último contacto si este evento es más reciente
        if not contacto.last_contact_at or evento_dt > contacto.last_contact_at:
            contacto.last_contact_at = evento_dt
            contacto.save(update_fields=["last_contact_at"])
            
        # Marca como completado o elimina el aviso relacionado
        try:
            aviso = Aviso.objects.get(evento=instance)
            if aviso.estado == 'pendiente':
                aviso.estado = 'completado'
                aviso.save(update_fields=['estado'])
        except Aviso.DoesNotExist:
            pass # No hay aviso, no hacemos nada

        return

    # Evento futuro
    should_update_next = (
        not contacto.next_contact_at or evento_dt < timezone.localtime(contacto.next_contact_at)
    )
    if should_update_next:
        contacto.next_contact_at = evento_dt
        if not contacto.next_contact_note:
            base = f"{instance.tipo}"
            if instance.notas:
                snippet = (instance.notas or "").strip().replace("\n", " ")
                if len(snippet) > 80:
                    snippet = snippet[:77] + "..."
                base = f"{base} · {snippet}"
            contacto.next_contact_note = base
        contacto.save(update_fields=["next_contact_at", "next_contact_note"])

    # Crear o actualizar un aviso para este evento futuro
    aviso_titulo = f"Próximo contacto con {contacto.nombre} {contacto.apellido}"
    aviso_descripcion = f"{instance.tipo} sobre la propiedad {instance.propiedad.titulo}" if instance.propiedad else f"{instance.tipo} con el lead"

    Aviso.objects.update_or_create(
        evento=instance,
        defaults={
            'titulo': aviso_titulo,
            'descripcion': aviso_descripcion,
            'fecha': instance.fecha_hora,
            'lead': contacto,
            'propiedad': instance.propiedad,
            'estado': 'pendiente',
        }
    )

@receiver(post_delete, sender=Evento)
def delete_aviso_on_evento_delete(sender, instance, **kwargs):
    """
    Elimina el aviso asociado cuando se elimina el evento.
    """
    try:
        Aviso.objects.get(evento=instance).delete()
    except Aviso.DoesNotExist:
        pass
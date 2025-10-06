from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

from propiedades.models import Propiedad


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
    telefono = models.CharField(max_length=50, blank=True, default="")
    estado = models.ForeignKey(
        EstadoLead, null=True, blank=True, on_delete=models.SET_NULL, related_name="contactos"
    )

    # ✅ NUEVO: seguimiento de contacto
    # Último contacto efectivo con el lead (ej.: llamada/visita/reunión ya ocurrida)
    last_contact_at = models.DateTimeField(null=True, blank=True)
    # Próximo contacto planificado (si no hay, queda null => “Pendiente / Por definir”)
    next_contact_at = models.DateTimeField(null=True, blank=True)
    # Nota opcional asociada al próximo contacto (motivo/recordatorio corto)
    next_contact_note = models.CharField(max_length=255, blank=True, default="")

    # ✅ timestamp de creación real del lead
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


class Evento(models.Model):
<<<<<<< HEAD
    # 👇 Choices definidos dentro de la clase
    TIPO_EVENTO_CHOICES = [
        ("Reunion", "Reunión"),
        ("Visita", "Visita"),
        ("Llamada", "Llamada"),
    ]
=======
    # === Multi-tenant ===
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="eventos",
        null=True,
        blank=True,
    )
>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281

    nombre = models.CharField(max_length=120, blank=True, default="")
    apellido = models.CharField(max_length=120, blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    contacto = models.ForeignKey(
        Contacto, null=True, blank=True, on_delete=models.SET_NULL, related_name="eventos"
    )
    propiedad = models.ForeignKey(Propiedad, on_delete=models.CASCADE, related_name="eventos")
    tipo = models.CharField(max_length=20, choices=TIPO_EVENTO_CHOICES)  # ✅ usa el atributo de clase
    fecha_hora = models.DateTimeField()
    notas = models.TextField(blank=True, default="")
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_hora", "-id"]

    def __str__(self):
        return f"{self.tipo} {self.fecha_hora:%Y-%m-%d %H:%M}"


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
def sync_contacto_fechas_from_evento(sender, instance: Evento, created: bool, **kwargs):
    """
    Reglas:
      - Si el Evento es pasado o de hoy (fecha_hora <= ahora): actualiza last_contact_at
        al más reciente entre el valor actual y fecha_hora del evento.
      - Si el Evento es futuro (fecha_hora > ahora):
          * Si el contacto no tiene next_contact_at o este evento está más próximo
            que el programado, se actualiza next_contact_at.
          * Si next_contact_note está vacío, se sugiere con el tipo y (opcional) un recorte de notas.
    Nota: corre en cada save; no depende de 'created' para contemplar ediciones.
    """
    contacto = instance.contacto
    if not contacto:
        return

    now = timezone.localtime()
    evento_dt = timezone.localtime(instance.fecha_hora)

    # Evento ocurrido (pasado o hoy) => último contacto
    if evento_dt <= now:
        # Tomar el máximo para no "retroceder" el último contacto si se edita un evento viejo
        if not contacto.last_contact_at or evento_dt > contacto.last_contact_at:
            contacto.last_contact_at = evento_dt
            # Si este último contacto coincide con el próximo programado, limpiamos el próximo
            if contacto.next_contact_at and evento_dt >= contacto.next_contact_at:
                contacto.next_contact_at = None
                # no tocamos la nota; podría servir como historial breve
            contacto.save(update_fields=["last_contact_at", "next_contact_at"])
        return

    # Evento futuro => posible próximo contacto
    should_update_next = (
        not contacto.next_contact_at or evento_dt < timezone.localtime(contacto.next_contact_at)
    )
    if should_update_next:
        contacto.next_contact_at = evento_dt
        # Solo sugerimos nota si está vacía (no pisamos algo que haya escrito el usuario)
        if not contacto.next_contact_note:
            base = f"{instance.tipo}"
            if instance.notas:
                # Recortamos una nota breve para no pasarnos del max_length
                snippet = (instance.notas or "").strip().replace("\n", " ")
                if len(snippet) > 80:
                    snippet = snippet[:77] + "..."
                base = f"{base} · {snippet}"
            contacto.next_contact_note = base
        contacto.save(update_fields=["next_contact_at", "next_contact_note"])

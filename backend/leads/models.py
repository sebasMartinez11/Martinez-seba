from django.db import models
from django.conf import settings
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

    # ✅ NUEVO: timestamp de creación real del lead
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido}".strip()


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


# ✅ historial de cambios de estado
class EstadoLeadHistorial(models.Model):
    contacto = models.ForeignKey(Contacto, on_delete=models.CASCADE, related_name="historial_estados")
    estado = models.ForeignKey(EstadoLead, null=True, blank=True, on_delete=models.SET_NULL)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.contacto} -> {self.estado or '—'} @ {self.changed_at:%Y-%m-%d %H:%M}"


from django.db import models

class EstadoLead(models.Model):
    fase = models.CharField(max_length=80, unique=True)
    descripcion = models.TextField(blank=True)
    def __str__(self): return self.fase

class Contacto(models.Model):
    nombre = models.CharField(max_length=120)
    apellido = models.CharField(max_length=120, blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    estado = models.ForeignKey(
        EstadoLead, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="contactos"
    )
    proximo_contacto = models.DateTimeField(null=True, blank=True)
    ultimo_contacto  = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        base = f"{self.nombre} {self.apellido}".strip()
        return base or self.email or f"Contacto #{self.pk}"

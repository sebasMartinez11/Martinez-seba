from django.db import models
from propiedades.models import Propiedad

class EstadoLead(models.Model):
    fase = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    def __str__(self): return self.fase

class Contacto(models.Model):
    nombre = models.CharField(max_length=100, blank=True)
    apellido = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    telefono = models.CharField(max_length=50, blank=True)
    estado = models.ForeignKey(EstadoLead, on_delete=models.SET_NULL, null=True, blank=True, related_name="contactos")
    def __str__(self):
        base = (self.nombre or "").strip()
        if self.apellido: base = f"{base} {self.apellido}".strip()
        return base or f"Contacto #{self.pk}"

class Evento(models.Model):
    TIPO_CHOICES = [("Reunion","Reunión"),("Visita","Visita"),("Llamada","Llamada")]
    nombre = models.CharField(max_length=100, blank=True)
    apellido = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    contacto = models.ForeignKey(Contacto, on_delete=models.SET_NULL, null=True, blank=True, related_name="eventos")
    propiedad = models.ForeignKey(Propiedad, on_delete=models.CASCADE, related_name="eventos")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    fecha_hora = models.DateTimeField()
    notas = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    class Meta: ordering = ["-fecha_hora"]
    def __str__(self): return f"{self.tipo} - {self.propiedad_id} - {self.fecha_hora:%Y-%m-%d %H:%M}"

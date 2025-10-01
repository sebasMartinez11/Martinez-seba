from django.db import models
from django.utils import timezone

class Aviso(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("completado", "Completado"),
        ("atrasado", "Atrasado"),
    ]

    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default="pendiente")
    lead = models.ForeignKey("leads.Contacto", on_delete=models.CASCADE, null=True, blank=True)
    propiedad = models.ForeignKey("propiedades.Propiedad", on_delete=models.CASCADE, null=True, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.fecha < timezone.now() and self.estado == "pendiente":
            self.estado = "atrasado"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.titulo} ({self.estado})"

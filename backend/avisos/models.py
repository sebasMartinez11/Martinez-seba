from django.db import models

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
    
    # Nuevo campo para relacionar el aviso con el evento
    evento = models.ForeignKey("leads.Evento", on_delete=models.CASCADE, null=True, blank=True, related_name="aviso")
    
    lead = models.ForeignKey("leads.Contacto", on_delete=models.CASCADE, null=True, blank=True)
    propiedad = models.ForeignKey("propiedades.Propiedad", on_delete=models.CASCADE, null=True, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.titulo} ({self.estado})"
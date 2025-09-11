from django.db import models
import secrets

class Usuario(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    # Guardamos la contraseña hasheada acá (nunca en texto plano)
    password_hash = models.CharField(max_length=128)
    # Token propio por usuario (lo generamos automáticamente)
    token = models.CharField(max_length=40, unique=True, editable=False)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    telefono = models.CharField(max_length=15, blank=True)
    dni = models.CharField(max_length=20, blank=True)


    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_hex(20)  # 40 chars
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} ({self.email})"


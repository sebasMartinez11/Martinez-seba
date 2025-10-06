from django.db import models
import secrets
from django.core.validators import RegexValidator

# Validador: solo digitos (0-9)
digits_only = RegexValidator(
    regex=r'^\d+$',
    message='Solo se permiten números.'
)

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
    telefono = models.CharField(
        max_length=15,               # longitud máx. 15
        blank=True, null=True,
        validators=[digits_only],    # Evita letras y símbolos
        help_text="Solo números, sin espacios ni símbolos."
    )
    
    dni = models.CharField(
        max_length=8,                # DNI de unos 8 dígitos
        blank=True, null=True,
        validators=[                 # Patrón exacto para DNI
            RegexValidator(r'^\d{7,8}$', 'DNI inválido (7 u 8 dígitos).')
        ],
        unique=True                 # Aca pongo True para poner un DNI único por usuario
    )


    # Preferencia de recordatorios (en días: 3, 5, 7…)
    reminder_every_days = models.PositiveSmallIntegerField(
        default=3,
        help_text="Cada cuántos días recordar al usuario hacer seguimiento (ej. 3, 5, 7)."
    )

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_hex(20)  # 40 chars
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} ({self.email})"

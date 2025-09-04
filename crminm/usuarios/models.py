from django.db import models
import secrets

class Usuario(models.Model):
    class Rol(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        ASESOR = "ASESOR", "Asesor"
        CLIENTE = "CLIENTE", "Cliente"
        GERENTE = "GERENTE", "Gerente"
        OTRO = "OTRO", "Otro"

    # ID lo crea Django automáticamente como Primary Key
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    documento = models.CharField(
        max_length=20,
        unique=True,
        help_text="DNI/CUIT u otro documento",
    )
    telefono = models.CharField(max_length=30, blank=True)
    rol = models.CharField(
        max_length=15,
        choices=Rol.choices,
        default=Rol.CLIENTE,
        db_index=True,
    )

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs): 
        if not self.token: 
            self.token = secrets.token_hex(20)  # 40 chars 
        super().save(*args, **kwargs) 
        
    def _str_(self): 
        return f"{self.nombre} ({self.email})"
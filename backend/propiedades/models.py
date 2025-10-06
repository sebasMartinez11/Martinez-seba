from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings  # <-- NUEVO

class Propiedad(models.Model):
    TIPO_DE_PROPIEDAD_CHOICES = [
        ("casa", "Casa"),
        ("departamento", "Departamento"),
        ("hotel", "Hotel"),
    ]

    ESTADO_CHOICES = [
        ("disponible", "Disponible"),
        ("vendido", "Vendido"),
        ("reservado", "Reservado"),
    ]

    MONEDA_CHOICES = [
        ("USD", "USD"),
        ("ARS", "ARS"),
    ]

<<<<<<< HEAD
    DISPONIBILIDAD_CHOICES = [
        ("alquiler", "Alquiler"),
        ("venta", "Venta"),
        ("temporal", "Temporal"),
    ]
=======
    # === Multi-tenant ===
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="propiedades",
        null=True,
        blank=True,
    )
>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281

    id = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=20, unique=True)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    ubicacion = models.CharField(max_length=255)
<<<<<<< HEAD

    tipo_de_propiedad = models.CharField(
        max_length=50,
        choices=TIPO_DE_PROPIEDAD_CHOICES,
        default="casa"
    )

    disponibilidad = models.CharField(
        max_length=50,
        choices=DISPONIBILIDAD_CHOICES,
        default="venta"
    )

    precio = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
=======
    tipo_de_propiedad = models.CharField(
        max_length=50,
        choices=TIPO_DE_PROPIEDAD_CHOICES,
        default="casa",
    )
    disponibilidad = models.CharField(max_length=50)
    precio = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281
    )
    moneda = models.CharField(
        max_length=10,
        default="USD",
<<<<<<< HEAD
        choices=MONEDA_CHOICES
=======
        choices=MONEDA_CHOICES,
>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281
    )
    ambiente = models.PositiveIntegerField(default=1)
    antiguedad = models.PositiveIntegerField(default=0)
    banos = models.PositiveIntegerField(default=1)
    superficie = models.DecimalField(
        max_digits=10,
        decimal_places=2,
<<<<<<< HEAD
        help_text="Superficie en m²"
=======
        help_text="Superficie en m²",
>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281
    )
    fecha_alta = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
<<<<<<< HEAD
        default="disponible"
    )
=======
        default="disponible",
    )

    # ✅ NUEVO: marca de tiempo efectiva de venta (para métricas exactas)
    vendida_en = models.DateTimeField(null=True, blank=True)
>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281

    class Meta:
        ordering = ["-fecha_alta"]
        indexes = [
            models.Index(fields=["tipo_de_propiedad"]),
            models.Index(fields=["estado"]),
            models.Index(fields=["disponibilidad"]),
            models.Index(fields=["moneda", "precio"]),
            models.Index(fields=["vendida_en"]),  # <-- ayuda para reportes por mes
        ]

    def __str__(self):
        return (
            f"{self.codigo} - {self.titulo} - {self.ubicacion} - "
            f"{self.tipo_de_propiedad} - {self.estado} - {self.precio} {self.moneda}"
        )


class PropiedadImagen(models.Model):
    propiedad = models.ForeignKey(
        Propiedad,
        on_delete=models.CASCADE,
<<<<<<< HEAD
        related_name="imagenes"
=======
        related_name="imagenes",
>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281
    )
    imagen = models.ImageField(upload_to="propiedades/")
    descripcion = models.CharField(max_length=200, blank=True, null=True)

    def __str__(self):
        return f"Imagen de {self.propiedad.codigo} ({self.descripcion or 'sin descripción'})"

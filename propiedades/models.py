from django.db import models
from django.core.validators import MinValueValidator


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
       
    id = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=20, unique=True)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    ubicacion = models.CharField(max_length=255)
    tipo_de_propiedad = models.CharField(max_length=50, choices=TIPO_DE_PROPIEDAD_CHOICES, default="casa")   
    disponibilidad = models.CharField(max_length=50)
    precio = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    moneda = models.CharField(max_length=10, default="USD", choices=MONEDA_CHOICES)
    ambiente = models.PositiveIntegerField(default=1)
    antiguedad = models.PositiveIntegerField(default=0)
<<<<<<< HEAD
    banos = models.PositiveIntegerField(default=1, db_column="baños")
=======
    banos = models.PositiveIntegerField(default=1)
>>>>>>> e4f788484afb0ab66fc4386dbcb4af8fd9462eb5
    superficie = models.DecimalField(max_digits=10, decimal_places=2, help_text="Superficie en m²")
    fecha_alta = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="disponible")

    class Meta:
        ordering = ["-fecha_alta"]
        indexes = [
            models.Index(fields=["tipo_de_propiedad"]),
            models.Index(fields=["estado"]),
            models.Index(fields=["disponibilidad"]),
            models.Index(fields=["moneda", "precio"]),
        ]
    
<<<<<<< HEAD
    def _str_(self):
        return f"{self.codigo} - {self.titulo} - {self.ubicacion} - {self.tipo_de_propiedad} - {self.estado} - {self.precio} {self.moneda}"


=======
    
    def __str__(self):
        return f"{self.codigo} - {self.titulo} - {self.ubicacion} - {self.tipo_de_propiedad} - {self.estado} - {self.precio} {self.moneda}"




>>>>>>> e4f788484afb0ab66fc4386dbcb4af8fd9462eb5
class PropiedadImagen(models.Model):
    propiedad = models.ForeignKey(Propiedad, on_delete=models.CASCADE, related_name="imagenes")
    imagen = models.ImageField(upload_to="propiedades/")
    descripcion = models.CharField(max_length=200, blank=True, null=True)

<<<<<<< HEAD
    def _str_(self):
        return f"Imagen de {self.propiedad.codigo} ({self.descripcion or 'sin descripción'})"
=======
    def __str__(self):
        return f"Imagen de {self.propiedad.codigo} ({self.descripcion or 'sin descripción'})"
>>>>>>> e4f788484afb0ab66fc4386dbcb4af8fd9462eb5

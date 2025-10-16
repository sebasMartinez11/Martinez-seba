from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ("propiedades", "0002_alter_propiedad_banos"),  # tu última migración en propiedades
        ("leads", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Evento",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("nombre", models.CharField(max_length=100, blank=True)),
                ("apellido", models.CharField(max_length=100, blank=True)),
                ("email", models.EmailField(max_length=254, blank=True)),
                ("tipo", models.CharField(
                    max_length=20,
                    choices=[("Reunion", "Reunión"), ("Visita", "Visita"), ("Llamada", "Llamada")]
                )),
                ("fecha_hora", models.DateTimeField()),
                ("notas", models.TextField(blank=True)),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("contacto", models.ForeignKey(
                    to="leads.contacto",
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True, blank=True,
                    related_name="eventos"
                )),
                ("propiedad", models.ForeignKey(
                    to="propiedades.propiedad",
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="eventos"
                )),
            ],
            options={"ordering": ["-fecha_hora"]},
        ),
    ]

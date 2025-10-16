from django.db import migrations

def seed(apps, schema_editor):
    Estado = apps.get_model('leads', 'EstadoLead')
    base = ['Nuevo', 'En negociación', 'Rechazado', 'Vendido']
    for f in base:
        Estado.objects.get_or_create(fase=f, defaults={'descripcion': ''})

class Migration(migrations.Migration):
    dependencies = [('leads','0001_initial')]
    operations = [migrations.RunPython(seed)]
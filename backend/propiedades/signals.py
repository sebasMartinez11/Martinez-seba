from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from .models import PropiedadImagen

@receiver(post_delete, sender=PropiedadImagen)
def eliminar_archivo_en_borrado(sender, instance, **kwargs):
    """
    Cuando se borra una PropiedadImagen, elimina el archivo físico del storage.
    Cubre tanto borrados individuales como el cascade cuando se borra la Propiedad.
    """
    if instance.imagen:  # ImageFieldFile
        storage = instance.imagen.storage
        path = instance.imagen.name
        # Evita excepciones si ya no existe
        if path and storage.exists(path):
            storage.delete(path)

@receiver(pre_save, sender=PropiedadImagen)
def eliminar_archivo_anterior_en_update(sender, instance, **kwargs):
    """
    Si se reemplaza la imagen (update), elimina el archivo anterior del disco.
    """
    if not instance.pk:
        return  # creación: no hay archivo previo
    try:
        old = PropiedadImagen.objects.get(pk=instance.pk)
    except PropiedadImagen.DoesNotExist:
        return
    old_file = getattr(old, "imagen", None)
    new_file = getattr(instance, "imagen", None)
    # Si cambió el archivo, borra el viejo
    if old_file and old_file != new_file:
        storage = old_file.storage
        path = old_file.name
        if path and storage.exists(path):
            storage.delete(path)
from django.contrib import admin
from .models import EstadoLead, Contacto, Evento, EstadoLeadHistorial


@admin.register(EstadoLead)
class EstadoLeadAdmin(admin.ModelAdmin):
    list_display = ("id", "fase", "descripcion")
    search_fields = ("fase",)


@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "apellido", "email", "telefono", "estado")
    search_fields = ("nombre", "apellido", "email", "telefono")
    list_filter = ("estado",)


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ("id", "tipo", "fecha_hora", "contacto", "propiedad")
    list_filter = ("tipo",)
    search_fields = ("nombre", "apellido", "email", "notas")


@admin.register(EstadoLeadHistorial)
class EstadoLeadHistorialAdmin(admin.ModelAdmin):
    list_display = ("id", "contacto", "estado", "changed_at")
    list_filter = ("estado",)
    search_fields = ("contacto__nombre", "contacto__apellido")

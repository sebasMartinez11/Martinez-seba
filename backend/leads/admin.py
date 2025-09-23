from django.contrib import admin
from .models import EstadoLead, Contacto, Evento

@admin.register(EstadoLead)
class EstadoLeadAdmin(admin.ModelAdmin):
    list_display = ("id", "fase", "descripcion")
    search_fields = ("fase",)
    ordering = ("fase",)

@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    # SACAMOS proximo_contacto y ultimo_contacto porque no existen en el modelo
    list_display = ("id", "nombre", "apellido", "email", "telefono", "estado")
    search_fields = ("nombre", "apellido", "email", "telefono")
    list_filter = ("estado",)
    ordering = ("id",)

@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ("id", "tipo", "propiedad", "contacto", "fecha_hora", "creado_en")
    list_filter = ("tipo", "propiedad", "contacto")
    search_fields = ("nombre", "apellido", "email")
    ordering = ("-fecha_hora",)

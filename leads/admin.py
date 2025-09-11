from django.contrib import admin
from .models import EstadoLead, Contacto

@admin.register(EstadoLead)
class EstadoLeadAdmin(admin.ModelAdmin):
    list_display = ("id", "fase", "descripcion")
    search_fields = ("fase",)

@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "apellido", "email", "telefono", "estado", "proximo_contacto", "ultimo_contacto")
    search_fields = ("nombre", "apellido", "email", "telefono")
    list_filter = ("estado",)

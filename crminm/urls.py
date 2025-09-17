from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/usuarios/", include("usuarios.urls")),
    path("api/leads/", include("leads.urls")),
    path("api/propiedades/", include("propiedades.urls")),
]

# Configuración para servir archivos multimedia
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)




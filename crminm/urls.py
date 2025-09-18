from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from leads.views import EstadoLeadViewSet, ContactoViewSet
from propiedades.views import  PropiedadViewSet
from django.conf import settings
from django.conf.urls.static import static


router = DefaultRouter()
router.register(r"estados-lead", EstadoLeadViewSet)
router.register(r"contactos", ContactoViewSet)
router.register(r"propiedades", PropiedadViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("dashboard/", include("dashboard.urls")),
    path("api/usuarios/", include("usuarios.urls")),
    path("api/leads/", include("leads.urls")),
    path("api/propiedades/", include("propiedades.urls")),
]

# Configuración para servir archivos multimedia
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)




# backend/crminm/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# ViewSets propios
from leads.views import EstadoLeadViewSet, ContactoViewSet
from propiedades.views import PropiedadViewSet
from usuarios.views import ListaYCreaUsuario, DetalleUsuario

# DRF / JWT / utilidades
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Media en dev
from django.conf import settings
from django.conf.urls.static import static

# ---------- Healthcheck ----------
@api_view(["GET"])
def health(_request):
    return Response({"status": "ok"})

# ---------- Router principal ----------
router = DefaultRouter()
router.register(r"estados-lead", EstadoLeadViewSet)
router.register(r"contactos", ContactoViewSet)
router.register(r"propiedades", PropiedadViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),

    # API base (router)
    path("api/", include(router.urls)),

    # Usuarios (CBVs que ya tenías)
    path("api/usuarios/", ListaYCreaUsuario.as_view(), name="usuarios-lista"),
    path("api/usuarios/<int:pk>/", DetalleUsuario.as_view(), name="usuario-detalle"),

    # Healthcheck y Auth JWT
    path("api/health", health, name="api-health"),
    path("api/auth/token", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh", TokenRefreshView.as_view(), name="token_refresh"),
]

# Servir archivos de MEDIA en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

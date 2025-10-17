from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from django.conf.urls.static import static

# ViewSets existentes
from avisos.views import AvisoViewSet
from leads.views import EstadoLeadViewSet, ContactoViewSet, EventoViewSet
from propiedades.views import PropiedadViewSet

# Usuarios
from usuarios.views import (
    ListaYCreaUsuario, DetalleUsuario,
    RegisterView, MeUsuarioView,
    # ChangePasswordView, DeleteAccountView,  # se importan en el try más abajo
)

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


@api_view(["GET"])
def health(_request):
    return Response({"status": "ok"})


router = DefaultRouter()
router.register(r"estados-lead", EstadoLeadViewSet)
router.register(r"contactos", ContactoViewSet)
router.register(r"eventos", EventoViewSet)
router.register(r"propiedades", PropiedadViewSet)
router.register(r"avisos", AvisoViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),

    # API base (routers)
    path("api/", include(router.urls)),

    # Asistente IA
    path("api/asistente/", include("asistente.urls")),
    

    # Usuarios CRUD + perfil
    path("api/usuarios/", ListaYCreaUsuario.as_view(), name="usuarios-lista"),
    path("api/usuarios/<int:pk>/", DetalleUsuario.as_view(), name="usuario-detalle"),
    path("api/usuarios/me/", MeUsuarioView.as_view(), name="usuarios-me"),

    #  Auth (JWT)
    path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Healthcheck
    path("api/health", health, name="api-health"),
    
    #  INCLUSIÓN DE DASHBOARD (SOLUCIÓN DEL 404)
    path("api/", include("dashboard.urls")),
]

# ===== Extensiones que se activan si existen =====

# 1) Cambio de contraseña y eliminación de cuenta
try:
    from usuarios.views import ChangePasswordView, DeleteAccountView
    urlpatterns += [
        path("api/usuarios/me/change_password/", ChangePasswordView.as_view(), name="usuarios-change-password"),
        path("api/usuarios/me/delete/", DeleteAccountView.as_view(), name="usuarios-delete-account"),
    ]
except Exception:
    # Si aún no existen esas vistas, ignoramos.
    pass

# 2) Exportación y métricas (app: exportacion)
try:
    urlpatterns += [path("api/exportacion/", include("exportacion.urls"))]
except Exception:
    # Si la app 'exportacion' aún no existe, ignoramos.
    pass

# Media en dev
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

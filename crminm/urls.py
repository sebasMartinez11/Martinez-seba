from django.contrib import admin
from usuarios.views import ListaYCreaUsuario, DetalleUsuario
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from leads.views import EstadoLeadViewSet, ContactoViewSet
from propiedades.views import  PropiedadViewSet



router = DefaultRouter()
router.register(r"estados-lead", EstadoLeadViewSet)
router.register(r"contactos", ContactoViewSet)
router.register(r"propiedades", PropiedadViewSet)

urlpatterns = [
    path("api/", include(router.urls)),
    path('admin/', admin.site.urls),
    # Para listar y crear usuarios
    path('api/usuarios/', ListaYCreaUsuario.as_view(), name='usuarios-lista'),
    # Para operaciones sobre un usuario específico
    path('api/usuarios/<int:pk>/', DetalleUsuario.as_view(), name='usuario-detalle'),

]






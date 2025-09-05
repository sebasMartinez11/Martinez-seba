from django.contrib import admin
from django.urls import path
from usuarios.views import ListaYCreaUsuario, DetalleUsuario  # <-- cambio aquí

urlpatterns = [
    path('admin/', admin.site.urls),

    # Para listar y crear usuarios
    path('api/usuarios/', ListaYCreaUsuario.as_view(), name='usuarios-lista'),

    # Para operaciones sobre un usuario específico
    path('api/usuarios/<int:pk>/', DetalleUsuario.as_view(), name='usuario-detalle'),
]
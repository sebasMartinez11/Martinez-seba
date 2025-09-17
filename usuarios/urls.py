from django.urls import path
from .views import ListaYCreaUsuario, DetalleUsuario

urlpatterns = [
    path('', ListaYCreaUsuario.as_view(), name='usuarios-lista'),
    path('<int:pk>/', DetalleUsuario.as_view(), name='usuario-detalle'),
]

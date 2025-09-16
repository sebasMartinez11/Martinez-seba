from django.urls import path
from .views import ListaYCreaaUsuario, DetalleUsuario

urlpatterns = [
    path('', ListaYCreaaUsuario.as_view(), name='usuarios-lista'),
    path('<int:pk>/', DetalleUsuario.as_view(), name='usuario-detalle'),
]

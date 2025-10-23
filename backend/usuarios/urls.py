from django.urls import path
from .views import ListaYCreaUsuario, DetalleUsuario
from usuarios.views import CustomTokenObtainPairView

urlpatterns = [
    path('', ListaYCreaUsuario.as_view(), name='usuarios-lista'),
    path('<int:pk>/', DetalleUsuario.as_view(), name='usuario-detalle'),
    path("auth/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
]

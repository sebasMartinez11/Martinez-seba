from django.urls import path
from .views import dashboard_data, index

urlpatterns = [
    # Al incluir este archivo como path("api/", include("dashboard.urls")) en el proyecto principal,
    # la ruta final es: /api/dashboard/data/
    path("dashboard/data/", dashboard_data, name="dashboard_data"),  
    path("", index, name="dashboard_index"),                             # Para template HTML (ruta /api/ si no se especifica prefijo)
]

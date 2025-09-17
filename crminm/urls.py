from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("dashboard/", include("dashboard.urls")),
    path("api/usuarios/", include("usuarios.urls")),
    path("api/leads/", include("leads.urls")),
    path("api/propiedades/", include("propiedades.urls")),
]

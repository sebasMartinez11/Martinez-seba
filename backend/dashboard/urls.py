from django.urls import path
from .views import dashboard_data, index

urlpatterns = [
    path("api/data/", dashboard_data, name="dashboard_data"),  # Para Postman/React
    path("", index, name="dashboard_index"),                   # Para template HTML
]

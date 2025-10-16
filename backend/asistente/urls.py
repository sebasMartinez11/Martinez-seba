# asistente/urls.py
from django.urls import path
from .views import AskAssistantAPIView

app_name = "asistente"

urlpatterns = [
    path("ask/", AskAssistantAPIView.as_view(), name="ask"),
]

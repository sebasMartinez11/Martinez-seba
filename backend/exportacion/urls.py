from django.urls import path
from .views import ExportView, MetricsView, ImportView

urlpatterns = [
    path("export/", ExportView.as_view(), name="exportacion-export"),
    path("metrics/", MetricsView.as_view(), name="exportacion-metrics"),
    path("import/", ImportView.as_view(), name="exportacion-import"),
]

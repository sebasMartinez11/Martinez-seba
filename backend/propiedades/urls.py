from rest_framework.routers import DefaultRouter
from .views import PropiedadViewSet

router = DefaultRouter()
router.register(r"propiedades", PropiedadViewSet)

urlpatterns = router.urls

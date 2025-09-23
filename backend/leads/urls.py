from rest_framework.routers import DefaultRouter
from .views import EstadoLeadViewSet, ContactoViewSet

router = DefaultRouter()
router.register(r"estados-lead", EstadoLeadViewSet)
router.register(r"contactos", ContactoViewSet)

urlpatterns = router.urls

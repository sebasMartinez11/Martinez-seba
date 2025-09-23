from rest_framework.routers import DefaultRouter
from .views import EstadoLeadViewSet, ContactoViewSet, EventoViewSet

router = DefaultRouter()
router.register(r"estados-lead", EstadoLeadViewSet)
router.register(r"contactos", ContactoViewSet)
router.register(r"eventos", EventoViewSet)  # 👈 NUEVO

urlpatterns = router.urls

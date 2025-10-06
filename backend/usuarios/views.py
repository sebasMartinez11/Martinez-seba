from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated

from django.contrib.auth import get_user_model

# ⚠️ Importá SIEMPRE tu modelo de dominio con otro alias para no pisar auth.User
from .models import Usuario as UsuarioModel
from .serializers import UsuarioSerializer

AuthUser = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = UsuarioSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        obj = s.save()
        return Response(UsuarioSerializer(obj).data, status=status.HTTP_201_CREATED)


class MeUsuarioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Devuelve el perfil del usuario en TU tabla `usuarios_usuario`, no el auth.User.
        Busca por email (case-insensitive). Si no existe, 404 controlado.
        """
        email = getattr(request.user, "email", None)
        if not email:
            return Response({"detail": "User without email"}, status=400)

        try:
            usuario = UsuarioModel.objects.get(email__iexact=email)
        except UsuarioModel.DoesNotExist:
            return Response({"detail": "Usuario not found"}, status=404)

        return Response(UsuarioSerializer(usuario).data)

    def put(self, request):
        """
        Actualiza datos del perfil en TU tabla `usuarios_usuario` (no contraseña).
        """
        email = getattr(request.user, "email", None)
        if not email:
            return Response({"detail": "User without email"}, status=400)

        try:
            usuario = UsuarioModel.objects.get(email__iexact=email)
        except UsuarioModel.DoesNotExist:
            return Response({"detail": "Usuario not found"}, status=404)

        s = UsuarioSerializer(usuario, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        obj = s.save()
        return Response(UsuarioSerializer(obj).data, status=status.HTTP_200_OK)


class ListaYCreaUsuario(generics.ListCreateAPIView):
    queryset = UsuarioModel.objects.all().order_by("id")
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]


class DetalleUsuario(generics.RetrieveUpdateDestroyAPIView):
    queryset = UsuarioModel.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]


# ======================
#  Extras para Settings
# ======================

class ChangePasswordView(APIView):
    """
    POST /api/usuarios/me/change_password/
    Body:
    {
      "current_password": "xxx",
      "new_password": "xxxxxxx",
      "re_new_password": "xxxxxxx"
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password") or ""
        new_password = request.data.get("new_password") or ""
        re_new_password = request.data.get("re_new_password") or ""

        user = request.user  # auth user

        if not current_password or not new_password or not re_new_password:
            return Response({"detail": "Faltan campos obligatorios"}, status=400)

        if not user.check_password(current_password):
            return Response({"detail": "La contraseña actual es incorrecta"}, status=400)

        if new_password != re_new_password:
            return Response({"detail": "Las contraseñas nuevas no coinciden"}, status=400)

        if len(new_password) < 8:
            return Response({"detail": "La nueva contraseña debe tener al menos 8 caracteres"}, status=400)

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"detail": "Contraseña actualizada correctamente"}, status=200)


class DeleteAccountView(APIView):
    """
    POST /api/usuarios/me/delete/
    Body:
    {
      "current_password": "xxx",
      "confirm_text": "ELIMINAR"
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password") or ""
        confirm_text = (request.data.get("confirm_text") or "").strip()

        user = request.user  # auth user

        if confirm_text != "ELIMINAR":
            return Response({"detail": "Debes escribir 'ELIMINAR' para confirmar"}, status=400)

        if not user.check_password(current_password):
            return Response({"detail": "La contraseña actual es incorrecta"}, status=400)

        # Borrar también el registro en TU tabla, si existe
        try:
            u2 = UsuarioModel.objects.get(email__iexact=user.email)
            u2.delete()
        except UsuarioModel.DoesNotExist:
            pass

        user.delete()  # borra auth user

        return Response(status=status.HTTP_204_NO_CONTENT)

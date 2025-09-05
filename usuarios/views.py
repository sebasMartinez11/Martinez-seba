from django.shortcuts import render
from rest_framework.views import APIView                # Permite crear vistas manuales para endpoints CRUD
from rest_framework.response import Response           # Permite devolver datos al cliente en JSON
from rest_framework import status                      # Contiene los códigos HTTP (200, 201, 400, 404...)
from django.shortcuts import get_object_or_404          # Busca un objeto por ID o devuelve 404 si no existe
from .models import Usuario                             # Importa nuestro modelo de usuario propio
from .serializers import UsuarioSerializer             # Importa el serializer que convierte modelo a JSON

# Clase para listar todos los usuarios y crear uno nuevo
class ListaYCreaUsuario(APIView):

    # Método GET → lista todos los usuarios
    def get(self, request):
        usuarios = Usuario.objects.all().order_by('id')           # Trae todos los usuarios de la base de datos y los ordena por ID
        serializer = UsuarioSerializer(usuarios, many=True)      # Convierte la lista de usuarios a JSON
        return Response(serializer.data)                          # Devuelve la lista en JSON

    # Método POST → crea un usuario nuevo
    def post(self, request):
        serializer = UsuarioSerializer(data=request.data)        # Recibe los datos enviados por el cliente (Postman, frontend)
        if serializer.is_valid():                                 # Valida que los datos cumplan las reglas (email único, password requerido)
            serializer.save()                                     # Guarda el usuario en la DB (hash de contraseña y token incluidos)
            return Response(serializer.data, status=status.HTTP_201_CREATED)  # Devuelve datos del usuario recién creado con código 201
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)  # Devuelve errores si hay datos inválidos

# Clase para operaciones sobre un usuario específico (GET, PUT, DELETE)
class DetalleUsuario(APIView):

    # Método GET → trae un usuario por ID
    def get(self, request, pk):
        usuario = get_object_or_404(Usuario, pk=pk)             # Busca el usuario por ID; si no existe, devuelve 404
        serializer = UsuarioSerializer(usuario)                 # Convierte el usuario a JSON
        return Response(serializer.data)                         # Devuelve los datos en JSON

    # Método PUT → reemplaza todos los datos de un usuario
    def put(self, request, pk):
        usuario = get_object_or_404(Usuario, pk=pk)             # Busca el usuario por ID
        serializer = UsuarioSerializer(usuario, data=request.data)  # Prepara los nuevos datos para reemplazo total
        if serializer.is_valid():                                # Valida los datos
            serializer.save()                                    # Guarda los cambios en la DB
            return Response(serializer.data)                     # Devuelve los datos actualizados
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)  # Devuelve errores si hay datos inválidos

    # Método DELETE → elimina un usuario
    def delete(self, request, pk):
        usuario = get_object_or_404(Usuario, pk=pk)             # Busca el usuario; si no existe, devuelve 404
        usuario.delete()                                        # Elimina el usuario de la base de datos
        return Response(status=status.HTTP_204_NO_CONTENT)      # Devuelve código 204: eliminado exitosamente, sin contenido


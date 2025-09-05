from rest_framework import serializers  # Importa los serializers de DRF
from django.contrib.auth.hashers import make_password  # Importa función para hashear contraseñas
from .models import Usuario  # Importa tu modelo Usuario

class UsuarioSerializer(serializers.ModelSerializer):  # Creamos un serializer para el modelo Usuario
    password = serializers.CharField(write_only=True, required=True)
    # Campo de contraseña que solo se usa para escribir (nunca se devuelve en JSON)

    class Meta:
        model = Usuario
        fields = [
            'id', 'nombre', 'apellido', 'email',
            'password',  # solo para entrada (write_only)
            'token',     # se mostrará en la respuesta
            'creado', 'actualizado'
        ]
        read_only_fields = ['id', 'token', 'creado', 'actualizado']
        # Estos campos no se pueden modificar desde Postman/cliente

    def create(self, validated_data):  # Método para crear un usuario
        password = validated_data.pop('password')  # Sacamos la contraseña en texto plano
        validated_data['password_hash'] = make_password(password)
        # La convertimos en hash y guardamos en password_hash
        return Usuario.objects.create(**validated_data)  # Creamos el usuario en la DB

    def update(self, instance, validated_data):  # Método para actualizar un usuario
        password = validated_data.pop('password', None)
        if password:
            instance.password_hash = make_password(password)
            # Si se envía nueva contraseña, la hasheamos
        for attr, value in validated_data.items():  # Actualizamos el resto de los campos
            setattr(instance, attr, value)
        instance.save()
        return instance

from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Usuario

class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'nombre', 'apellido', 'email',
            'password',
            'token',
            'creado', 'actualizado'
        ]
        read_only_fields = ['id', 'token', 'creado', 'actualizado']

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['password_hash'] = make_password(password)
        return Usuario.objects.create(**validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.password_hash = make_password(password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
# from django.contrib.auth.password_validation import validate_password  # si querés validadores avanzados

from .models import Usuario


def _sync_auth_user(email: str, first_name: str, last_name: str, raw_password: str):
    user, _ = User.objects.get_or_create(
        username=email,
        defaults={
            "email": email,
            "first_name": first_name or "",
            "last_name": last_name or "",
            "is_active": True,
        },
    )
    changed = False
    if raw_password:
        user.set_password(raw_password); changed = True
    if user.email != email:
        user.email = email; changed = True
    if user.first_name != (first_name or ""):
        user.first_name = first_name or ""; changed = True
    if user.last_name != (last_name or ""):
        user.last_name = last_name or ""; changed = True
    if not user.is_active:
        user.is_active = True; changed = True
    if changed:
        user.save()
    return user


class UsuarioSerializer(serializers.ModelSerializer):
    # password no es obligatorio en update; sí en create (validado en create)
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=False, style={"input_type": "password"}
    )

    class Meta:
        model = Usuario
        fields = [
            "id", "nombre", "apellido", "email",
            "password",
            "token",
            "creado", "actualizado",
            "telefono", "dni",
            "reminder_every_days",
        ]
        read_only_fields = ["id", "token", "creado", "actualizado"]

    # ---------- Validaciones de campos ----------
    def validate_email(self, value: str):
        if not value:
            raise serializers.ValidationError("El email es obligatorio.")
        email = value.strip()
        qs = Usuario.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un usuario con ese email.")
        return email

    def validate_reminder_every_days(self, value):
        # Aceptamos números positivos pequeños; default del modelo es 3
        if value is None:
            return 3
        try:
            v = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Debe ser un número entero.")
        if v <= 0:
            raise serializers.ValidationError("Debe ser mayor a 0.")
        if v > 365:
            raise serializers.ValidationError("Debe ser ≤ 365 días.")
        return v

    def _validate_password_rules(self, raw_password: str):
        if len(raw_password) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres.")
        # Descomentar si querés validar con los validadores de Django
        # try:
        #     validate_password(raw_password, user=self.instance)
        # except DjangoValidationError as e:
        #     raise serializers.ValidationError(list(e.messages))

    # ---------- Create / Update ----------
    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": "La contraseña es obligatoria al crear."})

        # Reglas de password
        self._validate_password_rules(password)

        validated_data["password_hash"] = make_password(password)
        obj = Usuario.objects.create(**validated_data)

        _sync_auth_user(
            email=obj.email,
            first_name=obj.nombre,
            last_name=obj.apellido,
            raw_password=password,
        )
        return obj

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        # Actualizar atributos normales
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Si viene contraseña, validar y setear
        if password:
            self._validate_password_rules(password)
            instance.password_hash = make_password(password)

        instance.save()

        _sync_auth_user(
            email=instance.email,
            first_name=instance.nombre,
            last_name=instance.apellido,
            raw_password=password or "",
        )
        return instance

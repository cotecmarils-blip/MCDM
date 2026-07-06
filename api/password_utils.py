"""Validación de contraseñas con mensajes claros en español."""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

_PASSWORD_MESSAGES = {
    'password_too_common': (
        'La contraseña es demasiado común. Elija una más segura y difícil de adivinar.'
    ),
    'password_too_short': (
        'La contraseña es muy corta. Debe tener al menos 8 caracteres.'
    ),
    'password_entirely_numeric': (
        'La contraseña no puede estar formada solo por números.'
    ),
}


def _password_error_to_spanish(error) -> str:
    code = getattr(error, 'code', None)
    if code in _PASSWORD_MESSAGES:
        return _PASSWORD_MESSAGES[code]
    text = str(error).lower()
    if 'too common' in text:
        return _PASSWORD_MESSAGES['password_too_common']
    if 'too short' in text:
        return _PASSWORD_MESSAGES['password_too_short']
    if 'entirely numeric' in text:
        return _PASSWORD_MESSAGES['password_entirely_numeric']
    return 'La contraseña no cumple los requisitos de seguridad.'


def assert_password_valid(password, user=None) -> None:
    """Valida la contraseña o lanza ValidationError en el campo password."""
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        messages = [_password_error_to_spanish(err) for err in exc.error_list]
        raise serializers.ValidationError({'password': messages[0]}) from exc

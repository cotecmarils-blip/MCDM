from decimal import Decimal

from rest_framework import serializers

PESO_TOLERANCE = Decimal('0.01')


def validate_peso_value(value):
    peso = Decimal(str(value))
    if peso < 0 or peso > 100:
        raise serializers.ValidationError('El peso debe estar entre 0 y 100.')
    return peso


def validate_siblings_weight_sum(queryset, new_peso, instance_id=None):
    siblings = queryset
    if instance_id:
        siblings = siblings.exclude(pk=instance_id)

    total = sum((s.peso for s in siblings), Decimal('0')) + Decimal(str(new_peso))

    if total > Decimal('100') + PESO_TOLERANCE:
        raise serializers.ValidationError(
            f'La suma de pesos no puede superar 100%. Total con este valor: {total:.2f}%.'
        )
    return total

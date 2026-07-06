"""Escenarios ligados a dimensiones (Omoe)."""
from __future__ import annotations

from decimal import Decimal

from .evaluacion_rama_choices import RAMA_OMOE
from .models import Escenario, Omoe

ESCENARIO_ESTANDAR_NOMBRE = 'Estandar'
ESCENARIO_ESTANDAR_PESO = Decimal('100')


def ensure_escenario_estandar(omoe: Omoe) -> Escenario:
    rama = (getattr(omoe, 'rama_evaluacion', None) or '').strip()
    if not rama or rama == 'auto':
        rama = RAMA_OMOE
    escenario, _ = Escenario.objects.get_or_create(
        omoe=omoe,
        nombre=ESCENARIO_ESTANDAR_NOMBRE,
        defaults={
            'proyecto_id': omoe.proyecto_id,
            'descripcion': 'Escenario por defecto de la dimensión.',
            'peso': ESCENARIO_ESTANDAR_PESO,
            'rama_evaluacion': rama,
            'orden': 0,
        },
    )
    return escenario

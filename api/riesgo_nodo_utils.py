"""Utilidades para nodos terminales con incertidumbre.

Un nodo en modo *incertidumbre* no usa función de utilidad: su valor es el
riesgo = probabilidad × consecuencia. La probabilidad sale de la tabla del
proyecto (``NivelProbabilidad``); la consecuencia son descripciones por nivel
(0.1, 0.3, …) configuradas en el propio nodo del árbol de dimensiones.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

MODO_CERTEZA = 'certeza'
MODO_INCERTIDUMBRE = 'incertidumbre'

DEFAULT_NIVELES = ['0.1', '0.3', '0.5', '0.7', '0.9']
RIESGO_SEPARATOR = '|'


def nivel_key(valor: Any) -> str:
    """Clave canónica de un nivel numérico: 0.10 -> '0.1'."""
    try:
        d = Decimal(str(valor))
    except (InvalidOperation, TypeError, ValueError):
        return str(valor).strip()
    return format(d.normalize(), 'f')


def clean_consecuencia_descripciones(raw: Any) -> dict[str, str]:
    """Normaliza el JSON de descripciones {nivel: texto}."""
    if not isinstance(raw, dict):
        return {}
    out: dict[str, str] = {}
    for key, value in raw.items():
        text = '' if value is None else str(value).strip()
        out[nivel_key(key)] = text
    return out


def parse_riesgo_value(raw: Any) -> tuple[float, float] | None:
    """'0.3|0.5' -> (0.3, 0.5). None si está incompleto o no es válido."""
    if raw is None:
        return None
    s = str(raw).strip()
    if RIESGO_SEPARATOR not in s:
        return None
    p_str, _, c_str = s.partition(RIESGO_SEPARATOR)
    if p_str.strip() == '' or c_str.strip() == '':
        return None
    try:
        return float(p_str), float(c_str)
    except (TypeError, ValueError):
        return None


def riesgo_producto(raw: Any) -> float | None:
    """Riesgo = probabilidad × consecuencia a partir del valor 'p|c'."""
    parsed = parse_riesgo_value(raw)
    if parsed is None:
        return None
    prob, cons = parsed
    return prob * cons

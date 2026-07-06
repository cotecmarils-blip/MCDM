"""Métodos de cálculo por dimensión (OMOE)."""
from __future__ import annotations

CALC_METHOD_MAVT = 'MAVT'
CALC_METHOD_MAUT = 'MAUT'
CALC_METHOD_UTA = 'UTA'
CALC_METHOD_WEIGHTED_SUM = 'WEIGHTED_SUM'

CALCULATION_METHOD_CHOICES = (
    (CALC_METHOD_MAVT, 'MAVT jerárquico'),
    (CALC_METHOD_MAUT, 'MAUT por escenarios'),
    (CALC_METHOD_UTA, 'UTA / calibración por preferencias'),
    (CALC_METHOD_WEIGHTED_SUM, 'Promedio ponderado simple'),
)

CALCULATION_METHOD_VALUES = {c[0] for c in CALCULATION_METHOD_CHOICES}

DEFAULT_CALCULATION_METHOD = CALC_METHOD_MAVT

DEFAULT_CALCULATION_CONFIGS: dict[str, dict] = {
    CALC_METHOD_MAVT: {
        'normalize_weights': True,
        'aggregation': 'additive',
        'default_utility_range': [0, 1],
    },
    CALC_METHOD_MAUT: {
        'normalize_probabilities': True,
    },
    CALC_METHOD_UTA: {
        'preference_source': 'expert_ranking',
        'epsilon': 0.001,
        'monotonicity': True,
        'calibrate_weights': True,
        'calibrate_utility_functions': False,
        'preferences': {
            'ranking': [],
            'preferred_pairs': [],
            'indifference_pairs': [],
        },
    },
    CALC_METHOD_WEIGHTED_SUM: {
        'normalize_weights': True,
        'fallback_to_arithmetic_mean_when_zero_weights': True,
    },
}


def resolve_calculation_method(omoe) -> str:
    method = (getattr(omoe, 'calculation_method', None) or '').strip()
    if method in CALCULATION_METHOD_VALUES:
        return method
    return DEFAULT_CALCULATION_METHOD


def merge_calculation_config(method: str, config: dict | None) -> dict:
    base = dict(DEFAULT_CALCULATION_CONFIGS.get(method, {}))
    if config:
        base.update(config)
    return base

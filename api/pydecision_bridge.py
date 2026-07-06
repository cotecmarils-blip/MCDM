"""
Puente entre Django y la librería pyDecisionMaking.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_PYDM_ROOT = Path(__file__).resolve().parent.parent / 'pyDecisionMaking'
if str(_PYDM_ROOT) not in sys.path:
    sys.path.insert(0, str(_PYDM_ROOT))

from src.hierarchy import CriteriaHierarchy, MCDMEvaluator  # noqa: E402
from src.utility_functions import UtilityFunction  # noqa: E402


def _coerce_numeric(raw_value: Any) -> Any:
    """Convierte cadenas numéricas de la matriz de evaluación a float."""
    if isinstance(raw_value, str):
        s = raw_value.strip()
        if not s:
            return raw_value
        try:
            return float(s)
        except ValueError:
            return raw_value
    return raw_value


def evaluate_utility(raw_value: Any, utility_function: dict[str, Any]) -> float:
    """Evalúa un valor con las funciones de utilidad de pyDecisionMaking."""
    if raw_value is None:
        return 0.0
    if not utility_function:
        return 0.0

    uf_type = utility_function.get('type')
    if uf_type == 'DiscreteUtilityFunction':
        mapping = utility_function.get('mapping') or {}
        key = str(raw_value).strip()
        if key in mapping:
            return float(mapping[key])
        for k, v in mapping.items():
            if str(k).lower() == key.lower():
                return float(v)
        return 0.0

    try:
        uf = UtilityFunction.from_dict(utility_function)
        x = _coerce_numeric(raw_value)
        return float(uf.evaluate(x))
    except (TypeError, ValueError, KeyError):
        return 0.0


def evaluate_overall_scores(
    hierarchy: dict[str, Any],
    alternatives: dict[str, dict[str, Any]],
) -> dict[str, float]:
    """Puntuación global ponderada por alternativa (mismo algoritmo que run_demo.py)."""
    if not alternatives:
        return {}

    model = CriteriaHierarchy.from_dict(hierarchy)
    model.validate_hierarchy()
    evaluator = MCDMEvaluator(alternatives)
    evaluator.add_model(model.root.name, model)
    matrix = evaluator.get_rating_matrix()
    col = model.root.name
    return {str(idx): float(matrix.at[idx, col]) for idx in matrix.index}

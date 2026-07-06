"""
Servicio de cálculo por dimensión según método seleccionado (MAVT, MAUT, UTA, WEIGHTED_SUM).
"""
from __future__ import annotations

from typing import Any, Callable

from .calculation_method_choices import (
    CALC_METHOD_MAUT,
    CALC_METHOD_MAVT,
    CALC_METHOD_UTA,
    CALC_METHOD_WEIGHTED_SUM,
    DEFAULT_CALCULATION_METHOD,
    merge_calculation_config,
    resolve_calculation_method,
)
from .mcdm_utils import _weighted_mean
from .models import Omoe


def _round6(value: float) -> float:
    return round(float(value), 6)


def _resolve_maut_scenarios(
    omoe: Omoe,
    config: dict[str, Any],
    escenarios: list,
) -> list[dict[str, Any]]:
    """Escenarios de la dimensión (omoe_id); ignora escenarios de otras dimensiones."""
    linked = [esc for esc in escenarios if getattr(esc, 'omoe_id', None) == omoe.id]
    if not linked:
        return []
    return [
        {
            'name': esc.nombre or f'Escenario {esc.id}',
            'probability': float(esc.peso or 0),
            'escenario_id': esc.id,
        }
        for esc in linked
    ]


def _validate_maut_scenarios(scenarios: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    if not scenarios:
        errors.append('MAUT requiere escenarios con probabilidades configuradas para esta dimensión.')
        return errors
    total = sum(float(s.get('probability', 0) or 0) for s in scenarios)
    if total <= 0:
        errors.append('La suma de probabilidades de escenarios debe ser mayor que 0.')
    return errors


def _validate_uta_preferences(config: dict[str, Any]) -> list[str]:
    prefs = config.get('preferences') or {}
    ranking = prefs.get('ranking') or []
    preferred = prefs.get('preferred_pairs') or []
    indifferent = prefs.get('indifference_pairs') or []
    if not (ranking or preferred or indifferent):
        return ['UTA requiere preferencias (ranking, pares preferidos o indiferencias).']
    return []


def calcular_dimension(
    omoe: Omoe,
    terminales: list[dict],
    escenarios: list,
    valores: dict[str, str],
    *,
    mavt_fn: Callable[..., tuple[float, dict[str, Any]]],
    weighted_sum_fn: Callable[..., tuple[float, dict[str, Any]]] | None = None,
    maut_fn: Callable[..., tuple[float, dict[str, Any]]] | None = None,
    uta_fn: Callable[..., tuple[float, dict[str, Any]]] | None = None,
    debug_logs: list[str] | None = None,
) -> tuple[float, dict[str, Any]]:
    """
    Despacha el cálculo según omoe.calculation_method.

    mavt_fn debe encapsular la lógica actual (árbol jerárquico).
    """
    method = resolve_calculation_method(omoe)
    config = merge_calculation_config(method, omoe.calculation_config or {})
    warnings: list[str] = []
    errors: list[str] = []

    if method == CALC_METHOD_MAVT:
        valor, detalle = mavt_fn(omoe, terminales, escenarios, valores, debug_logs)
        detalle['calculation_method'] = method
        detalle['calculation_config'] = config
        detalle.setdefault('warnings', [])
        detalle.setdefault('errors', [])
        return valor, detalle

    if method == CALC_METHOD_WEIGHTED_SUM:
        if weighted_sum_fn is None:
            valor, detalle = mavt_fn(omoe, terminales, escenarios, valores, debug_logs)
            detalle['calculation_method'] = method
            detalle['calculation_config'] = config
            detalle.setdefault('warnings', []).append(
                'WEIGHTED_SUM: usando agregación plana sobre hojas.'
            )
            return valor, detalle
        valor, detalle = weighted_sum_fn(omoe, terminales, escenarios, valores, config, debug_logs)
        detalle['calculation_method'] = method
        detalle['calculation_config'] = config
        return valor, detalle

    if method == CALC_METHOD_MAUT:
        scenarios = _resolve_maut_scenarios(omoe, config, escenarios)
        errors = _validate_maut_scenarios(scenarios)
        if errors:
            return 0.0, {
                'calculation_method': method,
                'calculation_config': config,
                'errors': errors,
                'warnings': warnings,
                'valor': 0.0,
            }
        if maut_fn is None:
            valor, detalle = _calcular_maut_default(
                omoe, terminales, escenarios, valores, scenarios, config, mavt_fn, debug_logs,
            )
        else:
            valor, detalle = maut_fn(
                omoe, terminales, escenarios, valores, scenarios, config, debug_logs,
            )
        detalle['calculation_method'] = method
        detalle['calculation_config'] = config
        return valor, detalle

    if method == CALC_METHOD_UTA:
        errors = _validate_uta_preferences(config)
        if errors:
            return 0.0, {
                'calculation_method': method,
                'calculation_config': config,
                'errors': errors,
                'warnings': warnings,
                'valor': 0.0,
            }
        if uta_fn is None:
            valor, detalle = mavt_fn(omoe, terminales, escenarios, valores, debug_logs)
            detalle['calculation_method'] = method
            detalle['calculation_config'] = config
            detalle.setdefault('warnings', []).append(
                'UTA: calibración completa pendiente; se usa puntaje MAVT provisional.'
            )
            detalle['uta_status'] = 'scaffold'
            return valor, detalle
        valor, detalle = uta_fn(omoe, terminales, escenarios, valores, config, debug_logs)
        detalle['calculation_method'] = method
        detalle['calculation_config'] = config
        return valor, detalle

    valor, detalle = mavt_fn(omoe, terminales, escenarios, valores, debug_logs)
    detalle['calculation_method'] = DEFAULT_CALCULATION_METHOD
    detalle.setdefault('warnings', []).append(f'Método «{method}» desconocido; se usó MAVT.')
    return valor, detalle


def _calcular_maut_default(
    omoe: Omoe,
    terminales: list[dict],
    escenarios: list,
    valores: dict[str, str],
    scenarios: list[dict[str, Any]],
    config: dict[str, Any],
    mavt_fn: Callable[..., tuple[float, dict[str, Any]]],
    debug_logs: list[str] | None,
) -> tuple[float, dict[str, Any]]:
    """EU(a) = Σ Ps · V(a,s) usando MAVT por escenario."""
    probs = [float(s.get('probability', 0) or 0) for s in scenarios]
    total_p = sum(probs)
    warnings: list[str] = []
    if total_p <= 0:
        return 0.0, {
            'valor': 0.0,
            'errors': ['La suma de probabilidades de escenarios debe ser mayor que 0.'],
            'warnings': warnings,
            'metodo': 'maut',
        }

    if config.get('normalize_probabilities', True) and abs(total_p - 1.0) > 1e-4:
        probs = [p / total_p for p in probs]
        warnings.append(f'Probabilidades normalizadas (suma original={total_p:.4f}).')

    # Mapear escenarios del modelo Django por id o nombre
    esc_by_id = {esc.id: esc for esc in escenarios}
    esc_by_name = {(esc.nombre or '').strip().lower(): esc for esc in escenarios}

    scenario_rows: list[dict[str, Any]] = []
    pairs: list[tuple[float, float]] = []

    for idx, scen_cfg in enumerate(scenarios):
        p = probs[idx] if idx < len(probs) else 0.0
        scen_name = (scen_cfg.get('name') or '').strip()
        esc_obj = None
        esc_id = scen_cfg.get('escenario_id')
        if esc_id is not None:
            esc_obj = esc_by_id.get(int(esc_id))
        if esc_obj is None and scen_name:
            esc_obj = esc_by_name.get(scen_name.lower())

        if esc_obj is not None:
            single_esc = [esc_obj]
        elif escenarios:
            single_esc = [escenarios[min(idx, len(escenarios) - 1)]]
            warnings.append(
                f'Escenario «{scen_name or idx}» no encontrado en BD; '
                'se usa escenario disponible por índice.'
            )
        else:
            single_esc = []
            warnings.append(
                f'Escenario «{scen_name or idx}» sin datos; se usa valor global como fallback.'
            )

        v, det = mavt_fn(omoe, terminales, single_esc, valores, debug_logs)
        pairs.append((v, p))
        scenario_rows.append({
            'scenario': scen_name or (esc_obj.nombre if esc_obj else f'Escenario {idx + 1}'),
            'probability': _round6(p),
            'score': _round6(v),
            'detalle': det,
        })

    eu = _weighted_mean(pairs)
    return eu, {
        'valor': _round6(eu),
        'metodo': 'maut',
        'formula': 'EU(a) = Σ Ps · V(a,s)',
        'scenarios': scenario_rows,
        'warnings': list(dict.fromkeys(warnings)),
    }

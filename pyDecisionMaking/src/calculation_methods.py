"""
Estrategias de cálculo multicriterio por dimensión.

Cada método implementa evaluate() sobre jerarquía + datos de alternativas.
"""
from __future__ import annotations

import math
from abc import ABC, abstractmethod
from collections import deque
from typing import Any

from src.hierarchy import Attribute, CriteriaHierarchy, MCDMEvaluator


class CalculationResult:
    """Resultado normalizado de un método de cálculo."""

    def __init__(
        self,
        scores: dict[str, float],
        *,
        method: str,
        ranking: list[str] | None = None,
        warnings: list[str] | None = None,
        errors: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        self.scores = scores
        self.method = method
        self.ranking = ranking or _rank_alternatives(scores)
        self.warnings = warnings or []
        self.errors = errors or []
        self.metadata = metadata or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            'method': self.method,
            'scores': self.scores,
            'ranking': self.ranking,
            'warnings': self.warnings,
            'errors': self.errors,
            'metadata': self.metadata,
        }


def _rank_alternatives(scores: dict[str, float]) -> list[str]:
    return sorted(scores.keys(), key=lambda k: scores[k], reverse=True)


def _weighted_sum_values(
    pairs: list[tuple[float, float]],
    *,
    normalize_weights: bool = True,
    fallback_to_mean: bool = True,
) -> float:
    if not pairs:
        return 0.0
    total_w = sum(w for _, w in pairs)
    if total_w <= 0:
        if fallback_to_mean:
            return sum(v for v, _ in pairs) / len(pairs)
        return 0.0
    if normalize_weights:
        return sum(v * w for v, w in pairs) / total_w
    return sum(v * w for v, w in pairs)


class CalculationMethod(ABC):
    """Interfaz base para métodos de cálculo por dimensión."""

    code: str = ''

    @abstractmethod
    def evaluate(
        self,
        hierarchy: CriteriaHierarchy | dict[str, Any],
        alternatives_data: dict[str, dict[str, Any]],
        config: dict[str, Any] | None = None,
    ) -> CalculationResult:
        raise NotImplementedError


def _ensure_hierarchy(hierarchy: CriteriaHierarchy | dict[str, Any]) -> CriteriaHierarchy:
    if isinstance(hierarchy, CriteriaHierarchy):
        return hierarchy
    return CriteriaHierarchy.from_dict(hierarchy)


def _leaf_attributes(model: CriteriaHierarchy) -> list[Attribute]:
    attrs: list[Attribute] = []
    queue = deque([model.root])
    while queue:
        node = queue.popleft()
        if isinstance(node, Attribute):
            attrs.append(node)
        else:
            queue.extend(node.children)
    return attrs


def _mavt_score(model: CriteriaHierarchy, tech_data: dict[str, Any]) -> float:
    model.update_weights()
    score = 0.0
    for attr in _leaf_attributes(model):
        default_val = (
            attr.utility_function.threshold
            if hasattr(attr.utility_function, 'threshold')
            else 0.0
        )
        val = tech_data.get(attr.name, default_val)
        u = attr.utility_function.evaluate(val)
        score += u * attr.global_weight
    return float(score)


class MAVTCalculationMethod(CalculationMethod):
    """MAVT jerárquico: V(a) = Σ Wi · ui(a)."""

    code = 'MAVT'

    def evaluate(
        self,
        hierarchy: CriteriaHierarchy | dict[str, Any],
        alternatives_data: dict[str, dict[str, Any]],
        config: dict[str, Any] | None = None,
    ) -> CalculationResult:
        model = _ensure_hierarchy(hierarchy)
        warnings: list[str] = []
        errors: list[str] = []

        if not model.validate_hierarchy():
            errors.extend(model.validation_errors)
            return CalculationResult({}, method=self.code, errors=errors)

        scores: dict[str, float] = {}
        for alt_name, tech_data in alternatives_data.items():
            data = tech_data.get('values') or tech_data
            scores[alt_name] = _mavt_score(model, data)

        return CalculationResult(
            scores,
            method=self.code,
            warnings=warnings,
            metadata={'aggregation': (config or {}).get('aggregation', 'additive')},
        )


class MAUTCalculationMethod(CalculationMethod):
    """MAUT por escenarios: EU(a) = Σ Ps · V(a,s)."""

    code = 'MAUT'

    def evaluate(
        self,
        hierarchy: CriteriaHierarchy | dict[str, Any],
        alternatives_data: dict[str, dict[str, Any]],
        config: dict[str, Any] | None = None,
    ) -> CalculationResult:
        cfg = config or {}
        scenarios = cfg.get('scenarios') or []
        warnings: list[str] = []
        errors: list[str] = []

        if not scenarios:
            errors.append('MAUT requiere al menos un escenario con probabilidad.')
            return CalculationResult({}, method=self.code, errors=errors)

        probs = [float(s.get('probability', 0) or 0) for s in scenarios]
        total_p = sum(probs)
        if total_p <= 0:
            errors.append('La suma de probabilidades de escenarios debe ser mayor que 0.')
            return CalculationResult({}, method=self.code, errors=errors)

        if cfg.get('normalize_probabilities', True) and not math.isclose(total_p, 1.0, rel_tol=1e-4):
            probs = [p / total_p for p in probs]
            warnings.append(f'Probabilidades normalizadas (suma original={total_p:.4f}).')

        mavt = MAVTCalculationMethod()
        model = _ensure_hierarchy(hierarchy)
        scores: dict[str, float] = {}
        scenario_details: dict[str, list[dict[str, Any]]] = {}

        for alt_name, alt_data in alternatives_data.items():
            eu = 0.0
            alt_scenarios = (alt_data.get('scenarios') or {}) if isinstance(alt_data, dict) else {}
            rows: list[dict[str, Any]] = []

            for idx, scen in enumerate(scenarios):
                scen_name = scen.get('name') or f'Escenario {idx + 1}'
                p = probs[idx] if idx < len(probs) else 0.0
                scen_values = alt_scenarios.get(scen_name)
                if scen_values is None:
                    scen_values = alt_data.get('values') or alt_data
                    warnings.append(
                        f'Alternativa «{alt_name}»: sin datos para escenario «{scen_name}», '
                        'se usa valor base.'
                    )
                v = _mavt_score(model, scen_values)
                eu += p * v
                rows.append({'scenario': scen_name, 'probability': p, 'score': v})

            scores[alt_name] = eu
            scenario_details[alt_name] = rows

        return CalculationResult(
            scores,
            method=self.code,
            warnings=list(dict.fromkeys(warnings)),
            metadata={'scenario_details': scenario_details},
        )


class UTACalculationMethod(CalculationMethod):
    """UTA: calibración por preferencias (scaffold con optimización opcional)."""

    code = 'UTA'

    def evaluate(
        self,
        hierarchy: CriteriaHierarchy | dict[str, Any],
        alternatives_data: dict[str, dict[str, Any]],
        config: dict[str, Any] | None = None,
    ) -> CalculationResult:
        cfg = config or {}
        prefs = cfg.get('preferences') or {}
        ranking = prefs.get('ranking') or []
        preferred = prefs.get('preferred_pairs') or []
        indifferent = prefs.get('indifference_pairs') or []
        epsilon = float(cfg.get('epsilon', 0.001))

        has_prefs = bool(ranking or preferred or indifferent)
        if not has_prefs:
            return CalculationResult(
                {},
                method=self.code,
                errors=['UTA requiere preferencias (ranking, pares preferidos o indiferencias).'],
            )

        model = _ensure_hierarchy(hierarchy)
        if not model.validate_hierarchy():
            return CalculationResult(
                {},
                method=self.code,
                errors=model.validation_errors,
            )

        try:
            from scipy.optimize import linprog  # type: ignore
        except ImportError:
            mavt = MAVTCalculationMethod()
            base = mavt.evaluate(model, alternatives_data, cfg)
            base.warnings.append(
                'UTA: scipy no disponible; se devuelve puntaje MAVT sin calibración.'
            )
            base.method = self.code
            base.metadata['uta_status'] = 'scipy_unavailable'
            return base

        attrs = _leaf_attributes(model)
        alt_names = list(alternatives_data.keys())
        n_alts = len(alt_names)
        n_attrs = len(attrs)

        if n_alts < 2 or n_attrs < 1:
            return CalculationResult(
                {},
                method=self.code,
                errors=['UTA requiere al menos 2 alternativas y 1 atributo evaluable.'],
            )

        utilities_matrix: list[list[float]] = []
        for alt_name in alt_names:
            data = alternatives_data[alt_name].get('values') or alternatives_data[alt_name]
            row = []
            for attr in attrs:
                default_val = (
                    attr.utility_function.threshold
                    if hasattr(attr.utility_function, 'threshold')
                    else 0.0
                )
                val = data.get(attr.name, default_val)
                row.append(float(attr.utility_function.evaluate(val)))
            utilities_matrix.append(row)

        if not cfg.get('calibrate_weights', True):
            scores = {
                alt_names[i]: sum(utilities_matrix[i])
                for i in range(n_alts)
            }
            return CalculationResult(
                scores,
                method=self.code,
                metadata={'uta_status': 'additive_without_calibration'},
            )

        c = [-1.0] * n_attrs
        A_ub: list[list[float]] = []
        b_ub: list[float] = []

        def alt_index(name: str) -> int | None:
            try:
                return alt_names.index(name)
            except ValueError:
                return None

        for pair in preferred:
            if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                continue
            i, j = alt_index(pair[0]), alt_index(pair[1])
            if i is None or j is None:
                continue
            row = [utilities_matrix[i][k] - utilities_matrix[j][k] for k in range(n_attrs)]
            A_ub.append([-v for v in row])
            b_ub.append(-epsilon)

        for pair in indifferent:
            if not isinstance(pair, (list, tuple)) or len(pair) != 2:
                continue
            i, j = alt_index(pair[0]), alt_index(pair[1])
            if i is None or j is None:
                continue
            diff = [utilities_matrix[i][k] - utilities_matrix[j][k] for k in range(n_attrs)]
            A_ub.append(diff)
            b_ub.append(epsilon)
            A_ub.append([-v for v in diff])
            b_ub.append(epsilon)

        for r in range(len(ranking) - 1):
            i, j = alt_index(ranking[r]), alt_index(ranking[r + 1])
            if i is None or j is None:
                continue
            row = [utilities_matrix[i][k] - utilities_matrix[j][k] for k in range(n_attrs)]
            A_ub.append([-v for v in row])
            b_ub.append(-epsilon)

        bounds = [(0.0, None)] * n_attrs
        res = linprog(c, A_ub=A_ub or None, b_ub=b_ub or None, bounds=bounds, method='highs')
        if not res.success:
            return CalculationResult(
                {},
                method=self.code,
                errors=[f'UTA: optimización fallida ({res.message}).'],
            )

        weights = list(res.x)
        wsum = sum(weights) or 1.0
        weights = [w / wsum for w in weights]

        scores: dict[str, float] = {}
        for i, alt_name in enumerate(alt_names):
            scores[alt_name] = sum(
                utilities_matrix[i][k] * weights[k] for k in range(n_attrs)
            )

        return CalculationResult(
            scores,
            method=self.code,
            metadata={
                'uta_status': 'calibrated',
                'calibrated_weights': dict(zip([a.name for a in attrs], weights)),
            },
        )


class WeightedSumCalculationMethod(CalculationMethod):
    """Promedio ponderado simple sobre hojas: S = Σ xi·wi / Σ wi."""

    code = 'WEIGHTED_SUM'

    def evaluate(
        self,
        hierarchy: CriteriaHierarchy | dict[str, Any],
        alternatives_data: dict[str, dict[str, Any]],
        config: dict[str, Any] | None = None,
    ) -> CalculationResult:
        cfg = config or {}
        model = _ensure_hierarchy(hierarchy)
        attrs = _leaf_attributes(model)
        if not attrs:
            return CalculationResult(
                {},
                method=self.code,
                errors=['No hay atributos hoja para agregar.'],
            )

        normalize = cfg.get('normalize_weights', True)
        fallback = cfg.get('fallback_to_arithmetic_mean_when_zero_weights', True)
        scores: dict[str, float] = {}

        for alt_name, alt_data in alternatives_data.items():
            data = alt_data.get('values') or alt_data
            pairs: list[tuple[float, float]] = []
            for attr in attrs:
                default_val = (
                    attr.utility_function.threshold
                    if hasattr(attr.utility_function, 'threshold')
                    else 0.0
                )
                val = data.get(attr.name, default_val)
                u = float(attr.utility_function.evaluate(val))
                w = float(attr.local_weight or attr.global_weight or 1.0)
                pairs.append((u, w))
            scores[alt_name] = _weighted_sum_values(
                pairs,
                normalize_weights=normalize,
                fallback_to_mean=fallback,
            )

        return CalculationResult(scores, method=self.code)


METHOD_REGISTRY: dict[str, CalculationMethod] = {
    'MAVT': MAVTCalculationMethod(),
    'MAUT': MAUTCalculationMethod(),
    'UTA': UTACalculationMethod(),
    'WEIGHTED_SUM': WeightedSumCalculationMethod(),
}


def get_calculation_method(code: str) -> CalculationMethod:
    method = (code or 'MAVT').strip().upper()
    if method not in METHOD_REGISTRY:
        raise ValueError(f'Método de cálculo no soportado: {code}')
    return METHOD_REGISTRY[method]

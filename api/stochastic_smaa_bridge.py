"""Puente MDCM: resultado de simulación → motor SMAA (guía Joan)."""
from __future__ import annotations

from typing import Any

import numpy as np

from .stochastic_smaa_engine import (
    AnalysisConfig,
    DirectionalVectorNormalizer,
    MacroDecisionData,
    MacroOnlyScenario,
    SamplingConfig,
    SequentialSensitivityEngine,
    SimplexWeightSampler,
    StoppingConfig,
    WeightConstraints,
    build_aggregator,
)

ALT_COLORS = [
    '#1F4E79', '#A64B2A', '#2E6F40', '#6C4A8C', '#B7791F',
    '#9B2C2C', '#2B6CB0', '#276749', '#744210', '#553C9A',
]


class PassthroughNormalizer:
    """Cuando la matriz del cálculo ya viene normalizada/orientada a beneficio."""

    def transform(self, matrix, directions):  # noqa: ARG002
        arr = np.asarray(matrix, dtype=float)
        if arr.ndim == 2:
            return arr
        if arr.ndim == 3:
            return arr
        raise ValueError('Matriz con rangos no soportados.')


def _json_float(val: Any) -> Any:
    """Convierte a float JSON-safe; nan/inf → None (DRF usa allow_nan=False)."""
    if val is None:
        return None
    try:
        if isinstance(val, (bool, np.bool_)):
            return bool(val)
        num = float(val)
    except (TypeError, ValueError):
        return val
    if not np.isfinite(num):
        return None
    return num


def _df_records(df) -> list[dict[str, Any]]:
    out = []
    for idx, row in df.iterrows():
        item = {'id': str(idx)}
        for col, val in row.items():
            item[str(col)] = _json_float(val)
        out.append(item)
    return out


def _series_map(series) -> dict[str, float]:
    out: dict[str, float] = {}
    for k, v in series.items():
        num = _json_float(v)
        if isinstance(num, float):
            out[str(k)] = num
    return out


def _matrix_nested(df) -> dict[str, Any]:
    return {
        'index': [str(i) for i in df.index],
        'columns': [str(c) for c in df.columns],
        'values': [
            [_json_float(v) for v in row]
            for row in df.to_numpy(dtype=float)
        ],
    }


def serialize_simulation_result(result, *, concentration: float, aggregation: str) -> dict[str, Any]:
    alts = list(result.alternatives)
    colors = {alt: ALT_COLORS[i % len(ALT_COLORS)] for i, alt in enumerate(alts)}
    ra = result.rank_acceptability()
    first = result.first_place_probability()
    expected = result.expected_rank()
    scores = result.score_summary()
    regret = result.regret_summary()
    dashboard = result.robustness_dashboard()
    pairwise = result.pairwise_preference_probability()
    stability = result.ordinal_stability()

    alternatives_out = []
    for alt in alts:
        rank_freq = [float(ra.loc[alt, f'Rango {r}']) for r in range(1, len(alts) + 1)]
        p1 = float(first.loc[alt])
        alternatives_out.append({
            'name': alt,
            'color': colors[alt],
            'win_probability': round(p1, 6),
            'win_probability_pct': round(100.0 * p1, 2),
            'rank_frequency': [round(f, 6) for f in rank_freq],
            'rank_frequency_pct': [round(100.0 * f, 2) for f in rank_freq],
            'score_mean': round(float(scores.loc[alt, 'media']), 6),
            'score_std': round(float(scores.loc[alt, 'desviación']), 6),
            'baseline_rank': int(result.nominal_ranks[alts.index(alt)]),
            'baseline_score': round(float(result.nominal_scores[alts.index(alt)]), 6),
            'expected_rank': round(float(expected.loc[alt, 'media']), 4),
            'ordinal_stability': round(float(stability.loc[alt]), 6),
        })
    alternatives_out.sort(
        key=lambda x: (-x['win_probability'], x['baseline_rank'], -x['score_mean']),
    )

    # Mapa ternario (solo si hay 3 criterios): ganador por muestra de pesos.
    ternary = None
    if len(result.criteria) == 3:
        ranks = result.ranks
        winners_idx = np.argmin(ranks, axis=1)
        max_pts = min(2500, ranks.shape[0])
        step = max(1, ranks.shape[0] // max_pts)
        pts = []
        for s in range(0, ranks.shape[0], step):
            w = result.macro_weights[s]
            wi = int(winners_idx[s])
            pts.append({
                'w0': round(float(w[0]), 5),
                'w1': round(float(w[1]), 5),
                'w2': round(float(w[2]), 5),
                'winner': alts[wi],
                'color': colors[alts[wi]],
            })
        ternary = {
            'criteria': list(result.criteria),
            'points': pts,
        }

    baseline_winner = alts[int(np.argmin(result.nominal_ranks))]
    p1_map = _series_map(first)
    same = float(p1_map.get(baseline_winner, 0.0))

    return {
        'ok': True,
        'tipo': 'sensibilidad_estocastica_smaa',
        'nivel': 'macro',
        'guia': 'Joan 03_2 — SMAA / sensibilidad y robustez (enfoque macro)',
        'aggregation': aggregation,
        'dimensions': list(result.criteria),
        'alternatives': alternatives_out,
        'muestras': result.n_iterations,
        'concentracion': round(float(concentration), 4),
        'stop_reason': result.stop_reason,
        'sampling_method': result.sampling_method,
        'baseline_winner': baseline_winner,
        'estabilidad_ganador': round(same, 6),
        'estabilidad_ganador_pct': round(100.0 * same, 2),
        'rank_acceptability': _matrix_nested(ra),
        'first_place_probability': p1_map,
        'expected_rank': _df_records(expected),
        'score_summary': _df_records(scores),
        'regret_summary': _df_records(regret),
        'pairwise_preference': _matrix_nested(pairwise),
        'robustness_dashboard': _df_records(dashboard),
        'convergence': _df_records(result.convergence) if result.convergence is not None else [],
        'ternary_winner_map': ternary,
        'pesos_base': {
            result.criteria[j]: round(float(result.macro_weights[0, j]), 6)
            for j in range(len(result.criteria))
        },
        'descripcion': (
            f'Sensibilidad estocástica SMAA-macro ({result.n_iterations} iteraciones, '
            f'agregación {aggregation}) según la guía metodológica de robustez.'
        ),
    }


def run_smaa_macro(
    *,
    alternatives: list[str],
    criteria: list[str],
    matrix: list[list[float]],
    directions: list[str],
    nominal_weights: list[float],
    muestras: int = 2048,
    concentracion: float = 40.0,
    seed: int = 42,
    aggregation: str = 'additive',
    matrix_already_normalized: bool = True,
) -> dict[str, Any]:
    """Ejecuta escenario exclusivamente macro del notebook Joan."""
    alts = tuple(str(a) for a in alternatives)
    crit = tuple(str(c) for c in criteria)
    w = np.asarray(nominal_weights, dtype=float)
    if w.sum() <= 0:
        raise ValueError('Pesos nominales inválidos.')
    w = w / w.sum()
    # Dirichlet exige pesos > 0.
    w = np.maximum(w, 1e-6)
    w = w / w.sum()

    dir_map = []
    for d in directions:
        dl = str(d).strip().lower()
        if dl in ('min', 'minimize', 'cost', 'costo', 'menor'):
            dir_map.append('cost')
        else:
            dir_map.append('benefit')
    if matrix_already_normalized:
        # Matriz del pipeline ya en escala beneficio → no reorientar/renormalizar.
        dir_map = ['benefit'] * len(crit)

    data = MacroDecisionData(
        alternatives=alts,
        criteria=crit,
        matrix=np.asarray(matrix, dtype=float),
        directions=tuple(dir_map),  # type: ignore[arg-type]
        nominal_weights=w,
    )

    analysis = AnalysisConfig(
        aggregation='topsis' if aggregation == 'topsis' else 'additive',
        tie_tolerance=1e-12,
        admissibility_threshold=None,
    )
    analysis.validate()

    # Límites web-friendly; muestras del usuario = max_iterations.
    max_n = int(max(256, min(16384, muestras)))
    min_n = int(min(max_n, max(128, max_n // 4)))
    batch = int(max(64, min(1024, max_n // 8)))
    stopping = StoppingConfig(
        min_iterations=min_n,
        max_iterations=max_n,
        batch_size=batch,
        patience=2,
        rank_tolerance=0.01,
        quantile_tolerance=0.01,
        ci_half_width_tolerance=0.02,
        confidence=0.95,
    )

    sampling = SamplingConfig(
        method='mc',
        nominal_weights=w,
        concentration=float(concentracion),
        constraints=WeightConstraints(),
        seed=int(seed),
    )

    normalizer = PassthroughNormalizer() if matrix_already_normalized else DirectionalVectorNormalizer()
    scenario = MacroOnlyScenario(
        data=data,
        normalizer=normalizer,  # type: ignore[arg-type]
        aggregator=build_aggregator(analysis.aggregation),
        macro_sampler=SimplexWeightSampler(len(crit), sampling),
        tie_tolerance=analysis.tie_tolerance,
    )
    engine = SequentialSensitivityEngine(
        scenario=scenario,
        stopping=stopping,
        sampling_method=sampling.method,
        admissibility_threshold=analysis.admissibility_threshold,
    )
    result = engine.run()
    payload = serialize_simulation_result(
        result,
        concentration=float(concentracion),
        aggregation=analysis.aggregation,
    )
    payload['pesos_base'] = {crit[j]: round(float(w[j]), 6) for j in range(len(crit))}
    payload['seed'] = int(seed)
    return payload

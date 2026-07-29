"""Puente MDCM: resultado de simulación → motor SMAA (guía Joan 03_2)."""
from __future__ import annotations

from typing import Any, Sequence

import numpy as np

from .stochastic_smaa_engine import (
    AnalysisConfig,
    DirectionalVectorNormalizer,
    MacroDecisionData,
    MacroMesoDecisionData,
    MacroMesoScenario,
    MacroOnlyScenario,
    SamplingConfig,
    SamplingMethod,
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
        if arr.ndim in (2, 3):
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


def _map_directions(directions: Sequence[str], n: int, *, force_benefit: bool) -> list[str]:
    if force_benefit:
        return ['benefit'] * n
    out = []
    for d in directions:
        dl = str(d).strip().lower()
        if dl in ('min', 'minimize', 'cost', 'costo', 'menor'):
            out.append('cost')
        else:
            out.append('benefit')
    if len(out) != n:
        return ['benefit'] * n
    return out


def _normalize_weights(weights: Sequence[float], n: int) -> np.ndarray:
    w = np.asarray(weights, dtype=float)
    if w.shape != (n,) or w.sum() <= 0:
        raise ValueError('Pesos nominales inválidos.')
    w = w / w.sum()
    w = np.maximum(w, 1e-6)
    return w / w.sum()


def kendall_tau_distribution(ranks: np.ndarray, nominal_ranks: np.ndarray) -> dict[str, Any]:
    """τ de Kendall vs ranking nominal (notebook Joan, SensitivityPlots.kendall_distribution)."""
    m = ranks.shape[1]
    if m < 2:
        return {'mean': 1.0, 'values_sample': [1.0], 'histogram': {'bins': [], 'counts': []}}
    pair_i, pair_j = np.triu_indices(m, k=1)
    nominal_sign = np.sign(nominal_ranks[pair_i] - nominal_ranks[pair_j])
    simulated_sign = np.sign(ranks[:, pair_i] - ranks[:, pair_j])
    discordant = np.sum(simulated_sign != nominal_sign[None, :], axis=1)
    tau_values = 1.0 - 4.0 * discordant / (m * (m - 1))
    counts, edges = np.histogram(tau_values, bins=np.linspace(-1.0, 1.0, 31))
    # Submuestreo para UI
    step = max(1, len(tau_values) // 800)
    sample = [round(float(v), 5) for v in tau_values[::step]]
    return {
        'mean': round(float(np.mean(tau_values)), 6),
        'median': round(float(np.median(tau_values)), 6),
        'q05': round(float(np.quantile(tau_values, 0.05)), 6),
        'q95': round(float(np.quantile(tau_values, 0.95)), 6),
        'values_sample': sample,
        'histogram': {
            'bins': [round(float(x), 4) for x in edges.tolist()],
            'counts': [int(c) for c in counts.tolist()],
        },
    }


def simplex_grid_3(resolution: int = 24) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Malla triangular de pesos (w0,w1,w2) y coordenadas baricéntricas 2D."""
    resolution = int(max(8, min(40, resolution)))
    weights: list[tuple[float, float, float]] = []
    for i in range(resolution + 1):
        w0 = i / resolution
        for j in range(resolution + 1 - i):
            w1 = j / resolution
            w2 = 1.0 - w0 - w1
            weights.append((w0, w1, w2))
    matrix = np.asarray(weights, dtype=float)
    x = matrix[:, 1] + 0.5 * matrix[:, 2]
    y = (np.sqrt(3.0) / 2.0) * matrix[:, 2]
    return matrix, x, y


def _macro_surfaces(
    *,
    normalized_matrix: np.ndarray,
    aggregator,
    alternatives: Sequence[str],
    criteria: Sequence[str],
    target: str,
    rival: str | None,
    resolution: int = 24,
) -> dict[str, Any]:
    """Superficies 3D del PDF (§13.12) serializadas para Plotly."""
    if len(criteria) != 3:
        return {}
    weights, x, y = simplex_grid_3(resolution)
    scores = aggregator.score(normalized_matrix, weights)
    alts = list(alternatives)
    i_t = alts.index(target) if target in alts else 0
    if rival and rival in alts and rival != target:
        i_r = alts.index(rival)
    else:
        # Principal competidora: mayor score medio en la malla excepto target.
        means = scores.mean(axis=0)
        order = np.argsort(-means)
        i_r = int(order[0]) if int(order[0]) != i_t else int(order[1] if len(order) > 1 else 0)

    target_scores = scores[:, i_t]
    rival_scores = scores[:, i_r]
    margin = target_scores - rival_scores
    best = scores.max(axis=1)
    regret = best - target_scores
    victory = target_scores - np.partition(scores, -2, axis=1)[:, -2]

    def pack(z: np.ndarray) -> dict[str, Any]:
        return {
            'x': [round(float(v), 5) for v in x],
            'y': [round(float(v), 5) for v in y],
            'z': [round(float(v), 6) for v in z],
            'w': [
                [round(float(a), 5), round(float(b), 5), round(float(c), 5)]
                for a, b, c in weights
            ],
        }

    return {
        'criteria': list(criteria),
        'target': alts[i_t],
        'rival': alts[i_r],
        'score': pack(target_scores),
        'pairwise_margin': pack(margin),
        'victory_margin': pack(victory),
        'regret': pack(regret),
    }


def serialize_simulation_result(
    result,
    *,
    concentration: float,
    aggregation: str,
    nivel: str = 'macro',
    scenario=None,
    surface_resolution: int = 24,
) -> dict[str, Any]:
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
    kendall = kendall_tau_distribution(result.ranks, result.nominal_ranks)

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

    ternary = None
    if len(result.criteria) == 3:
        winners_idx = np.argmin(result.ranks, axis=1)
        max_pts = min(2500, result.ranks.shape[0])
        step = max(1, result.ranks.shape[0] // max_pts)
        pts = []
        for s in range(0, result.ranks.shape[0], step):
            w = result.macro_weights[s]
            wi = int(winners_idx[s])
            pts.append({
                'w0': round(float(w[0]), 5),
                'w1': round(float(w[1]), 5),
                'w2': round(float(w[2]), 5),
                'x': round(float(w[1] + 0.5 * w[2]), 5),
                'y': round(float((np.sqrt(3.0) / 2.0) * w[2]), 5),
                'winner': alts[wi],
                'color': colors[alts[wi]],
            })
        ternary = {'criteria': list(result.criteria), 'points': pts}

    baseline_winner = alts[int(np.argmin(result.nominal_ranks))]
    p1_map = _series_map(first)
    same = float(p1_map.get(baseline_winner, 0.0))
    recommended = alternatives_out[0]['name'] if alternatives_out else baseline_winner

    conditional = None
    try:
        conditional = {
            'alternative': recommended,
            'rows': _df_records(result.conditional_weight_summary(recommended)),
        }
    except (KeyError, ValueError):
        conditional = None

    conditional_meso = None
    if result.meso_weights is not None:
        try:
            idx = alts.index(recommended)
            mask = result.ranks[:, idx] == 1
            if np.any(mask):
                selected = result.meso_weights[mask]
                labels = ('λ₁', 'λ₂')
                rows = []
                for j, lab in enumerate(labels):
                    col = selected[:, j]
                    rows.append({
                        'id': lab,
                        'media': _json_float(col.mean()),
                        'q05': _json_float(np.quantile(col, 0.05)),
                        'mediana': _json_float(np.quantile(col, 0.50)),
                        'q95': _json_float(np.quantile(col, 0.95)),
                    })
                conditional_meso = {'alternative': recommended, 'rows': rows}
        except (ValueError, IndexError):
            conditional_meso = None

    surfaces = {}
    if scenario is not None and len(result.criteria) == 3:
        rival = alternatives_out[1]['name'] if len(alternatives_out) > 1 else None
        try:
            if hasattr(scenario, 'normalized_matrix'):
                norm_mat = scenario.normalized_matrix
            else:
                # Meso–macro: usar matriz nominal (OMOE con λ de referencia).
                meso = np.asarray(scenario.data.nominal_meso_weights, dtype=float)[None, :]
                matrices, _ = scenario._raw_matrices(meso)
                norm_mat = scenario.normalizer.transform(matrices, scenario.data.directions)[0]
            surfaces = _macro_surfaces(
                normalized_matrix=norm_mat,
                aggregator=scenario.aggregator,
                alternatives=alts,
                criteria=result.criteria,
                target=recommended,
                rival=rival,
                resolution=surface_resolution,
            )
        except Exception:  # noqa: BLE001 — superficies opcionales
            surfaces = {}

    # Convergencia P(1.º) por alternativa a lo largo de los lotes (aprox. con prefijos).
    conv_p1 = []
    if result.convergence is not None and len(result.convergence):
        # Recomputar con pasos de batch a partir de rangos acumulados.
        n_total = result.n_iterations
        steps = sorted({
            int(v)
            for v in result.convergence.get('Iteraciones', result.convergence.iloc[:, 0]).tolist()
            if v is not None and np.isfinite(float(v))
        })
        for n in steps:
            n = int(min(n, n_total))
            if n < 1:
                continue
            pref = result.ranks[:n]
            p1s = {
                alts[i]: round(float(np.mean(pref[:, i] == 1)), 6)
                for i in range(len(alts))
            }
            conv_p1.append({'iterations': n, 'p_first': p1s})

    omoe_dist = None
    if result.raw_omoe is not None:
        omoe = np.asarray(result.raw_omoe, dtype=float)
        omoe_dist = {
            'index': alts,
            'mean': [_json_float(v) for v in omoe.mean(axis=0)],
            'q05': [_json_float(v) for v in np.quantile(omoe, 0.05, axis=0)],
            'q95': [_json_float(v) for v in np.quantile(omoe, 0.95, axis=0)],
        }

    return {
        'ok': True,
        'tipo': 'sensibilidad_estocastica_smaa',
        'nivel': nivel,
        'guia': (
            'Joan 03_2 — SMAA / sensibilidad y robustez '
            f'({"meso–macro" if nivel == "meso_macro" else "enfoque macro"})'
        ),
        'aggregation': aggregation,
        'dimensions': list(result.criteria),
        'alternatives': alternatives_out,
        'muestras': result.n_iterations,
        'concentracion': round(float(concentration), 4),
        'stop_reason': result.stop_reason,
        'sampling_method': result.sampling_method,
        'admissibility_threshold': (
            None
            if result.admissibility_threshold is None
            else round(float(result.admissibility_threshold), 6)
        ),
        'baseline_winner': baseline_winner,
        'recommended_alternative': recommended,
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
        'convergence_p1': conv_p1,
        'ternary_winner_map': ternary,
        'kendall_tau': kendall,
        'conditional_macro_weights': conditional,
        'conditional_meso_weights': conditional_meso,
        'surfaces_3d': surfaces,
        'omoe_derived_distribution': omoe_dist,
        'pesos_base': {},
        'descripcion': (
            f'Sensibilidad estocástica SMAA-{nivel} ({result.n_iterations} iteraciones, '
            f'agregación {aggregation}) según la guía metodológica de robustez.'
        ),
    }


def _build_stopping(muestras: int) -> StoppingConfig:
    max_n = int(max(256, min(16384, muestras)))
    min_n = int(min(max_n, max(128, max_n // 4)))
    batch = int(max(64, min(1024, max_n // 8)))
    return StoppingConfig(
        min_iterations=min_n,
        max_iterations=max_n,
        batch_size=batch,
        patience=2,
        rank_tolerance=0.01,
        quantile_tolerance=0.01,
        ci_half_width_tolerance=0.02,
        confidence=0.95,
    )


def _resolve_sampling_method(method: str | None) -> SamplingMethod:
    m = (method or 'mc').strip().lower()
    if m in ('lhs', 'sobol', 'mc'):
        return m  # type: ignore[return-value]
    return 'mc'


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
    sampling_method: str = 'mc',
    admissibility_threshold: float | None = None,
    surface_resolution: int = 24,
) -> dict[str, Any]:
    """Ejecuta escenario exclusivamente macro del notebook Joan."""
    alts = tuple(str(a) for a in alternatives)
    crit = tuple(str(c) for c in criteria)
    w = _normalize_weights(nominal_weights, len(crit))
    dir_map = _map_directions(directions, len(crit), force_benefit=matrix_already_normalized)

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
        admissibility_threshold=admissibility_threshold,
    )
    analysis.validate()

    method = _resolve_sampling_method(sampling_method)
    sampling = SamplingConfig(
        method=method,
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
        stopping=_build_stopping(muestras),
        sampling_method=sampling.method,
        admissibility_threshold=analysis.admissibility_threshold,
    )
    result = engine.run()
    payload = serialize_simulation_result(
        result,
        concentration=float(concentracion),
        aggregation=analysis.aggregation,
        nivel='macro',
        scenario=scenario,
        surface_resolution=surface_resolution,
    )
    payload['pesos_base'] = {crit[j]: round(float(w[j]), 6) for j in range(len(crit))}
    payload['seed'] = int(seed)
    return payload


def run_smaa_meso_macro(
    *,
    alternatives: list[str],
    omoc: list[float],
    omor: list[float],
    omoe_contexts: list[list[float]],
    directions: list[str] | None = None,
    nominal_macro_weights: list[float],
    nominal_meso_weights: list[float],
    muestras: int = 2048,
    concentracion: float = 40.0,
    concentracion_meso: float | None = None,
    seed: int = 42,
    aggregation: str = 'additive',
    sampling_method: str = 'mc',
    admissibility_threshold: float | None = None,
    surface_resolution: int = 24,
    context_labels: list[str] | None = None,
) -> dict[str, Any]:
    """Escenario meso–macro Joan: OMOE = λ·z contextual; OMOC/OMOR fijos."""
    alts = tuple(str(a) for a in alternatives)
    crit = ('OMOC', 'OMOE', 'OMOR')
    w_macro = _normalize_weights(nominal_macro_weights, 3)
    w_meso = _normalize_weights(nominal_meso_weights, 2)
    dirs = directions or ['cost', 'benefit', 'cost']
    dir_map = _map_directions(dirs, 3, force_benefit=False)

    data = MacroMesoDecisionData(
        alternatives=alts,
        criteria=crit,
        omoc=np.asarray(omoc, dtype=float),
        omor=np.asarray(omor, dtype=float),
        omoe_contexts=np.asarray(omoe_contexts, dtype=float),
        directions=tuple(dir_map),  # type: ignore[arg-type]
        nominal_macro_weights=w_macro,
        nominal_meso_weights=w_meso,
    )

    analysis = AnalysisConfig(
        aggregation='topsis' if aggregation == 'topsis' else 'additive',
        tie_tolerance=1e-12,
        admissibility_threshold=admissibility_threshold,
    )
    analysis.validate()

    method = _resolve_sampling_method(sampling_method)
    kappa_m = float(concentracion_meso if concentracion_meso is not None else concentracion)
    macro_sampling = SamplingConfig(
        method=method,
        nominal_weights=w_macro,
        concentration=float(concentracion),
        constraints=WeightConstraints(),
        seed=int(seed),
    )
    meso_sampling = SamplingConfig(
        method=method,
        nominal_weights=w_meso,
        concentration=kappa_m,
        constraints=WeightConstraints(),
        seed=int(seed) + 17,
    )

    scenario = MacroMesoScenario(
        data=data,
        normalizer=DirectionalVectorNormalizer(),
        aggregator=build_aggregator(analysis.aggregation),
        macro_sampler=SimplexWeightSampler(3, macro_sampling),
        meso_sampler=SimplexWeightSampler(2, meso_sampling),
        tie_tolerance=analysis.tie_tolerance,
    )
    engine = SequentialSensitivityEngine(
        scenario=scenario,
        stopping=_build_stopping(muestras),
        sampling_method=method,
        admissibility_threshold=analysis.admissibility_threshold,
    )
    result = engine.run()
    payload = serialize_simulation_result(
        result,
        concentration=float(concentracion),
        aggregation=analysis.aggregation,
        nivel='meso_macro',
        scenario=scenario,
        surface_resolution=surface_resolution,
    )
    payload['pesos_base'] = {crit[j]: round(float(w_macro[j]), 6) for j in range(3)}
    payload['pesos_meso_base'] = {
        (context_labels[j] if context_labels and j < len(context_labels) else f'contexto_{j + 1}'):
        round(float(w_meso[j]), 6)
        for j in range(2)
    }
    payload['omoe_context_labels'] = context_labels or ['contexto_1', 'contexto_2']
    payload['seed'] = int(seed)
    payload['concentracion_meso'] = round(kappa_m, 4)
    return payload

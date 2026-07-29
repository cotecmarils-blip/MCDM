"""
Sensibilidad de pesos entre dimensiones sobre un cálculo guardado (sin AHP).

Reutiliza la matriz normalizada y el método MADM del resultado; varía el peso de
una dimensión redistribuyendo el resto proporcionalmente (estilo Expert Choice).
"""
from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError

from .madm_pipeline import _matrix_orientation_for_method
from .madm_ranker import MADMRanker, WeightMethod

ALT_COLORS = [
    '#1f4ed8', '#e3342f', '#38a169', '#8b4513', '#d69e2e',
    '#7c3aed', '#0891b2', '#be185d', '#4b5563', '#ea580c',
]

WEIGHT_TOLERANCE = 1e-9
DEFAULT_STEPS = 21
MAX_STEPS = 101
DEFAULT_STOCHASTIC_SAMPLES = 2048
MAX_STOCHASTIC_SAMPLES = 16384
DEFAULT_STOCHASTIC_CONCENTRATION = 40.0
MIN_STOCHASTIC_CONCENTRATION = 2.0
MAX_STOCHASTIC_CONCENTRATION = 500.0


def _madm_label(metodo: str | None) -> str:
    return (metodo or 'madm').strip().upper()


def _dimension_catalog(resultado: dict[str, Any]) -> list[dict[str, Any]]:
    seen: set[int] = set()
    items: list[dict[str, Any]] = []
    for alt in resultado.get('alternativas') or []:
        for dim in alt.get('dimensiones') or []:
            omoe_id = dim.get('omoe_id')
            if omoe_id is None or omoe_id in seen:
                continue
            seen.add(omoe_id)
            items.append({
                'omoe_id': omoe_id,
                'nombre': dim.get('omoe_nombre') or f'Dimensión #{omoe_id}',
                'rama': dim.get('rama_evaluacion'),
            })
    return items


def _resolve_dimension_index(
    dimensions: list[str],
    catalog: list[dict[str, Any]],
    dimension: str | int | None,
) -> int:
    if dimension is None or dimension == '':
        raise ValidationError('Indique la dimensión a analizar.')

    if isinstance(dimension, int) or str(dimension).isdigit():
        omoe_id = int(dimension)
        for item in catalog:
            if item['omoe_id'] == omoe_id:
                nombre = item['nombre']
                if nombre in dimensions:
                    return dimensions.index(nombre)
        raise ValidationError(f'La dimensión id={omoe_id} no está en la matriz del cálculo.')

    name = str(dimension).strip()
    if name in dimensions:
        return dimensions.index(name)
    for item in catalog:
        if item['nombre'] == name and name in dimensions:
            return dimensions.index(name)
    raise ValidationError(f'La dimensión «{name}» no está en la matriz del cálculo.')


def _ensure_fraction_weights(weights: list[float]) -> list[float]:
    if not weights:
        return weights
    w = [float(x) for x in weights]
    if max(w) > 1.0 + WEIGHT_TOLERANCE:
        w = [x / 100.0 for x in w]
    total = sum(w)
    if total > WEIGHT_TOLERANCE and abs(total - 1.0) > WEIGHT_TOLERANCE:
        w = [x / total for x in w]
    return w


def _baseline_weights(resultado: dict[str, Any], dimensions: list[str]) -> list[float]:
    pesos = resultado.get('pesos') or {}
    raw = pesos.get('weights')
    if isinstance(raw, list) and len(raw) == len(dimensions):
        return _ensure_fraction_weights([float(v) for v in raw])

    by_dim = pesos.get('weights_by_dimension') or {}
    if by_dim:
        w = [float(by_dim.get(dim, 0.0)) for dim in dimensions]
        return _ensure_fraction_weights(w)

    madm_weights = (resultado.get('madm') or {}).get('weights')
    if isinstance(madm_weights, list) and len(madm_weights) == len(dimensions):
        return _ensure_fraction_weights([float(v) for v in madm_weights])

    n = len(dimensions)
    return [1.0 / n] * n if n else []


def redistribute_weights(
    base: list[float],
    changed_idx: int,
    new_weight: float,
) -> list[float]:
    n = len(base)
    if n == 0:
        return []
    if not 0 <= changed_idx < n:
        raise ValidationError('Índice de dimensión inválido.')

    clamped = max(0.0, min(1.0, float(new_weight)))
    others = [i for i in range(n) if i != changed_idx]
    old_other_sum = sum(base[i] for i in others)
    result = [0.0] * n
    result[changed_idx] = clamped
    new_other_sum = 1.0 - clamped

    if not others:
        return result

    if old_other_sum <= WEIGHT_TOLERANCE:
        share = new_other_sum / len(others)
        for i in others:
            result[i] = share
    else:
        for i in others:
            result[i] = new_other_sum * (base[i] / old_other_sum)
    return result


def _find_crossovers(
    sweep: list[dict[str, Any]],
    alternatives: list[str],
) -> list[dict[str, Any]]:
    crossovers: list[dict[str, Any]] = []
    if len(sweep) < 2:
        return crossovers

    for i in range(1, len(sweep)):
        prev_best = sweep[i - 1].get('best_alternative')
        curr_best = sweep[i].get('best_alternative')
        if prev_best and curr_best and prev_best != curr_best:
            crossovers.append({
                'peso_dimension_pct': sweep[i]['peso_dimension_pct'],
                'de': prev_best,
                'a': curr_best,
            })
    return crossovers


def _resolve_alternatives(resultado: dict[str, Any], norm: dict[str, Any], matrix: list) -> list[str]:
    alts = list(norm.get('pareto_alternatives') or [])
    if alts:
        return alts

    from_resultado = [
        a['nombre']
        for a in (resultado.get('alternativas') or [])
        if a.get('nombre') and not a.get('excluida_pareto')
    ]
    if from_resultado:
        if matrix and len(from_resultado) == len(matrix):
            return from_resultado
        if not matrix:
            return from_resultado
    return from_resultado


def _resolve_directions(
    resultado: dict[str, Any],
    norm: dict[str, Any],
    dimensions: list[str],
) -> list[str]:
    directions = list(norm.get('directions') or [])
    if len(directions) == len(dimensions):
        return directions

    opciones = resultado.get('opciones_calculo') or {}
    raw = opciones.get('direcciones')
    if isinstance(raw, dict):
        catalog = {c['nombre']: c for c in _dimension_catalog(resultado)}
        resolved = []
        for dim in dimensions:
            meta = catalog.get(dim) or next(
                (c for c in catalog.values() if c['nombre'] == dim),
                None,
            )
            omoe_id = meta['omoe_id'] if meta else None
            default = 'min' if (meta or {}).get('rama') in ('omoc', 'omor') else 'max'
            val = raw.get(str(omoe_id)) or raw.get(omoe_id) or raw.get(dim) or default
            resolved.append(str(val).lower())
        if len(resolved) == len(dimensions):
            return resolved

    return ['min' if 'omoc' in dim.lower() or 'omor' in dim.lower() else 'max' for dim in dimensions]


def _metodo_madm_from_resultado(resultado: dict[str, Any]) -> str | None:
    opciones = resultado.get('opciones_calculo') or {}
    return opciones.get('metodo_madm') or (resultado.get('madm') or {}).get('method')


def validate_sensibilidad_resultado(resultado: dict[str, Any]) -> str | None:
    if resultado is None:
        return 'No hay resultado de cálculo.'
    if resultado.get('ok') is False:
        return 'El cálculo no se completó correctamente.'

    norm = resultado.get('normalizacion') or {}
    matrix = norm.get('normalized_matrix') or []
    dimensions = norm.get('dimensions') or []
    alternatives = _resolve_alternatives(resultado, norm, matrix)

    if len(dimensions) < 2:
        return 'Se requieren al menos 2 dimensiones para sensibilidad de pesos.'
    if len(alternatives) < 1:
        return 'No hay alternativas activas en el cálculo.'
    if not matrix:
        return 'La matriz normalizada del cálculo no está disponible. Vuelva a ejecutar el cálculo.'
    if len(matrix) != len(alternatives):
        return (
            f'La matriz normalizada ({len(matrix)} filas) no coincide con las '
            f'alternativas activas ({len(alternatives)}).'
        )
    if any(len(row) != len(dimensions) for row in matrix):
        return 'La matriz normalizada no coincide con las dimensiones del cálculo.'

    if not _metodo_madm_from_resultado(resultado):
        return 'El cálculo no registra el método MADM usado.'

    return None


def _build_ranker_context(resultado: dict[str, Any]) -> dict[str, Any]:
    norm = resultado['normalizacion']
    matrix = norm['normalized_matrix']
    dimensions = list(norm['dimensions'])
    alternatives = _resolve_alternatives(resultado, norm, matrix)
    directions = _resolve_directions(resultado, norm, dimensions)
    opciones = resultado.get('opciones_calculo') or {}
    norm_method = opciones.get('normalizacion_metodo') or 'directional_minmax'
    metodo_madm = _metodo_madm_from_resultado(resultado)
    ranker = MADMRanker(
        matrix,
        alternatives=alternatives,
        dimensions=dimensions,
        directions=directions,
        matrix_orientation=_matrix_orientation_for_method(norm_method),
    )
    return {
        'ranker': ranker,
        'matrix': matrix,
        'dimensions': dimensions,
        'alternatives': alternatives,
        'metodo_madm': metodo_madm,
        'metodo_pesos': (resultado.get('pesos') or {}).get('method') or opciones.get('metodo_pesos'),
        'catalog': _dimension_catalog(resultado),
    }


def _weights_list_from_dict(dimensions: list[str], weights_by_dimension: dict[str, float]) -> list[float]:
    if not weights_by_dimension:
        raise ValidationError('Indique los pesos por dimensión.')
    try:
        weights = [float(weights_by_dimension[dim]) for dim in dimensions]
    except KeyError as exc:
        missing = [d for d in dimensions if d not in weights_by_dimension]
        raise ValidationError(
            f'Faltan pesos para: {", ".join(missing[:3])}'
            f'{"…" if len(missing) > 3 else ""}.'
        ) from exc
    total = sum(weights)
    if total <= WEIGHT_TOLERANCE:
        raise ValidationError('Los pesos deben ser positivos.')
    if abs(total - 1.0) > 0.05:
        raise ValidationError(f'Los pesos deben sumar 1 (actual: {total:.4f}).')
    if abs(total - 1.0) > WEIGHT_TOLERANCE:
        weights = [w / total for w in weights]
    return weights


def _rank_at_weights(
    ctx: dict[str, Any],
    weights: list[float],
) -> dict[str, Any]:
    madm_result = ctx['ranker'].rank(
        ctx['metodo_madm'],
        weights=weights,
        weight_method=WeightMethod.USER_DEFINED,
    )
    madm_dict = madm_result.to_dict()
    ranked = madm_dict.get('ranked_alternatives') or []
    scores_map = madm_dict.get('scores_by_alternative') or {}
    ranking_map = madm_dict.get('ranking_by_alternative') or {}
    ranking_list = [
        {
            'name': name,
            'score': round(float(scores_map.get(name, 0)), 6),
            'rank': int(ranking_map.get(name, 0)),
            'color': ALT_COLORS[idx % len(ALT_COLORS)],
        }
        for idx, name in enumerate(ranked)
    ]
    if not ranking_list:
        alts = ctx['alternatives']
        ranking_list = sorted(
            [
                {
                    'name': alt,
                    'score': round(float(scores_map.get(alt, 0)), 6),
                    'rank': int(ranking_map.get(alt, 0)),
                    'color': ALT_COLORS[idx % len(ALT_COLORS)],
                }
                for idx, alt in enumerate(alts)
            ],
            key=lambda x: (x['rank'] or 999, -x['score']),
        )
    return {
        'scores': scores_map,
        'ranking': ranking_map,
        'ranking_list': ranking_list,
        'best_alternative': madm_dict.get('best_alternative'),
        'weights': [round(w, 6) for w in weights],
        'weights_by_dimension': {
            ctx['dimensions'][j]: round(weights[j], 6) for j in range(len(ctx['dimensions']))
        },
    }


def build_sensibilidad_model(resultado: dict[str, Any]) -> dict[str, Any]:
    error = validate_sensibilidad_resultado(resultado)
    if error:
        return {'ok': False, 'mensaje': error}

    ctx = _build_ranker_context(resultado)
    dimensions = ctx['dimensions']
    alternatives = ctx['alternatives']
    matrix = ctx['matrix']
    base_weights = _baseline_weights(resultado, dimensions)
    weights_dict = {dimensions[j]: round(base_weights[j], 6) for j in range(len(dimensions))}

    local_priorities: dict[str, dict[str, float]] = {}
    for i, alt in enumerate(alternatives):
        local_priorities[alt] = {
            dimensions[j]: round(float(matrix[i][j]), 6) for j in range(len(dimensions))
        }

    rank_payload = _rank_at_weights(ctx, base_weights)
    alt_payload = [
        {'name': alt, 'color': ALT_COLORS[idx % len(ALT_COLORS)]}
        for idx, alt in enumerate(alternatives)
    ]

    return {
        'ok': True,
        'tipo': 'modelo_sensibilidad_madm',
        'dimensions': dimensions,
        'alternatives': alt_payload,
        'local_priorities': local_priorities,
        'weights': weights_dict,
        'pesos_base': weights_dict,
        'metodo_madm': ctx['metodo_madm'],
        'metodo_madm_label': _madm_label(ctx['metodo_madm']),
        'metodo_pesos': ctx['metodo_pesos'],
        **rank_payload,
    }


def rank_sensibilidad_at_weights(
    resultado: dict[str, Any],
    weights_by_dimension: dict[str, float],
) -> dict[str, Any]:
    error = validate_sensibilidad_resultado(resultado)
    if error:
        return {'ok': False, 'mensaje': error}

    ctx = _build_ranker_context(resultado)
    weights = _weights_list_from_dict(ctx['dimensions'], weights_by_dimension)
    rank_payload = _rank_at_weights(ctx, weights)
    return {
        'ok': True,
        'metodo_madm_label': _madm_label(ctx['metodo_madm']),
        **rank_payload,
    }


def build_sensibilidad_from_resultado(
    resultado: dict[str, Any],
    *,
    dimension: str | int | None = None,
    pasos: int = DEFAULT_STEPS,
) -> dict[str, Any]:
    error = validate_sensibilidad_resultado(resultado)
    if error:
        return {'ok': False, 'mensaje': error}

    pasos = int(pasos)
    if pasos < 2:
        pasos = 2
    if pasos > MAX_STEPS:
        pasos = MAX_STEPS

    norm = resultado['normalizacion']
    matrix = norm['normalized_matrix']
    dimensions = list(norm['dimensions'])
    alternatives = _resolve_alternatives(resultado, norm, matrix)
    catalog = _dimension_catalog(resultado)
    metodo_pesos = (resultado.get('pesos') or {}).get('method') or (
        resultado.get('opciones_calculo') or {}
    ).get('metodo_pesos')

    dim_idx = _resolve_dimension_index(dimensions, catalog, dimension)
    dim_name = dimensions[dim_idx]
    base_weights = _baseline_weights(resultado, dimensions)

    ctx = _build_ranker_context(resultado)
    metodo_madm = ctx['metodo_madm']
    metodo_pesos = ctx['metodo_pesos']
    fracs = [i / (pasos - 1) for i in range(pasos)]
    sweep: list[dict[str, Any]] = []

    for frac in fracs:
        weights = redistribute_weights(base_weights, dim_idx, frac)
        rank_payload = _rank_at_weights(ctx, weights)
        sweep.append({
            'peso_dimension': round(frac, 6),
            'peso_dimension_pct': round(frac * 100, 2),
            'weights': rank_payload['weights'],
            'weights_by_dimension': rank_payload['weights_by_dimension'],
            'scores': rank_payload['scores'],
            'ranking': rank_payload['ranking'],
            'best_alternative': rank_payload['best_alternative'],
        })

    crossovers = _find_crossovers(sweep, alternatives)
    alt_payload = [
        {
            'name': alt,
            'color': ALT_COLORS[idx % len(ALT_COLORS)],
        }
        for idx, alt in enumerate(alternatives)
    ]

    baseline_scores = (resultado.get('madm') or {}).get('scores_by_alternative') or {}

    return {
        'ok': True,
        'tipo': 'pesos_dimension_madm',
        'dimension': dim_name,
        'dimension_index': dim_idx,
        'dimension_omoe_id': next(
            (c['omoe_id'] for c in catalog if c['nombre'] == dim_name),
            None,
        ),
        'dimensions': dimensions,
        'alternatives': alt_payload,
        'metodo_madm': metodo_madm,
        'metodo_madm_label': _madm_label(metodo_madm),
        'metodo_pesos': metodo_pesos,
        'pesos_base': {
            'weights': [round(w, 6) for w in base_weights],
            'weights_by_dimension': {
                dimensions[j]: round(base_weights[j], 6) for j in range(len(dimensions))
            },
            'peso_dimension_pct': round(base_weights[dim_idx] * 100, 2),
        },
        'baseline_scores': baseline_scores,
        'pasos': pasos,
        'sweep': sweep,
        'crossovers': crossovers,
        'descripcion': (
            f'Sensibilidad del peso de «{dim_name}» sobre el ranking '
            f'{_madm_label(metodo_madm)} (matriz normalizada del cálculo).'
        ),
    }


def list_sensibilidad_dimensiones(resultado: dict[str, Any]) -> list[dict[str, Any]]:
    error = validate_sensibilidad_resultado(resultado)
    if error:
        return []
    return _dimension_catalog(resultado)


def _score_for_alternative(rank_payload: dict[str, Any], alternative: str) -> float:
    scores = rank_payload.get('scores') or {}
    return float(scores.get(alternative, 0))


def build_tornado_from_resultado(
    resultado: dict[str, Any],
    *,
    alternative: str | None = None,
    weights_by_dimension: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Diagrama de tornado: score de una alternativa al variar cada peso 0% ↔ 100%."""
    error = validate_sensibilidad_resultado(resultado)
    if error:
        return {'ok': False, 'mensaje': error}

    ctx = _build_ranker_context(resultado)
    dimensions = ctx['dimensions']
    alternatives = ctx['alternatives']
    catalog = _dimension_catalog(resultado)
    if weights_by_dimension:
        base_weights = _weights_list_from_dict(dimensions, weights_by_dimension)
    else:
        base_weights = _baseline_weights(resultado, dimensions)

    baseline_rank = _rank_at_weights(ctx, base_weights)
    target_alt = (alternative or '').strip() or baseline_rank.get('best_alternative') or alternatives[0]
    if target_alt not in alternatives:
        return {'ok': False, 'mensaje': f'Alternativa «{target_alt}» no encontrada en el cálculo.'}

    baseline_score = round(_score_for_alternative(baseline_rank, target_alt), 6)
    bars: list[dict[str, Any]] = []

    for idx, dim_name in enumerate(dimensions):
        score_at_0 = _score_for_alternative(
            _rank_at_weights(ctx, redistribute_weights(base_weights, idx, 0.0)),
            target_alt,
        )
        score_at_1 = _score_for_alternative(
            _rank_at_weights(ctx, redistribute_weights(base_weights, idx, 1.0)),
            target_alt,
        )
        pessimistic = min(score_at_0, score_at_1)
        optimistic = max(score_at_0, score_at_1)
        bars.append({
            'dimension': dim_name,
            'omoe_id': next((c['omoe_id'] for c in catalog if c['nombre'] == dim_name), None),
            'score_at_weight_0': round(score_at_0, 6),
            'score_at_weight_1': round(score_at_1, 6),
            'pessimistic': round(pessimistic, 6),
            'optimistic': round(optimistic, 6),
            'swing': round(optimistic - pessimistic, 6),
        })

    bars.sort(key=lambda b: b['swing'], reverse=True)

    return {
        'ok': True,
        'tipo': 'tornado_pesos_madm',
        'alternative': target_alt,
        'baseline_score': baseline_score,
        'baseline_weights': {
            dimensions[j]: round(base_weights[j], 6) for j in range(len(dimensions))
        },
        'metodo_madm': ctx['metodo_madm'],
        'metodo_madm_label': _madm_label(ctx['metodo_madm']),
        'bars': bars,
        'descripcion': (
            f'Tornado del score {_madm_label(ctx["metodo_madm"])} de «{target_alt}» '
            f'al variar cada peso de dimensión entre 0% y 100%.'
        ),
    }


def _clamp_stochastic_params(muestras: int | None, concentracion: float | None) -> tuple[int, float]:
    n = int(muestras if muestras is not None else DEFAULT_STOCHASTIC_SAMPLES)
    n = max(50, min(MAX_STOCHASTIC_SAMPLES, n))
    kappa = float(
        concentracion if concentracion is not None else DEFAULT_STOCHASTIC_CONCENTRATION
    )
    kappa = max(MIN_STOCHASTIC_CONCENTRATION, min(MAX_STOCHASTIC_CONCENTRATION, kappa))
    return n, kappa


def _alt_dimension_map(resultado: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
    """alternativa → rama → dim dict."""
    out: dict[str, dict[str, dict[str, Any]]] = {}
    for alt in resultado.get('alternativas') or []:
        name = alt.get('nombre')
        if not name:
            continue
        by_rama: dict[str, dict[str, Any]] = {}
        for dim in alt.get('dimensiones') or []:
            rama = (dim.get('rama_evaluacion') or '').strip().lower()
            if rama:
                by_rama[rama] = dim
        out[str(name)] = by_rama
    return out


def extract_meso_macro_inputs(
    resultado: dict[str, Any],
) -> tuple[dict[str, Any] | None, str | None]:
    """Extrae inputs Joan meso–macro desde un resultado de simulación.

    Requiere dimensiones omoc, omoe y omor, y al menos dos valores
    contextuales OMOE en ``escenarios_resumen.por_escenario`` (modo selección).
    """
    catalog = _dimension_catalog(resultado)
    ramas = {((c.get('rama') or '').strip().lower()): c for c in catalog}
    for needed in ('omoc', 'omoe', 'omor'):
        if needed not in ramas:
            return None, (
                'El escenario meso–macro de la guía Joan requiere dimensiones '
                'OMOC, OMOE y OMOR (por rama_evaluacion). Falta: '
                f'{needed.upper()}.'
            )

    alt_map = _alt_dimension_map(resultado)
    if not alt_map:
        return None, 'No hay alternativas en el cálculo para meso–macro.'

    # Contexto labels / pesos meso desde la primera alternativa con resumen.
    context_rows: list[dict[str, Any]] = []
    for _name, by_rama in alt_map.items():
        omoe_dim = by_rama.get('omoe') or {}
        resumen = omoe_dim.get('escenarios_resumen') or (
            (omoe_dim.get('detalle') or {}).get('escenario_resumen')
        ) or {}
        por = list(resumen.get('por_escenario') or [])
        if len(por) >= 2:
            context_rows = por[:2]
            break

    if len(context_rows) < 2:
        return None, (
            'Para meso–macro hacen falta al menos dos escenarios OMOE con valor '
            'dimensional por contexto (z₁, z₂). En el PDF de Joan esos valores '
            'son inputs fijos por alternativa. En MDCM hoy solo aparecen en '
            'cálculos con agregación por selección de escenario '
            '(mínimo/máximo-mejor o peor caso), en '
            'dimensiones[].escenarios_resumen.por_escenario. '
            'Pendiente validar con Joan si, en modo compensatorio, debemos '
            'recalcular el árbol OMOE una vez por escenario al vuelo.'
        )

    alternatives: list[str] = []
    omoc_vals: list[float] = []
    omor_vals: list[float] = []
    omoe_ctx: list[list[float]] = []
    esc_ids = [row.get('escenario_id') for row in context_rows]

    for name, by_rama in alt_map.items():
        try:
            omoc_v = float((by_rama.get('omoc') or {}).get('valor'))
            omor_v = float((by_rama.get('omor') or {}).get('valor'))
        except (TypeError, ValueError):
            continue
        omoe_dim = by_rama.get('omoe') or {}
        resumen = omoe_dim.get('escenarios_resumen') or (
            (omoe_dim.get('detalle') or {}).get('escenario_resumen')
        ) or {}
        por = {
            row.get('escenario_id'): row
            for row in (resumen.get('por_escenario') or [])
        }
        zs: list[float] = []
        ok = True
        for eid in esc_ids:
            row = por.get(eid)
            if not row:
                ok = False
                break
            try:
                zs.append(float(row.get('valor')))
            except (TypeError, ValueError):
                ok = False
                break
        if not ok or len(zs) != 2:
            continue
        alternatives.append(name)
        omoc_vals.append(omoc_v)
        omor_vals.append(omor_v)
        omoe_ctx.append(zs)

    if len(alternatives) < 2:
        return None, (
            'No se pudieron alinear OMOC/OMOR y los dos contextos OMOE '
            'para al menos dos alternativas.'
        )

    labels = [
        str(context_rows[0].get('nombre') or 'contexto_1'),
        str(context_rows[1].get('nombre') or 'contexto_2'),
    ]
    # Pesos meso: si el resumen trae peso por escenario úselo; si no, iguales.
    meso_w = []
    for row in context_rows:
        pw = row.get('peso')
        try:
            meso_w.append(float(pw))
        except (TypeError, ValueError):
            meso_w.append(0.0)
    if sum(meso_w) <= WEIGHT_TOLERANCE:
        meso_w = [0.5, 0.5]
    else:
        s = sum(meso_w)
        meso_w = [x / s for x in meso_w]
        if max(meso_w) > 1.0 + WEIGHT_TOLERANCE:
            # vinieron en porcentaje
            meso_w = _ensure_fraction_weights(meso_w)

    # Pesos macro: remapeo por rama desde el catálogo / pesos del cálculo.
    dim_names_by_rama = {
        'omoc': ramas['omoc']['nombre'],
        'omoe': ramas['omoe']['nombre'],
        'omor': ramas['omor']['nombre'],
    }
    ordered_names = [dim_names_by_rama[r] for r in ('omoc', 'omoe', 'omor')]
    # Usar dimensiones presentes en normalizacion si coinciden.
    all_dims = (resultado.get('normalizacion') or {}).get('dimensions') or [
        c['nombre'] for c in catalog
    ]
    base = _baseline_weights(resultado, list(all_dims))
    name_to_w = {all_dims[i]: base[i] for i in range(min(len(all_dims), len(base)))}
    macro_w = [float(name_to_w.get(n, 1.0 / 3.0)) for n in ordered_names]
    macro_w = _ensure_fraction_weights(macro_w)

    # Direcciones por rama.
    directions = []
    opciones = resultado.get('opciones_calculo') or {}
    raw_dirs = (resultado.get('normalizacion') or {}).get('directions') or opciones.get('direcciones') or {}
    for rama, nombre in dim_names_by_rama.items():
        default = 'min' if rama in ('omoc', 'omor') else 'max'
        if isinstance(raw_dirs, dict):
            directions.append(str(raw_dirs.get(nombre) or raw_dirs.get(rama) or default))
        else:
            directions.append(default)

    return {
        'alternatives': alternatives,
        'omoc': omoc_vals,
        'omor': omor_vals,
        'omoe_contexts': omoe_ctx,
        'nominal_macro_weights': macro_w,
        'nominal_meso_weights': meso_w,
        'directions': directions,
        'context_labels': labels,
    }, None


def build_stochastic_sensibilidad_from_resultado(
    resultado: dict[str, Any],
    *,
    muestras: int | None = None,
    concentracion: float | None = None,
    concentracion_meso: float | None = None,
    seed: int | None = 42,
    nivel: str | None = 'macro',
    sampling_method: str | None = 'mc',
    admissibility_threshold: float | None = None,
) -> dict[str, Any]:
    """Sensibilidad estocástica SMAA (guía Joan / notebook 03_2).

    ``nivel``:
      - ``macro``: matriz dimensional fija (pipeline normalizado).
      - ``meso_macro``: OMOE contextual × λ + pesos macro (requiere datos).
    """
    from .stochastic_smaa_bridge import run_smaa_macro, run_smaa_meso_macro

    error = validate_sensibilidad_resultado(resultado)
    if error:
        return {'ok': False, 'mensaje': error}

    n_samples, kappa = _clamp_stochastic_params(muestras, concentracion)
    kappa_meso = None
    if concentracion_meso is not None:
        _, kappa_meso = _clamp_stochastic_params(muestras, concentracion_meso)

    nivel_norm = (nivel or 'macro').strip().lower().replace('-', '_').replace('–', '_')
    if nivel_norm in ('meso', 'mesomacro', 'meso_macro', 'macro_meso'):
        nivel_norm = 'meso_macro'
    else:
        nivel_norm = 'macro'

    metodo = (_metodo_madm_from_resultado(resultado) or 'topsis').lower()
    aggregation = 'topsis' if metodo == 'topsis' else 'additive'
    thr = None
    if admissibility_threshold is not None and str(admissibility_threshold).strip() != '':
        try:
            thr = float(admissibility_threshold)
        except (TypeError, ValueError):
            thr = None

    try:
        if nivel_norm == 'meso_macro':
            inputs, msg = extract_meso_macro_inputs(resultado)
            if not inputs:
                return {
                    'ok': False,
                    'mensaje': msg or 'No hay datos suficientes para meso–macro.',
                    'nivel': 'meso_macro',
                    'requires_joan_clarification': True,
                }
            payload = run_smaa_meso_macro(
                alternatives=inputs['alternatives'],
                omoc=inputs['omoc'],
                omor=inputs['omor'],
                omoe_contexts=inputs['omoe_contexts'],
                directions=inputs['directions'],
                nominal_macro_weights=inputs['nominal_macro_weights'],
                nominal_meso_weights=inputs['nominal_meso_weights'],
                muestras=n_samples,
                concentracion=kappa,
                concentracion_meso=kappa_meso,
                seed=42 if seed is None else int(seed),
                aggregation=aggregation,
                sampling_method=sampling_method or 'mc',
                admissibility_threshold=thr,
                context_labels=inputs['context_labels'],
            )
        else:
            ctx = _build_ranker_context(resultado)
            dimensions = ctx['dimensions']
            alternatives = ctx['alternatives']
            matrix = ctx['matrix']
            if not matrix or not alternatives or not dimensions:
                return {'ok': False, 'mensaje': 'El cálculo no tiene matriz dimensional para SMAA.'}

            base_weights = _baseline_weights(resultado, dimensions)
            if sum(base_weights) <= WEIGHT_TOLERANCE:
                return {'ok': False, 'mensaje': 'Los pesos base del cálculo no son válidos.'}

            opciones = resultado.get('opciones_calculo') or {}
            norm = resultado.get('normalizacion') or {}
            raw_dirs = norm.get('directions') or opciones.get('direcciones') or []
            if isinstance(raw_dirs, dict):
                directions = [
                    str(raw_dirs.get(str(i + 1)) or raw_dirs.get(dimensions[i]) or 'max')
                    for i in range(len(dimensions))
                ]
            elif isinstance(raw_dirs, list) and len(raw_dirs) == len(dimensions):
                directions = [str(d) for d in raw_dirs]
            else:
                directions = ['max'] * len(dimensions)

            payload = run_smaa_macro(
                alternatives=alternatives,
                criteria=dimensions,
                matrix=matrix,
                directions=directions,
                nominal_weights=base_weights,
                muestras=n_samples,
                concentracion=kappa,
                seed=42 if seed is None else int(seed),
                aggregation=aggregation,
                matrix_already_normalized=True,
                sampling_method=sampling_method or 'mc',
                admissibility_threshold=thr,
            )
    except Exception as exc:  # noqa: BLE001 — devolver mensaje usable en UI
        return {
            'ok': False,
            'mensaje': f'No se pudo ejecutar el análisis SMAA: {exc}',
        }

    payload['metodo_madm'] = metodo
    payload['metodo_madm_label'] = _madm_label(metodo)
    payload['tipo'] = 'sensibilidad_estocastica_smaa'
    return payload


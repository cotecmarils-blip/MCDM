"""Pipeline Pareto → normalización → pesos → ranking MADM."""
from __future__ import annotations

import math
from typing import Any

from django.core.exceptions import ValidationError

from decimal import Decimal

from .madm_choices import MADM_METHODS, rama_to_direction
from .madm_ranker import MADMRanker, MatrixOrientation, WeightCalculator
from .matrix_normalizer import NonDominatedNormalizer
from .pareto_solver import DEFAULT_PARETO_EPSILON, ParetoSolver


def _parse_direction_value(value: str | None, default: str = 'max') -> str:
    if value is None or value == '':
        return default
    normalized = str(value).strip().lower()
    if normalized in ('min', 'minimize', 'minimizar', 'menor'):
        return 'min'
    if normalized in ('max', 'maximize', 'maximizar', 'mayor'):
        return 'max'
    raise ValidationError(
        f"Dirección inválida '{value}'. Use 'min' (menor es mejor) o 'max' (mayor es mejor)."
    )


def resolve_directions(
    dimensiones_meta: list[dict[str, Any]],
    opciones: dict[str, Any] | None = None,
) -> list[str]:
    """Vector directions alineado con dimensiones_meta (Pareto / normalización / MADM)."""
    if not opciones:
        return [rama_to_direction(m.get('rama_evaluacion')) for m in dimensiones_meta]

    raw = opciones.get('direcciones')
    if raw is None:
        return [rama_to_direction(m.get('rama_evaluacion')) for m in dimensiones_meta]

    if isinstance(raw, dict):
        result = []
        for meta in dimensiones_meta:
            omoe_id = meta['omoe_id']
            default = rama_to_direction(meta.get('rama_evaluacion'))
            val = raw.get(str(omoe_id)) or raw.get(omoe_id) or raw.get(meta['nombre'])
            result.append(_parse_direction_value(val, default))
        return result

    if isinstance(raw, list):
        if len(raw) != len(dimensiones_meta):
            raise ValidationError(
                'El número de direcciones debe coincidir con el de dimensiones. '
                f'Esperado {len(dimensiones_meta)}, recibido {len(raw)}.'
            )
        return [
            _parse_direction_value(
                v,
                rama_to_direction(meta.get('rama_evaluacion')),
            )
            for v, meta in zip(raw, dimensiones_meta)
        ]

    raise ValidationError('direcciones debe ser un objeto o una lista.')


def directions_by_dimension_name(
    dimensiones_meta: list[dict[str, Any]],
    directions: list[str],
) -> dict[str, str]:
    return {
        meta['nombre']: directions[i]
        for i, meta in enumerate(dimensiones_meta)
    }


PESO_DIM_TOTAL = Decimal('100')
PESO_DIM_TOLERANCE = Decimal('0.05')

PARETO_EPSILON_VALIDATION_MSG = (
    'Ingrese un valor de epsilon válido, mayor o igual que cero.'
)


def parse_pareto_epsilon(raw) -> float:
    """Tolerancia numérica para comparaciones Pareto (opcional en opciones)."""
    if raw is None:
        return DEFAULT_PARETO_EPSILON
    if isinstance(raw, str) and raw.strip() == '':
        return DEFAULT_PARETO_EPSILON
    try:
        val = float(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError(PARETO_EPSILON_VALIDATION_MSG) from exc
    if not math.isfinite(val) or val < 0:
        raise ValidationError(PARETO_EPSILON_VALIDATION_MSG)
    return val


def _parse_pesos_usuario_percent(raw, n_dims: int) -> list[float]:
    if not isinstance(raw, (list, tuple)) or len(raw) != n_dims:
        raise ValidationError(
            f'Debe indicar un peso (%) para cada una de las {n_dims} dimensiones.'
        )
    pesos: list[Decimal] = []
    for idx, item in enumerate(raw, start=1):
        try:
            val = Decimal(str(item))
        except Exception as exc:
            raise ValidationError(
                f'El peso de la dimensión {idx} no es un número válido.'
            ) from exc
        if val < 0 or val > PESO_DIM_TOTAL + PESO_DIM_TOLERANCE:
            raise ValidationError(
                f'El peso de la dimensión {idx} debe estar entre 0 y 100 %.'
            )
        pesos.append(val)
    total = sum(pesos, Decimal('0'))
    if abs(total - PESO_DIM_TOTAL) > PESO_DIM_TOLERANCE:
        raise ValidationError(
            f'Los pesos por dimensión deben sumar 100 % (actual: {total} %).'
        )
    return [float(p) for p in pesos]


def _parse_madm_params(raw: Any) -> dict[str, dict[str, float]]:
    """Normaliza parámetros por método: vikor.v, waspas.l, codas.tau."""
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, float]] = {}
    for key, val in raw.items():
        method = str(key).strip().lower()
        if not isinstance(val, dict):
            continue
        cleaned: dict[str, float] = {}
        if method == 'vikor' and val.get('v') is not None:
            cleaned['v'] = float(val['v'])
        if method == 'waspas':
            if val.get('l') is not None:
                cleaned['l'] = float(val['l'])
            elif val.get('lambda') is not None:
                cleaned['l'] = float(val['lambda'])
        if method == 'codas' and val.get('tau') is not None:
            cleaned['tau'] = float(val['tau'])
        if cleaned:
            out[method] = cleaned
    return out


def _parse_metodos_madm(opts: dict[str, Any]) -> list[str]:
    """Lista de métodos (orden preservado). Retrocompatible con metodo_madm único."""
    valid = {m['value'] for m in MADM_METHODS}
    raw_list = opts.get('metodos_madm')
    selected: list[str] = []
    if isinstance(raw_list, (list, tuple)):
        for item in raw_list:
            key = str(item or '').strip().lower()
            if key in valid and key not in selected:
                selected.append(key)
    primary = str(opts.get('metodo_madm') or '').strip().lower()
    if primary in valid and primary not in selected:
        selected.insert(0, primary)
    if not selected:
        selected = ['topsis']
    return selected


def _parse_opciones(
    opciones: dict[str, Any] | None,
    dimension_names: list[str],
    dimensiones_meta: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    opts = opciones or {}
    dims_norm = opts.get('dimensiones_normalizar')
    if dims_norm is None:
        dims_norm = list(dimension_names)
    if not dims_norm:
        raise ValidationError(
            'Debe seleccionar al menos una dimensión para el cálculo.'
        )
    metodo_norm = (opts.get('normalizacion_metodo') or '').strip()
    if not metodo_norm:
        raise ValidationError('Debe seleccionar un método de normalización.')
    metodo_pesos = (opts.get('metodo_pesos') or '').strip()
    if not metodo_pesos:
        raise ValidationError('Debe seleccionar un método de cálculo de pesos.')
    metodos_madm = _parse_metodos_madm(opts)
    metodo_madm = str(opts.get('metodo_madm') or metodos_madm[0]).strip().lower()
    if metodo_madm not in metodos_madm:
        metodo_madm = metodos_madm[0]
    madm_params = _parse_madm_params(opts.get('madm_params'))
    directions = (
        resolve_directions(dimensiones_meta, opts)
        if dimensiones_meta
        else []
    )
    pesos_usuario = opts.get('pesos_usuario')
    if metodo_pesos == 'user_defined_weights':
        pesos_usuario = _parse_pesos_usuario_percent(pesos_usuario, len(dimension_names))
    pareto_epsilon = parse_pareto_epsilon(opts.get('pareto_epsilon'))
    return {
        'aplicar_pareto': bool(opts.get('aplicar_pareto', False)),
        'dimensiones_normalizar': [str(d) for d in dims_norm],
        'direcciones': directions,
        'direcciones_por_dimension': (
            directions_by_dimension_name(dimensiones_meta, directions)
            if dimensiones_meta and directions
            else {}
        ),
        'normalizacion_metodo': metodo_norm,
        'metodo_pesos': metodo_pesos,
        'metodo_madm': metodo_madm,
        'metodos_madm': metodos_madm,
        'madm_params': madm_params,
        'pesos_usuario': pesos_usuario,
        'pareto_epsilon': pareto_epsilon,
    }


def filter_dimensiones_meta(
    dimensiones_meta: list[dict[str, Any]],
    opciones: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Restringe el cálculo MADM a las dimensiones elegidas por el usuario."""
    if not dimensiones_meta:
        return []
    opts = opciones or {}
    selected = opts.get('dimensiones_normalizar')
    if selected is None:
        return list(dimensiones_meta)
    if not selected:
        raise ValidationError(
            'Debe seleccionar al menos una dimensión para el cálculo.'
        )
    names = {str(s) for s in selected}
    filtered = [m for m in dimensiones_meta if m['nombre'] in names]
    if not filtered:
        raise ValidationError(
            'Ninguna de las dimensiones seleccionadas coincide con las del proyecto.'
        )
    return filtered


def filter_rollups_by_dimensions(
    alternativas_rollups: list[dict[str, Any]],
    dimensiones_meta: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Recorta dimensiones en cada alternativa y recalcula el promedio global."""
    if not dimensiones_meta:
        return alternativas_rollups
    selected_ids = {m['omoe_id'] for m in dimensiones_meta}
    out: list[dict[str, Any]] = []
    for alt in alternativas_rollups:
        dims = [
            d for d in alt.get('dimensiones', [])
            if d.get('omoe_id') in selected_ids
        ]
        scores = [float(d['valor']) for d in dims if d.get('valor') is not None]
        gv = sum(scores) / len(scores) if scores else 0.0
        alt_copy = {**alt, 'dimensiones': dims, 'valor_global': round(gv, 6)}
        out.append(alt_copy)
    return out


def build_matrix_from_rollups(
    alternativas_rollups: list[dict[str, Any]],
    dimensiones_meta: list[dict[str, Any]],
    opciones: dict[str, Any] | None = None,
) -> tuple[list[list[float]], list[str], list[str], list[str]]:
    """Matriz n×m, nombres de alternativa, dimensión y dirección por columna."""
    active_meta = filter_dimensiones_meta(dimensiones_meta, opciones)
    dim_names = [d['nombre'] for d in active_meta]
    directions = resolve_directions(active_meta, opciones)
    alt_names: list[str] = []
    matrix: list[list[float]] = []

    for alt in alternativas_rollups:
        alt_names.append(alt['nombre'])
        by_id = {d['omoe_id']: d['valor'] for d in alt.get('dimensiones', [])}
        row = []
        for meta in active_meta:
            val = by_id.get(meta['omoe_id'])
            if val is None:
                raise ValidationError(
                    f'Falta valor de dimensión «{meta["nombre"]}» para «{alt["nombre"]}».'
                )
            row.append(float(val))
        matrix.append(row)

    return matrix, alt_names, dim_names, directions


def _matrix_orientation_for_method(norm_method: str) -> str:
    if norm_method in ('directional_minmax', 'directional_vector'):
        return MatrixOrientation.ALL_BENEFIT.value
    return MatrixOrientation.ORIGINAL_DIRECTIONS.value


def run_madm_pipeline(
    matrix: list[list[float]],
    alternatives: list[str],
    dimensions: list[str],
    directions: list[str],
    opciones: dict[str, Any] | None = None,
    dimensiones_meta: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    parsed = _parse_opciones(
        opciones,
        dimensions,
        dimensiones_meta=filter_dimensiones_meta(
            dimensiones_meta or [],
            opciones,
        ) if dimensiones_meta else None,
    )
    directions = parsed.get('direcciones') or directions
    all_indices = list(range(len(alternatives)))

    pareto_output = None
    pareto_indices = all_indices

    if parsed['aplicar_pareto']:
        pareto_result = ParetoSolver(
            matrix=matrix,
            dimensions=dimensions,
            directions=directions,
            alternatives=alternatives,
            epsilon=parsed['pareto_epsilon'],
        ).solve()
        pareto_indices = pareto_result.pareto_indices
        if not pareto_indices:
            raise ValidationError(
                'El filtro Pareto no dejó alternativas en el frente no dominado.'
            )
        pareto_output = {
            'pareto_indices': pareto_result.pareto_indices,
            'pareto_alternatives': pareto_result.pareto_alternatives,
            'dominated_indices': pareto_result.dominated_indices,
            'dominated_alternatives': pareto_result.dominated_alternatives,
            'pareto_mask': pareto_result.pareto_mask.tolist(),
            'dominated_mask': pareto_result.dominated_mask.tolist(),
        }

    normalizer = NonDominatedNormalizer(
        matrix=matrix,
        pareto_indices=pareto_indices,
        directions=directions,
        dimensions=dimensions,
        alternatives=alternatives,
    )
    norm_result = normalizer.normalize(
        parsed['normalizacion_metodo'],
        dimensions_to_normalize=parsed['dimensiones_normalizar'],
    )

    norm_matrix = norm_result.normalized_matrix.tolist()
    pareto_alt_names = norm_result.pareto_alternatives
    pareto_directions = [d.value for d in norm_result.directions]

    user_weights = parsed.get('pesos_usuario')
    if parsed['metodo_pesos'] == 'user_defined_weights' and user_weights is not None:
        user_weights = [float(w) for w in user_weights]

    ranker = MADMRanker(
        norm_matrix,
        alternatives=pareto_alt_names,
        dimensions=dimensions,
        directions=pareto_directions,
        matrix_orientation=_matrix_orientation_for_method(parsed['normalizacion_metodo']),
    )

    try:
        madm_by_method: dict[str, Any] = {}
        errors_by_method: dict[str, str] = {}
        madm_params = parsed.get('madm_params') or {}
        for method_key in parsed['metodos_madm']:
            try:
                result = ranker.rank_with_weight_method(
                    method_key,
                    weight_method=parsed['metodo_pesos'],
                    user_weights=user_weights,
                    method_params=madm_params.get(method_key),
                )
                madm_by_method[method_key] = result.to_dict()
            except Exception as exc:  # noqa: BLE001 — reportar por método
                errors_by_method[method_key] = str(exc)

        primary = parsed['metodo_madm']
        if primary not in madm_by_method:
            # Si el primario falló, usar el primero disponible.
            if not madm_by_method:
                detail = '; '.join(f'{k}: {v}' for k, v in errors_by_method.items()) or 'sin detalle'
                raise ValidationError(f'Error en método MADM: {detail}')
            primary = next(iter(madm_by_method))
            parsed['metodo_madm'] = primary

        madm_dict = madm_by_method[primary]
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError(f'Error en método MADM: {exc}') from exc

    ranking_by_alt_id: dict[str, int] = {}
    for alt_name, rank in madm_dict.get('ranking_by_alternative', {}).items():
        ranking_by_alt_id[alt_name] = int(rank)

    return {
        'opciones': parsed,
        'pareto': pareto_output,
        'normalizacion': norm_result.to_dict(),
        'pesos': {
            'method': madm_dict.get('weight_method'),
            'weights': madm_dict.get('weights'),
            'weights_by_dimension': madm_dict.get('weights_by_dimension'),
        },
        'madm': madm_dict,
        'madm_por_metodo': madm_by_method,
        'madm_errores': errors_by_method,
        'ranking_by_alternative': ranking_by_alt_id,
        'best_alternative': madm_dict.get('best_alternative'),
    }


def _round_matrix(matrix: list[list[float]], digits: int = 4) -> list[list[float]]:
    return [[round(float(v), digits) for v in row] for row in matrix]


_PIPELINE_NOTEBOOK = {
    'entrada': 'app',
    'pareto': '01',
    'normalizacion': '01',
    'pesos': '02',
    'madm': '02',
}


def _paso_meta(paso_id: str, orden: int, **extra: Any) -> dict[str, Any]:
    return {
        'orden': orden,
        'notebook': _PIPELINE_NOTEBOOK.get(paso_id),
        **extra,
    }


def preview_madm_pipeline(
    matrix: list[list[float]],
    alternatives: list[str],
    dimensions: list[str],
    directions: list[str],
    opciones: dict[str, Any] | None = None,
    *,
    dimensiones_meta: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Calcula y devuelve matrices intermedias según opciones parciales o completas."""
    opts = opciones or {}
    pasos: list[dict[str, Any]] = []

    pasos.append(_paso_meta(
        'entrada',
        1,
        id='entrada',
        estado='completo',
        titulo='Matriz de utilidades',
        descripcion='Valores agregados por dimensión desde el árbol de criterios.',
        alternativas=alternatives,
        dimensiones=dimensions,
        direcciones=directions,
        matriz=_round_matrix(matrix),
    ))

    pareto_indices = list(range(len(alternatives)))

    if opts.get('aplicar_pareto'):
        try:
            pareto_epsilon = parse_pareto_epsilon(opts.get('pareto_epsilon'))
            pareto_result = ParetoSolver(
                matrix=matrix,
                dimensions=dimensions,
                directions=directions,
                alternatives=alternatives,
                epsilon=pareto_epsilon,
            ).solve()
            pareto_indices = pareto_result.pareto_indices
            filtered_matrix = [matrix[i] for i in pareto_indices]
            filtered_alts = [alternatives[i] for i in pareto_indices]
            paso_extra: dict[str, Any] = {}
            if len(filtered_alts) < 2:
                paso_extra['aviso'] = (
                    f'Quedó {len(filtered_alts)} alternativa(s) no dominada(s). '
                    'El ranking MADM requiere al menos 2.'
                )
            pasos.append(_paso_meta(
                'pareto',
                2,
                id='pareto',
                estado='completo',
                titulo='Filtro Pareto',
                descripcion='Solo alternativas no dominadas.',
                activo=True,
                alternativas=filtered_alts,
                excluidas=pareto_result.dominated_alternatives,
                dimensiones=dimensions,
                direcciones=directions,
                matriz=_round_matrix(filtered_matrix),
                **paso_extra,
            ))
        except (ValidationError, ValueError) as exc:
            pasos.append(_paso_meta(
                'pareto',
                2,
                id='pareto',
                estado='error',
                titulo='Filtro Pareto',
                error=str(exc),
            ))
    else:
        pasos.append(_paso_meta(
            'pareto',
            2,
            id='pareto',
            estado='omitido',
            titulo='Filtro Pareto',
            activo=False,
            descripcion='Desactivado: todas las alternativas continúan.',
        ))

    norm_method = (opts.get('normalizacion_metodo') or '').strip()
    dims_norm = opts.get('dimensiones_normalizar') or []
    norm_matrix: list[list[float]] | None = None
    norm_alts: list[str] | None = None
    pareto_directions = directions

    if norm_method and dims_norm:
        try:
            normalizer = NonDominatedNormalizer(
                matrix=matrix,
                pareto_indices=pareto_indices,
                directions=directions,
                dimensions=dimensions,
                alternatives=alternatives,
            )
            norm_result = normalizer.normalize(
                norm_method,
                dimensions_to_normalize=[str(d) for d in dims_norm],
            )
            norm_matrix = norm_result.normalized_matrix.tolist()
            norm_alts = norm_result.pareto_alternatives
            pareto_directions = [d.value for d in norm_result.directions]
            pasos.append(_paso_meta(
                'normalizacion',
                3,
                id='normalizacion',
                estado='completo',
                titulo='Matriz normalizada',
                descripcion=f'Método: {norm_method}.',
                metodo=norm_method,
                dimensiones_normalizadas=norm_result.normalized_dimensions,
                dimensiones_preservadas=norm_result.preserved_dimensions,
                alternativas=norm_alts,
                dimensiones=dimensions,
                direcciones=pareto_directions,
                matriz=_round_matrix(norm_matrix),
            ))
        except (ValidationError, ValueError) as exc:
            pasos.append(_paso_meta(
                'normalizacion',
                3,
                id='normalizacion',
                estado='error',
                titulo='Matriz normalizada',
                error=str(exc),
            ))

    metodo_pesos = (opts.get('metodo_pesos') or '').strip()
    weights_list: list[float] | None = None

    if metodo_pesos and norm_matrix is not None and norm_alts is not None:
        user_weights = None
        if metodo_pesos == 'user_defined_weights':
            try:
                user_weights = _parse_pesos_usuario_percent(
                    opts.get('pesos_usuario'),
                    len(dimensions),
                )
            except ValidationError as exc:
                pasos.append(_paso_meta(
                    'pesos',
                    4,
                    id='pesos',
                    estado='error',
                    titulo='Pesos por dimensión',
                    error=str(exc),
                ))
                user_weights = None

        if not (metodo_pesos == 'user_defined_weights' and user_weights is None):
            try:
                wc = WeightCalculator(norm_matrix, dimensions=dimensions)
                weight_result = wc.compute(
                    metodo_pesos,
                    user_weights=user_weights,
                )
                weights_list = weight_result.weights.tolist()
                pesos_pct = {
                    dimensions[j]: round(float(weights_list[j]) * 100, 2)
                    for j in range(len(dimensions))
                }
                pasos.append(_paso_meta(
                    'pesos',
                    4,
                    id='pesos',
                    estado='completo',
                    titulo='Pesos por dimensión',
                    descripcion=f'Método: {metodo_pesos}.',
                    metodo=metodo_pesos,
                    pesos=[round(w, 6) for w in weights_list],
                    pesos_porcentaje=pesos_pct,
                    dimensiones=dimensions,
                ))
            except (ValidationError, ValueError) as exc:
                pasos.append(_paso_meta(
                    'pesos',
                    4,
                    id='pesos',
                    estado='error',
                    titulo='Pesos por dimensión',
                    error=str(exc),
                ))

    metodos_madm = _parse_metodos_madm(opts)
    metodo_madm = (opts.get('metodo_madm') or (metodos_madm[0] if metodos_madm else '')).strip()
    madm_params = _parse_madm_params(opts.get('madm_params'))
    if (
        metodos_madm
        and norm_matrix is not None
        and norm_alts is not None
        and metodo_pesos
        and weights_list is not None
    ):
        if len(norm_alts) < 2:
            madm_error = (
                'Tras el filtro Pareto solo queda 1 alternativa; '
                'el ranking MADM requiere al menos 2.'
                if opts.get('aplicar_pareto')
                else 'Se necesitan al menos 2 alternativas para el ranking MADM.'
            )
            pasos.append(_paso_meta(
                'madm',
                5,
                id='madm',
                estado='error',
                titulo='Ranking MADM',
                error=madm_error,
            ))
        else:
            try:
                ranker = MADMRanker(
                    norm_matrix,
                    alternatives=norm_alts,
                    dimensions=dimensions,
                    directions=pareto_directions,
                    matrix_orientation=_matrix_orientation_for_method(norm_method),
                )
                user_w = (
                    opts.get('pesos_usuario')
                    if metodo_pesos == 'user_defined_weights'
                    else None
                )
                madm_by_method: dict[str, Any] = {}
                for method_key in metodos_madm:
                    result = ranker.rank_with_weight_method(
                        method_key,
                        weight_method=metodo_pesos,
                        user_weights=user_w,
                        method_params=madm_params.get(method_key),
                    )
                    madm_by_method[method_key] = result.to_dict()

                primary = metodo_madm if metodo_madm in madm_by_method else metodos_madm[0]
                madm_dict = madm_by_method[primary]
                ranking_rows = []
                scores = madm_dict.get('scores_by_alternative') or {}
                ranking = madm_dict.get('ranking_by_alternative') or {}
                for alt_name in norm_alts:
                    ranking_rows.append({
                        'alternativa': alt_name,
                        'puntuacion': round(float(scores.get(alt_name, 0)), 4),
                        'ranking': int(ranking.get(alt_name, 0)),
                    })
                ranking_rows.sort(key=lambda r: r['ranking'] if r['ranking'] else 9999)

                comparacion = []
                for alt_name in norm_alts:
                    row = {'alternativa': alt_name}
                    for mk, md in madm_by_method.items():
                        row[f'rango_{mk}'] = int((md.get('ranking_by_alternative') or {}).get(alt_name, 0))
                        row[f'score_{mk}'] = round(
                            float((md.get('scores_by_alternative') or {}).get(alt_name, 0)),
                            4,
                        )
                    comparacion.append(row)

                labels = ', '.join(m.upper() for m in metodos_madm)
                pasos.append(_paso_meta(
                    'madm',
                    5,
                    id='madm',
                    estado='completo',
                    titulo=f'Ranking MADM ({labels})',
                    descripcion=(
                        'Orden preliminar según configuración actual. '
                        f'Primario: {primary.upper()}.'
                    ),
                    metodo=primary,
                    metodos=metodos_madm,
                    madm_params=madm_params,
                    mejor_alternativa=madm_dict.get('best_alternative'),
                    ranking=ranking_rows,
                    madm_por_metodo={
                        k: {
                            'best_alternative': v.get('best_alternative'),
                            'ranking_by_alternative': v.get('ranking_by_alternative'),
                            'scores_by_alternative': v.get('scores_by_alternative'),
                            'params': v.get('params'),
                        }
                        for k, v in madm_by_method.items()
                    },
                    comparacion_metodos=comparacion,
                ))
            except Exception as exc:  # noqa: BLE001
                pasos.append(_paso_meta(
                    'madm',
                    5,
                    id='madm',
                    estado='error',
                    titulo='Ranking MADM',
                    error=str(exc),
                ))

    return {'pasos': pasos}


def apply_madm_ranking_to_alternativas(
    alternativas_rollups: list[dict[str, Any]],
    pipeline_result: dict[str, Any],
) -> list[dict[str, Any]]:
    """Reordena alternativas según ranking MADM; marca dominadas por Pareto."""
    ranking = pipeline_result.get('ranking_by_alternative') or {}
    pareto_alts = set(
        (pipeline_result.get('pareto') or {}).get('pareto_alternatives') or []
    )
    dominated = set(
        (pipeline_result.get('pareto') or {}).get('dominated_alternatives') or []
    )
    aplicar_pareto = bool((pipeline_result.get('opciones') or {}).get('aplicar_pareto'))

    scored = []
    for alt in alternativas_rollups:
        nombre = alt['nombre']
        if aplicar_pareto and nombre in dominated:
            alt = dict(alt)
            alt['excluida_pareto'] = True
            alt['ranking_madm'] = None
            scored.append(alt)
            continue
        rank = ranking.get(nombre)
        madm_score = (
            pipeline_result.get('madm', {})
            .get('scores_by_alternative', {})
            .get(nombre)
        )
        alt = dict(alt)
        alt['excluida_pareto'] = False
        alt['ranking_madm'] = rank
        alt['score_madm'] = madm_score
        alt['valor_global'] = madm_score if madm_score is not None else alt.get('valor_global')
        scored.append(alt)

    active = [a for a in scored if not a.get('excluida_pareto')]
    active.sort(key=lambda a: (a.get('ranking_madm') is None, a.get('ranking_madm') or 9999))

    dominated_alts = [a for a in scored if a.get('excluida_pareto')]
    ordered = active + dominated_alts

    for i, alt in enumerate(ordered, start=1):
        alt['ranking'] = i if not alt.get('excluida_pareto') else None

    return ordered

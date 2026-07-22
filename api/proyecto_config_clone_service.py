"""
Copia selectiva de configuración entre proyectos.

Permite importar, a elección del usuario:
  - dimensiones (árbol + pesos/curvas)
  - escenarios (incl. NodoArbolEscenario y AHP)
  - alternativas (datos + capacidades + características)
  - valores de evaluación (si hay mapas de alt/escenario/nodo)
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Prefetch

from .dimension_clone_service import clonar_dimension_en_proyecto
from .models import (
    Alternativa,
    Capacidad,
    Caracteristica,
    CaracteristicaPlantilla,
    Escenario,
    NodoArbolEscenario,
    Omoe,
    PesoGrupoAhp,
    Proyecto,
    ValorEvaluacion,
)
from .peso_service import _q2

ALT_COPY_FIELDS = (
    'nombre',
    'apodo',
    'descripcion',
    'referencia',
    'costo',
    'costo_unidad',
)

CONFIG_NODO_COPY_FIELDS = (
    'peso',
    'aplica',
    'tipo_criterio',
    'familia_funciones',
    'parametros_funcion',
    'tipo_consecuencia',
)


def listar_catalogo_proyectos_config(
    *,
    proyecto_ids: list[int] | set[int],
    excluir_proyecto_id: int | None = None,
) -> list[dict[str, Any]]:
    """Lista proyectos accesibles con conteos para importar configuración."""
    qs = (
        Proyecto.objects.filter(id__in=proyecto_ids)
        .annotate(
            dimensiones_count=Count('omoes', distinct=True),
            escenarios_count=Count('escenarios', distinct=True),
            alternativas_count=Count('alternativas', distinct=True),
            valores_count=Count('alternativas__valores_evaluacion', distinct=True),
        )
        .order_by('nombre', 'id')
    )
    if excluir_proyecto_id is not None:
        qs = qs.exclude(id=excluir_proyecto_id)

    return [
        {
            'proyecto_id': p.id,
            'nombre': p.nombre,
            'descripcion': (p.descripcion or '')[:240],
            'dimensiones_count': int(p.dimensiones_count or 0),
            'escenarios_count': int(p.escenarios_count or 0),
            'alternativas_count': int(p.alternativas_count or 0),
            'valores_count': int(p.valores_count or 0),
        }
        for p in qs
    ]


def preview_config_proyecto(proyecto: Proyecto) -> dict[str, Any]:
    """Detalle seleccionable de la configuración de un proyecto fuente."""
    omoes = list(
        Omoe.objects.filter(proyecto=proyecto)
        .annotate(nodos_count=Count('nodos'))
        .order_by('orden', 'nombre_modelo', 'id')
    )
    escenarios = list(
        Escenario.objects.filter(proyecto=proyecto)
        .select_related('omoe')
        .order_by('orden', 'nombre', 'id')
    )
    alternativas = list(
        Alternativa.objects.filter(proyecto=proyecto)
        .annotate(valores_count=Count('valores_evaluacion'))
        .prefetch_related(
            Prefetch(
                'caracteristicas',
                queryset=Caracteristica.objects.select_related('plantilla'),
            ),
            'capacidades',
        )
        .order_by('nombre', 'id')
    )

    dimensiones = []
    for o in omoes:
        dimensiones.append({
            'omoe_id': o.id,
            'nombre_modelo': o.nombre_modelo,
            'codigo': o.codigo or '',
            'rama_evaluacion': o.rama_evaluacion or '',
            'nodos_count': int(o.nodos_count or 0),
            'escenarios_count': sum(1 for e in escenarios if e.omoe_id == o.id),
        })

    esc_out = []
    for e in escenarios:
        esc_out.append({
            'escenario_id': e.id,
            'nombre': e.nombre,
            'descripcion': e.descripcion or '',
            'peso': str(e.peso) if e.peso is not None else '0',
            'omoe_id': e.omoe_id,
            'omoe_nombre': e.omoe.nombre_modelo if e.omoe_id else None,
            'rama_evaluacion': e.rama_evaluacion or '',
            'es_estandar': (e.nombre or '').strip().lower() == 'estandar',
        })

    alt_out = []
    for a in alternativas:
        caracteristicas = [
            {
                'nombre': c.plantilla.nombre if c.plantilla_id else '',
                'unidad': c.plantilla.unidad if c.plantilla_id else '',
                'dato': c.dato or '',
            }
            for c in a.caracteristicas.all()
        ]
        capacidades = [
            {'nombre': c.nombre, 'descripcion': c.descripcion or ''}
            for c in a.capacidades.all()
        ]
        alt_out.append({
            'alternativa_id': a.id,
            'nombre': a.nombre,
            'apodo': a.apodo or '',
            'descripcion': (a.descripcion or '')[:200],
            'costo': str(a.costo) if a.costo is not None else None,
            'costo_unidad': a.costo_unidad or '',
            'valores_count': int(a.valores_count or 0),
            'capacidades': capacidades,
            'caracteristicas': caracteristicas,
            'tiene_foto': bool(a.foto),
            'tiene_anexo': bool(a.anexo),
        })

    return {
        'proyecto_id': proyecto.id,
        'nombre': proyecto.nombre,
        'descripcion': proyecto.descripcion or '',
        'dimensiones': dimensiones,
        'escenarios': esc_out,
        'alternativas': alt_out,
        'resumen': {
            'dimensiones': len(dimensiones),
            'escenarios': len(esc_out),
            'alternativas': len(alt_out),
            'valores': sum(a['valores_count'] for a in alt_out),
        },
    }


def _unique_escenario_nombre(omoe: Omoe, base: str) -> str:
    nombre = (base or 'Escenario').strip() or 'Escenario'
    if not Escenario.objects.filter(omoe=omoe, nombre=nombre).exists():
        return nombre
    n = 2
    while Escenario.objects.filter(omoe=omoe, nombre=f'{nombre} ({n})').exists():
        n += 1
    return f'{nombre} ({n})'


def _unique_alternativa_nombre(proyecto: Proyecto, base: str) -> str:
    nombre = (base or 'Alternativa').strip() or 'Alternativa'
    if not Alternativa.objects.filter(proyecto=proyecto, nombre=nombre).exists():
        return nombre
    n = 2
    while Alternativa.objects.filter(proyecto=proyecto, nombre=f'{nombre} ({n})').exists():
        n += 1
    return f'{nombre} ({n})'


def _clone_configs_escenario(
    *,
    src_escenario: Escenario,
    dest_escenario: Escenario,
    nodo_map: dict[int, int],
) -> int:
    """Copia NodoArbolEscenario (sin FKs de riesgo) y PesoGrupoAhp remapeados."""
    configs = list(NodoArbolEscenario.objects.filter(escenario=src_escenario))
    created = 0
    for cfg in configs:
        dest_nodo_id = nodo_map.get(cfg.nodo_arbol_id)
        if not dest_nodo_id:
            continue
        kwargs: dict[str, Any] = {
            'escenario': dest_escenario,
            'nodo_arbol_id': dest_nodo_id,
        }
        for field in CONFIG_NODO_COPY_FIELDS:
            val = getattr(cfg, field)
            if field == 'parametros_funcion':
                kwargs[field] = deepcopy(val) if val is not None else {}
            elif field == 'peso':
                kwargs[field] = _q2(val if val is not None else 0)
            else:
                kwargs[field] = val
        NodoArbolEscenario.objects.update_or_create(
            escenario=dest_escenario,
            nodo_arbol_id=dest_nodo_id,
            defaults=kwargs,
        )
        created += 1

    for grupo in PesoGrupoAhp.objects.filter(escenario=src_escenario):
        parent_id = None
        if grupo.parent_id:
            parent_id = nodo_map.get(grupo.parent_id)
            if parent_id is None:
                continue
        juicios = deepcopy(grupo.juicios) if grupo.juicios else {}
        pesos = deepcopy(grupo.pesos_calculados) if grupo.pesos_calculados else {}
        # Remapear ids de nodos dentro de juicios/pesos si vienen como claves str
        juicios = _remap_json_node_keys(juicios, nodo_map)
        pesos = _remap_json_node_keys(pesos, nodo_map)
        PesoGrupoAhp.objects.update_or_create(
            escenario=dest_escenario,
            parent_id=parent_id,
            defaults={
                'modo': grupo.modo,
                'juicios': juicios,
                'pesos_calculados': pesos,
                'consistency_ratio': grupo.consistency_ratio,
                'lambda_max': grupo.lambda_max,
            },
        )
    return created


def _remap_json_node_keys(data: Any, nodo_map: dict[int, int]) -> Any:
    """Remapea claves numéricas (ids de nodo) en dicts anidados usados por AHP."""
    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            new_k = k
            try:
                kid = int(k)
                if kid in nodo_map:
                    new_k = str(nodo_map[kid])
            except (TypeError, ValueError):
                pass
            out[new_k] = _remap_json_node_keys(v, nodo_map)
        return out
    if isinstance(data, list):
        return [_remap_json_node_keys(x, nodo_map) for x in data]
    return data


def _clone_escenarios_para_dimension(
    *,
    fuente_omoe: Omoe,
    dest_omoe: Omoe,
    dest_proyecto: Proyecto,
    nodo_map: dict[int, int],
    escenario_ids: set[int] | None,
    escenario_estandar_id: int,
) -> dict[int, int]:
    """
    Copia escenarios seleccionados de la dimensión.
    Devuelve src_escenario_id → dest_escenario_id.
    """
    qs = Escenario.objects.filter(omoe=fuente_omoe).order_by('orden', 'id')
    if escenario_ids is not None:
        qs = qs.filter(id__in=escenario_ids)

    esc_map: dict[int, int] = {}
    dest_estandar = Escenario.objects.filter(pk=escenario_estandar_id).first()

    for src in qs:
        es_estandar = (src.nombre or '').strip().lower() == 'estandar'
        if es_estandar and dest_estandar is not None:
            dest = dest_estandar
        else:
            nombre = _unique_escenario_nombre(
                dest_omoe,
                src.nombre if not es_estandar else f'{src.nombre} (importado)',
            )
            dest = Escenario.objects.create(
                proyecto=dest_proyecto,
                omoe=dest_omoe,
                nombre=nombre,
                descripcion=src.descripcion or '',
                peso=_q2(src.peso if src.peso is not None else 0),
                rama_evaluacion=src.rama_evaluacion or dest_omoe.rama_evaluacion,
                orden=src.orden or 0,
            )
        esc_map[src.id] = dest.id
        _clone_configs_escenario(
            src_escenario=src,
            dest_escenario=dest,
            nodo_map=nodo_map,
        )
    return esc_map


def _ensure_plantilla(
    proyecto: Proyecto,
    nombre: str,
    unidad: str,
    orden: int,
    plantilla_cache: dict[str, CaracteristicaPlantilla],
) -> CaracteristicaPlantilla:
    key = (nombre or '').strip().lower()
    if key in plantilla_cache:
        return plantilla_cache[key]
    existing = CaracteristicaPlantilla.objects.filter(
        proyecto=proyecto, nombre__iexact=nombre.strip(),
    ).first()
    if existing:
        plantilla_cache[key] = existing
        return existing
    created = CaracteristicaPlantilla.objects.create(
        proyecto=proyecto,
        nombre=nombre.strip(),
        unidad=unidad or '',
        orden=orden,
        por_defecto=True,
    )
    plantilla_cache[key] = created
    return created


def _clone_alternativas(
    *,
    fuente: Proyecto,
    destino: Proyecto,
    alternativa_ids: set[int] | None,
) -> dict[int, int]:
    qs = Alternativa.objects.filter(proyecto=fuente).prefetch_related(
        'capacidades',
        Prefetch(
            'caracteristicas',
            queryset=Caracteristica.objects.select_related('plantilla'),
        ),
    ).order_by('id')
    if alternativa_ids is not None:
        qs = qs.filter(id__in=alternativa_ids)

    plantilla_cache: dict[str, CaracteristicaPlantilla] = {
        p.nombre.strip().lower(): p
        for p in CaracteristicaPlantilla.objects.filter(proyecto=destino)
    }
    alt_map: dict[int, int] = {}
    for src in qs:
        kwargs = {field: getattr(src, field) for field in ALT_COPY_FIELDS}
        kwargs['nombre'] = _unique_alternativa_nombre(destino, src.nombre)
        kwargs['proyecto'] = destino
        dest = Alternativa.objects.create(**kwargs)
        alt_map[src.id] = dest.id

        for cap in src.capacidades.all():
            Capacidad.objects.create(
                alternativa=dest,
                nombre=cap.nombre,
                descripcion=cap.descripcion or '',
            )

        for idx, car in enumerate(src.caracteristicas.all()):
            if not car.plantilla_id:
                continue
            plantilla = _ensure_plantilla(
                destino,
                car.plantilla.nombre,
                car.plantilla.unidad or '',
                car.plantilla.orden if car.plantilla.orden is not None else idx,
                plantilla_cache,
            )
            Caracteristica.objects.update_or_create(
                alternativa=dest,
                plantilla=plantilla,
                defaults={'dato': car.dato or ''},
            )
    return alt_map


def _clone_valores_evaluacion(
    *,
    fuente: Proyecto,
    alt_map: dict[int, int],
    esc_map: dict[int, int],
    nodo_map: dict[int, int],
) -> int:
    if not alt_map:
        return 0
    qs = ValorEvaluacion.objects.filter(
        alternativa_id__in=alt_map.keys(),
    )
    created = 0
    for val in qs:
        dest_alt = alt_map.get(val.alternativa_id)
        if not dest_alt:
            continue
        dest_esc = None
        if val.escenario_id:
            dest_esc = esc_map.get(val.escenario_id)
            if dest_esc is None:
                continue
        dest_nodo = None
        dest_nodo_id_field = val.nodo_id
        if val.nodo_arbol_id:
            dest_nodo = nodo_map.get(val.nodo_arbol_id)
            if dest_nodo is None:
                continue
            dest_nodo_id_field = dest_nodo
        elif val.nodo_id and val.nivel == 'nodo_arbol':
            dest_nodo_id_field = nodo_map.get(val.nodo_id)
            if dest_nodo_id_field is None:
                continue
            dest_nodo = dest_nodo_id_field

        ValorEvaluacion.objects.update_or_create(
            alternativa_id=dest_alt,
            escenario_id=dest_esc,
            nivel=val.nivel or '',
            nodo_id=dest_nodo_id_field,
            defaults={
                'nodo_arbol_id': dest_nodo,
                'valor': val.valor or '',
            },
        )
        created += 1
    return created


@transaction.atomic
def importar_config_proyecto(
    fuente: Proyecto,
    destino: Proyecto,
    *,
    omoe_ids: list[int] | None = None,
    escenario_ids: list[int] | None = None,
    alternativa_ids: list[int] | None = None,
    incluir_valores: bool = False,
) -> dict[str, Any]:
    """
    Importa configuración seleccionada desde ``fuente`` hacia ``destino``.

    - Si ``omoe_ids`` es None → todas las dimensiones.
    - Si ``escenario_ids`` es None y hay dimensiones → todos los escenarios de esas dims.
    - Si ``alternativa_ids`` es None → no copia alternativas (hay que pedirlas explícitamente
      con lista o con la marca especial ``'all'`` manejada por la vista).
    """
    if fuente.id == destino.id:
        raise ValidationError('No se puede importar la configuración del mismo proyecto.')

    omoe_qs = Omoe.objects.filter(proyecto=fuente).order_by('orden', 'id')
    if omoe_ids is not None:
        omoe_qs = omoe_qs.filter(id__in=omoe_ids)
    omoes = list(omoe_qs)
    if omoe_ids is not None and len(omoes) != len(set(omoe_ids)):
        raise ValidationError('Alguna dimensión seleccionada no pertenece al proyecto origen.')

    esc_filter: set[int] | None = None
    if escenario_ids is not None:
        esc_filter = set(int(x) for x in escenario_ids)

    alt_filter: set[int] | None = None
    if alternativa_ids is not None:
        alt_filter = set(int(x) for x in alternativa_ids)

    omoe_map: dict[int, int] = {}
    nodo_map: dict[int, int] = {}
    esc_map: dict[int, int] = {}
    dims_created = []

    for src_omoe in omoes:
        result = clonar_dimension_en_proyecto(src_omoe, destino)
        omoe_map[src_omoe.id] = result['omoe_id']
        nodo_map.update(result.get('nodo_map') or {})
        dims_created.append({
            'fuente_omoe_id': src_omoe.id,
            'omoe_id': result['omoe_id'],
            'nombre_modelo': result['nombre_modelo'],
            'nodos_copiados': result['nodos_copiados'],
        })
        dest_omoe = Omoe.objects.get(pk=result['omoe_id'])
        partial = _clone_escenarios_para_dimension(
            fuente_omoe=src_omoe,
            dest_omoe=dest_omoe,
            dest_proyecto=destino,
            nodo_map=result.get('nodo_map') or {},
            escenario_ids=esc_filter,
            escenario_estandar_id=result['escenario_estandar_id'],
        )
        esc_map.update(partial)

    alt_map: dict[int, int] = {}
    if alt_filter is not None:
        # Validar pertenencia
        valid = set(
            Alternativa.objects.filter(proyecto=fuente, id__in=alt_filter)
            .values_list('id', flat=True)
        )
        if valid != alt_filter:
            raise ValidationError(
                'Alguna alternativa seleccionada no pertenece al proyecto origen.'
            )
        alt_map = _clone_alternativas(
            fuente=fuente,
            destino=destino,
            alternativa_ids=alt_filter,
        )

    valores_copiados = 0
    if incluir_valores:
        if not alt_map:
            raise ValidationError(
                'Para copiar valores de evaluación debe seleccionar alternativas.'
            )
        if not omoes:
            raise ValidationError(
                'Para copiar valores de evaluación debe seleccionar al menos una dimensión.'
            )
        valores_copiados = _clone_valores_evaluacion(
            fuente=fuente,
            alt_map=alt_map,
            esc_map=esc_map,
            nodo_map=nodo_map,
        )

    return {
        'fuente_proyecto_id': fuente.id,
        'destino_proyecto_id': destino.id,
        'dimensiones': dims_created,
        'escenarios_copiados': len(esc_map),
        'alternativas_copiadas': len(alt_map),
        'valores_copiados': valores_copiados,
        'omoe_map': omoe_map,
        'escenario_map': esc_map,
        'alternativa_map': alt_map,
        'nodos_copiados': len(nodo_map),
    }

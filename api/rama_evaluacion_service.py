"""Estado de ramas OMOE / OMOC / OMOR según escenarios y datos del proyecto."""
from __future__ import annotations

from .evaluacion_rama_choices import RAMA_OMOC, RAMA_OMOE, RAMA_OMOR
from .mcdm_utils import _collect_attribute_nodes
from .models import Alternativa, Escenario, Omoe, Proyecto, VopResultado

RAMAS = (RAMA_OMOE, RAMA_OMOC, RAMA_OMOR)


def build_ramas_status(
    proyecto: Proyecto,
    hierarchy: dict,
    alt_export: dict[str, dict],
) -> tuple[dict[str, dict], list[str]]:
    ramas = {
        r: {'configurada': False, 'con_datos': False, 'dimensiones': []}
        for r in RAMAS
    }
    advertencias: list[str] = []

    for esc in Escenario.objects.filter(proyecto=proyecto):
        rama = esc.rama_evaluacion
        if rama not in ramas:
            continue
        ramas[rama]['configurada'] = True
        ramas[rama]['dimensiones'].append(esc.nombre)

    omoes = Omoe.objects.filter(proyecto=proyecto).prefetch_related(
        'grupos__mops__dps', 'misiones__grupos__mops__dps'
    )
    dp_ids_by_rama: dict[str, set[int]] = {r: set() for r in RAMAS}
    for omoe in omoes:
        rama = getattr(omoe, 'rama_evaluacion', None) or RAMA_OMOE
        for grupo in _iter_grupos(omoe):
            for mop in grupo.mops.filter(aplica=True):
                for dp in mop.dps.all():
                    dp_ids_by_rama[rama].add(dp.id)

    attrs = _collect_attribute_nodes(hierarchy)
    attr_names_by_rama: dict[str, set[str]] = {r: set() for r in RAMAS}
    for attr in attrs:
        branch = (attr.get('_meta') or {}).get('branch', RAMA_OMOE)
        if branch in attr_names_by_rama:
            attr_names_by_rama[branch].add(attr['name'])

    for rama in RAMAS:
        dp_ids = dp_ids_by_rama[rama]
        if dp_ids and VopResultado.objects.filter(
            dp_id__in=dp_ids,
            alternativa__proyecto=proyecto,
        ).exists():
            ramas[rama]['con_datos'] = True
        for name in attr_names_by_rama[rama]:
            for vals in alt_export.values():
                if vals.get(name) not in (None, ''):
                    ramas[rama]['con_datos'] = True
                    break

    if ramas[RAMA_OMOC]['configurada']:
        if Alternativa.objects.filter(proyecto=proyecto, costo__isnull=False).exists():
            ramas[RAMA_OMOC]['con_datos'] = True

    if not ramas[RAMA_OMOE]['configurada']:
        advertencias.append(
            'No hay escenario OMOE. Cree uno en Definición de escenarios.'
        )
    elif not ramas[RAMA_OMOE]['con_datos']:
        advertencias.append('Hay escenario OMOE pero faltan VOPs en alternativas.')

    if not ramas[RAMA_OMOC]['configurada']:
        advertencias.append('No hay escenario OMOC: la columna de costo no aplica.')
    elif not ramas[RAMA_OMOC]['con_datos']:
        advertencias.append('Hay escenario OMOC pero faltan datos de costo o VOPs.')

    if not ramas[RAMA_OMOR]['configurada']:
        advertencias.append('No hay escenario OMOR: la columna de riesgo no aplica.')
    elif not ramas[RAMA_OMOR]['con_datos']:
        advertencias.append('Hay escenario OMOR pero no hay VOPs de riesgo.')

    return ramas, advertencias


def _iter_grupos(omoe: Omoe):
    grupos = list(omoe.grupos.filter(aplica=True))
    if grupos:
        return grupos
    result = []
    for mision in omoe.misiones.filter(aplica=True):
        result.extend(mision.grupos.filter(aplica=True))
    return result

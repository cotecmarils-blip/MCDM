"""
Datos para gráfica de sensibilidad (estilo Expert Choice) sobre el árbol OMOE.
"""
from __future__ import annotations

from typing import Any

from .mcdm_utils import (
    _evaluate_node,
    _normalize_weights,
    build_alternatives_export,
    build_hierarchy_export,
    get_omoe_for_export,
)
from .models import Alternativa, Omoe, Proyecto

ALT_COLORS = [
    '#1f4ed8', '#e3342f', '#38a169', '#8b4513', '#d69e2e',
    '#7c3aed', '#0891b2', '#be185d', '#4b5563', '#ea580c',
]

TOLERANCE = 0.001


def _node_key(node: dict) -> str | None:
    meta = node.get('_meta') or {}
    for level, field in (
        ('dp', 'dp_id'),
        ('mop', 'mop_id'),
        ('grupo', 'grupo_id'),
        ('mision', 'mision_id'),
    ):
        if meta.get(field):
            return f'{level}:{meta[field]}'
    if node.get('type') == 'Criterion' and not meta:
        return 'root'
    return None


def _find_node_by_key(node: dict, key: str) -> dict | None:
    if _node_key(node) == key or (key == 'root' and node.get('type') == 'Criterion'):
        return node
    for child in node.get('children') or []:
        found = _find_node_by_key(child, key)
        if found:
            return found
    return None


def _build_tree_ui(node: dict, parent_key: str | None = None) -> dict:
    key = _node_key(node) or parent_key or 'root'
    children = [_build_tree_ui(c, key) for c in node.get('children') or []]
    lw = float(node.get('local_weight') or 0)
    return {
        'key': key,
        'name': node.get('name', ''),
        'type': node.get('type', 'Criterion'),
        'localWeight': round(lw, 4),
        'children': children,
    }


def _child_weights(children: list[dict]) -> dict[str, float]:
    if not children:
        return {}
    items = [(i, c) for i, c in enumerate(children)]
    raw = {i: float(c.get('local_weight') or 0) for i, c in items}

    class _Item:
        def __init__(self, idx, weight):
            self.id = idx
            self.peso = weight

    wmap = _normalize_weights([_Item(i, raw[i]) for i in raw], weight_attr='peso')
    return {children[i]['name']: round(wmap.get(i, 0), 6) for i in range(len(children))}


def _score_child(child: dict, values: dict[str, Any]) -> float:
    util, _ = _evaluate_node(child, values)
    return max(0.0, float(util))


def _normalize_columns(
    criteria: list[str],
    scores_by_alt: dict[str, dict[str, float]],
) -> dict[str, dict[str, float]]:
    result: dict[str, dict[str, float]] = {alt: {} for alt in scores_by_alt}
    for crit in criteria:
        col = {alt: scores_by_alt[alt].get(crit, 0.0) for alt in scores_by_alt}
        total = sum(col.values())
        if total <= TOLERANCE:
            n = len(scores_by_alt) or 1
            for alt in scores_by_alt:
                result[alt][crit] = round(1.0 / n, 6)
        else:
            for alt in scores_by_alt:
                result[alt][crit] = round(col[alt] / total, 6)
    return result


def build_sensitivity_payload(
    proyecto: Proyecto,
    omoe: Omoe | None = None,
    selected_key: str = 'root',
) -> dict[str, Any]:
    omoe = omoe or get_omoe_for_export(proyecto)
    if omoe is None:
        return {
            'mensaje': 'No hay modelo OMOE definido para este proyecto.',
            'tree': None,
        }

    hierarchy = build_hierarchy_export(omoe, strip_meta=False)
    alt_export = build_alternatives_export(proyecto, omoe)
    alternativas = list(Alternativa.objects.filter(proyecto=proyecto).order_by('id'))

    if not alternativas:
        return {
            'mensaje': 'No hay alternativas definidas.',
            'tree': _build_tree_ui(hierarchy),
        }

    selected = _find_node_by_key(hierarchy, selected_key) or hierarchy
    children = list(selected.get('children') or [])
    criteria = [c['name'] for c in children]

    if not criteria:
        return {
            'mensaje': 'El nodo seleccionado no tiene criterios hijos para analizar.',
            'tree': _build_tree_ui(hierarchy),
            'selectedNode': selected_key,
            'selectedNodeName': selected.get('name', ''),
        }

    weights = _child_weights(children)
    scores_raw: dict[str, dict[str, float]] = {}
    for alt in alternativas:
        values = alt_export.get(alt.nombre, {})
        row = {}
        for child in children:
            row[child['name']] = _score_child(child, values)
        scores_raw[alt.nombre] = row

    local_priorities = _normalize_columns(criteria, scores_raw)

    alt_payload = [
        {
            'id': alt.id,
            'name': alt.nombre,
            'color': ALT_COLORS[idx % len(ALT_COLORS)],
        }
        for idx, alt in enumerate(alternativas)
    ]

    return {
        'omoe_id': omoe.id,
        'omoe_nombre': omoe.nombre_modelo,
        'proyecto_id': proyecto.id,
        'tree': _build_tree_ui(hierarchy),
        'selectedNode': selected_key,
        'selectedNodeName': selected.get('name', ''),
        'criteria': criteria,
        'weights': weights,
        'localPriorities': local_priorities,
        'alternatives': alt_payload,
        'motor': 'pyDecisionMaking',
    }

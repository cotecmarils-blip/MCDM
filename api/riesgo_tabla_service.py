"""Tablas de referencia de riesgo (probabilidad e impacto) por proyecto."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db import transaction

from .models import NivelImpacto, NivelProbabilidad, Proyecto


DEFAULT_PROBABILIDADES = [
    (Decimal('0.1'), 'Remoto', 1),
    (Decimal('0.3'), 'Improbable', 2),
    (Decimal('0.5'), 'Probable', 3),
    (Decimal('0.7'), 'Altamente probable', 4),
    (Decimal('0.9'), 'Casi seguro', 5),
]

DEFAULT_IMPACTOS = [
    (
        Decimal('0.1'),
        'Consecuencia mínima o sin consecuencia sobre el desempeño técnico.',
        'Impacto mínimo o inexistente.',
        'Impacto mínimo o nulo en el presupuesto del proyecto.',
        1,
    ),
    (
        Decimal('0.3'),
        (
            'Reducción mínima sobre el desempeño técnico, puede ser tolerado '
            'con un mínimo o insignificante impacto.'
        ),
        'Requerimiento de recursos adicionales. Puede cumplir plazos.',
        'Impacto requiere aumentar el presupuesto hasta en un 5%.',
        2,
    ),
    (
        Decimal('0.5'),
        (
            'Reducción moderada sobre el desempeño técnico con limitado impacto '
            'sobre los objetivos del proyecto.'
        ),
        'Menor aplazamiento en hitos. No puede cumplir fechas requeridas.',
        'Impacto requiere aumentar el presupuesto hasta entre un 5% y 7%.',
        3,
    ),
    (
        Decimal('0.7'),
        (
            'Reducción significativa sobre el desempeño técnico, podría poner '
            'en peligro el éxito del proyecto.'
        ),
        'Mayor aplazamiento en hitos o ruta crítica impactada.',
        'Impacto requiere aumentar el presupuesto hasta entre un 7% y 10%.',
        4,
    ),
    (
        Decimal('0.9'),
        (
            'Reducción severa sobre el desempeño técnico; no puede alcanzar '
            'parámetros mínimos de desempeño.'
        ),
        'No puede cumplir con un hito importante del proyecto.',
        'Impacto requiere aumentar el presupuesto a más del 10%.',
        5,
    ),
]


def ensure_tablas_riesgo(proyecto: Proyecto) -> None:
    """Crea filas por defecto (Tablas 29 y 30) si el proyecto no las tiene."""
    if not proyecto.niveles_probabilidad.exists():
        NivelProbabilidad.objects.bulk_create([
            NivelProbabilidad(
                proyecto=proyecto,
                valor=valor,
                descripcion=desc,
                orden=orden,
            )
            for valor, desc, orden in DEFAULT_PROBABILIDADES
        ])
    if not proyecto.niveles_impacto.exists():
        NivelImpacto.objects.bulk_create([
            NivelImpacto(
                proyecto=proyecto,
                valor=valor,
                descripcion_desempeno=desp,
                descripcion_cronograma=cron,
                descripcion_costo=costo,
                orden=orden,
            )
            for valor, desp, cron, costo, orden in DEFAULT_IMPACTOS
        ])


def _serialize_prob(row: NivelProbabilidad) -> dict[str, Any]:
    return {
        'id': row.id,
        'valor': float(row.valor),
        'descripcion': row.descripcion,
        'orden': row.orden,
    }


def _serialize_imp(row: NivelImpacto, tipo: str = NivelImpacto.TIPO_DESEMPENO) -> dict[str, Any]:
    return {
        'id': row.id,
        'valor': float(row.valor),
        'descripcion': row.descripcion_para(tipo),
        'descripcion_desempeno': row.descripcion_desempeno,
        'descripcion_cronograma': row.descripcion_cronograma,
        'descripcion_costo': row.descripcion_costo,
        'orden': row.orden,
    }


def get_tablas_riesgo_payload(proyecto: Proyecto) -> dict[str, Any]:
    ensure_tablas_riesgo(proyecto)
    probs = list(proyecto.niveles_probabilidad.order_by('orden', 'valor'))
    imps = list(proyecto.niveles_impacto.order_by('orden', 'valor'))
    return {
        'probabilidades': [_serialize_prob(p) for p in probs],
        'impactos': [_serialize_imp(i) for i in imps],
        'tipos_consecuencia': [
            {'value': k, 'label': v}
            for k, v in NivelImpacto.TIPO_CONSECUENCIA_CHOICES
        ],
    }


def _parse_decimal(val) -> Decimal:
    return Decimal(str(val).replace(',', '.'))


@transaction.atomic
def save_tablas_riesgo(proyecto: Proyecto, data: dict[str, Any]) -> dict[str, Any]:
    ensure_tablas_riesgo(proyecto)

    prob_items = data.get('probabilidades')
    if isinstance(prob_items, list):
        by_id = {p.id: p for p in proyecto.niveles_probabilidad.all()}
        for row in prob_items:
            item = by_id.get(row.get('id'))
            if not item:
                continue
            desc = (row.get('descripcion') or '').strip()
            if desc:
                item.descripcion = desc
            if row.get('valor') is not None:
                item.valor = _parse_decimal(row['valor'])
            if row.get('orden') is not None:
                item.orden = int(row['orden'])
            item.save()

    imp_items = data.get('impactos')
    if isinstance(imp_items, list):
        by_id = {i.id: i for i in proyecto.niveles_impacto.all()}
        for row in imp_items:
            item = by_id.get(row.get('id'))
            if not item:
                continue
            if row.get('valor') is not None:
                item.valor = _parse_decimal(row['valor'])
            if row.get('orden') is not None:
                item.orden = int(row['orden'])
            for field in ('descripcion_desempeno', 'descripcion_cronograma', 'descripcion_costo'):
                if field in row and row[field] is not None:
                    setattr(item, field, str(row[field]).strip())
            item.save()

    return get_tablas_riesgo_payload(proyecto)

"""Ramas OMOE / OMOC / OMOR para clasificación manual de criterios."""

RAMA_AUTO = 'auto'
RAMA_OMOE = 'omoe'
RAMA_OMOC = 'omoc'
RAMA_OMOR = 'omor'

RAMA_EVALUACION_CHOICES = [
    (RAMA_AUTO, 'Inferir automáticamente (por nombre)'),
    (RAMA_OMOE, 'OMOE — Efectividad / desempeño'),
    (RAMA_OMOC, 'OMOC — Costo'),
    (RAMA_OMOR, 'OMOR — Riesgo'),
]

RAMA_EVALUACION_VALUES = {c[0] for c in RAMA_EVALUACION_CHOICES}

RAMA_LABELS = {
    RAMA_AUTO: 'Auto',
    RAMA_OMOE: 'OMOE',
    RAMA_OMOC: 'OMOC',
    RAMA_OMOR: 'OMOR',
}

RAMAS_DIMENSION = (RAMA_OMOE, RAMA_OMOC, RAMA_OMOR)

RAMA_NIVEL_ARBOL_CHOICES = [
    (RAMA_OMOE, 'OMOE — Efectividad / desempeño'),
    (RAMA_OMOC, 'OMOC — Costo'),
    (RAMA_OMOR, 'OMOR — Riesgo'),
]

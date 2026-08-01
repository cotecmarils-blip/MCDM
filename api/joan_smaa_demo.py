"""Datos del ejemplo de referencia SMAA (matriz A–F / OMOC·OMOE·OMOR)."""
from __future__ import annotations

from typing import Any

from .stochastic_smaa_bridge import run_smaa_macro, run_smaa_meso_macro

JOAN_ALTERNATIVES = ['A', 'B', 'C', 'D', 'E', 'F']
JOAN_CRITERIA = ['OMOC', 'OMOE', 'OMOR']
JOAN_DIRECTIONS = ['cost', 'benefit', 'cost']

# §13.1 — matriz macro fija sin normalizar
JOAN_MACRO_MATRIX = [
    [170.0, 0.6393, 0.2300],
    [195.0, 0.7090, 0.3000],
    [128.0, 0.6716, 0.7000],
    [188.0, 0.6138, 0.8000],
    [115.0, 0.6442, 0.1000],
    [135.0, 0.5642, 0.4000],
]

JOAN_MACRO_WEIGHTS = [1 / 3, 1 / 3, 1 / 3]

# §14.1 — OMOE por contexto (z1, z2)
JOAN_OMOC = [170.0, 195.0, 128.0, 188.0, 115.0, 135.0]
JOAN_OMOR = [0.2300, 0.3000, 0.7000, 0.8000, 0.1000, 0.4000]
JOAN_OMOE_CONTEXTS = [
    [0.6200, 0.66825],
    [0.7350, 0.6700],
    [0.6500, 0.7040],
    [0.5900, 0.6495],
    [0.6750, 0.5980],
    [0.5350, 0.6080],
]
JOAN_MESO_WEIGHTS = [0.60, 0.40]
JOAN_CONTEXT_LABELS = ['Contexto 1', 'Contexto 2']


def run_joan_guide_demo(
    *,
    nivel: str = 'macro',
    muestras: int | None = None,
    seed: int | None = None,
    sampling_method: str = 'mc',
) -> dict[str, Any]:
    """Ejecuta el ejemplo numérico de la guía (web-friendly: menos iters que el PDF).

    El PDF usa hasta 65k–98k; aquí el tope lo limita el motor web (~16k) para
    Railway. Concentración=3 + pesos iguales ≈ Dirichlet(1,1,1) del notebook.
    """
    nivel_norm = (nivel or 'macro').strip().lower().replace('-', '_').replace('–', '_')
    if nivel_norm in ('meso', 'mesomacro', 'meso_macro', 'macro_meso'):
        nivel_norm = 'meso_macro'
    else:
        nivel_norm = 'macro'

    n = int(muestras if muestras is not None else 4096)
    n = max(256, min(16384, n))
    # alpha = concentration * equal weights ≈ ones → uniforme como el PDF
    kappa = 3.0
    demo_seed = int(seed if seed is not None else (20260716 if nivel_norm == 'meso_macro' else 20260715))

    if nivel_norm == 'meso_macro':
        payload = run_smaa_meso_macro(
            alternatives=JOAN_ALTERNATIVES,
            omoc=JOAN_OMOC,
            omor=JOAN_OMOR,
            omoe_contexts=JOAN_OMOE_CONTEXTS,
            directions=JOAN_DIRECTIONS,
            nominal_macro_weights=JOAN_MACRO_WEIGHTS,
            nominal_meso_weights=JOAN_MESO_WEIGHTS,
            muestras=n,
            concentracion=kappa,
            concentracion_meso=2.0,
            seed=demo_seed,
            aggregation='additive',
            sampling_method=sampling_method or 'mc',
            admissibility_threshold=0.40,
            context_labels=JOAN_CONTEXT_LABELS,
            surface_resolution=28,
            uniform_dirichlet=True,
        )
    else:
        payload = run_smaa_macro(
            alternatives=JOAN_ALTERNATIVES,
            criteria=JOAN_CRITERIA,
            matrix=JOAN_MACRO_MATRIX,
            directions=JOAN_DIRECTIONS,
            nominal_weights=JOAN_MACRO_WEIGHTS,
            muestras=n,
            concentracion=kappa,
            seed=demo_seed,
            aggregation='additive',
            matrix_already_normalized=False,
            sampling_method=sampling_method or 'mc',
            admissibility_threshold=0.40,
            surface_resolution=28,
            uniform_dirichlet=True,
        )

    payload['ejemplo_referencia'] = True
    payload['ejemplo_joan'] = True  # compatibilidad
    payload['metodo_madm'] = 'wsm'
    payload['metodo_madm_label'] = 'WSM (aditiva)'
    payload['guia'] = (
        'Ejemplo numérico de referencia '
        f'({"meso–macro" if nivel_norm == "meso_macro" else "macro"})'
    )
    payload['descripcion'] = (
        'Demo con matriz de referencia (alternativas A–F, OMOC/OMOE/OMOR). '
        'Iteraciones acotadas para la web; metodología alineada a SMAA '
        '(Dirichlet casi uniforme, umbral admisibilidad 0.40, agregación aditiva, '
        'normalización direccional).'
    )
    return payload

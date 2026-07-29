"""COPRAS clásico (Zavadskas et al.), independiente de pymcdm.

pymcdm.methods.COPRAS reduce algebraicamente a Q = S⁺ + S⁻ y puede cambiar
el ganador frente a la fórmula de ponderación inversa documentada:

    Q_i = S⁺_i + (Σ S⁻_j) / (S⁻_i · Σ(1/S⁻_j))

Ver notebook ``03_Validacion_10_Metodos_MADM.ipynb``, sección 4.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import numpy.typing as npt


class ClassicalCOPRAS:
    """Misma interfaz callable que ``pymcdm.methods.COPRAS``: (matrix, weights, types) → prefs."""

    def __init__(self, epsilon: float = 1e-12) -> None:
        self._epsilon = float(epsilon)

    def __call__(
        self,
        matrix: npt.NDArray[np.float64] | Any,
        weights: npt.NDArray[np.float64] | Any,
        types: npt.NDArray[np.int64] | Any,
    ) -> npt.NDArray[np.float64]:
        x = np.asarray(matrix, dtype=np.float64)
        w = np.asarray(weights, dtype=np.float64)
        t = np.asarray(types, dtype=np.int64)

        if x.ndim != 2:
            raise ValueError('COPRAS matrix must be 2-dimensional.')
        if w.ndim != 1 or w.shape[0] != x.shape[1]:
            raise ValueError('COPRAS weights length must match criteria count.')
        if t.shape[0] != x.shape[1]:
            raise ValueError('COPRAS types length must match criteria count.')

        col_sums = np.sum(x, axis=0)
        # Evitar división por cero en columnas nulas.
        col_sums = np.where(np.abs(col_sums) <= self._epsilon, 1.0, col_sums)
        nmatrix = x / col_sums
        wmatrix = nmatrix * w

        benefit = t == 1
        cost = t == -1
        sp = np.sum(wmatrix[:, benefit], axis=1) if np.any(benefit) else np.zeros(x.shape[0])

        if not np.any(cost):
            # Sin criterios de costo: preferencia proporcial a S⁺.
            q = sp
        else:
            sm = np.sum(wmatrix[:, cost], axis=1)
            sm = np.maximum(sm, self._epsilon)
            inv_sum = np.sum(1.0 / sm)
            q = sp + (np.sum(sm) / (sm * inv_sum))

        q_max = float(np.max(q))
        if q_max <= self._epsilon:
            return np.zeros(x.shape[0], dtype=np.float64)
        return q / q_max

    def rank(self, scores: npt.NDArray[np.float64] | Any) -> npt.NDArray[np.int64]:
        """Mayor score de preferencia = mejor (posición 1)."""
        s = np.asarray(scores, dtype=np.float64)
        order = np.argsort(-s)
        ranking = np.empty_like(order, dtype=np.int64)
        ranking[order] = np.arange(1, len(s) + 1)
        return ranking

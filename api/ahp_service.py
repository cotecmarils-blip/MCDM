"""Cálculo AHP (Saaty): matriz de comparaciones pareadas, pesos y razón de consistencia."""

from __future__ import annotations

from typing import Any

import numpy as np

SAATY_SCALE: list[float] = [
    1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2,
    1, 2, 3, 4, 5, 6, 7, 8, 9,
]

SAATY_LABELS: dict[float, str] = {
    1: 'Igual importancia',
    2: 'Poco más',
    3: 'Moderadamente más',
    4: 'Bastante más',
    5: 'Fuertemente más',
    6: 'Muy fuertemente',
    7: 'Extremadamente',
    8: 'Absolutamente',
    9: 'Extremo absoluto',
}

RI_TABLE: dict[int, float] = {
    1: 0.0,
    2: 0.0,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
}

CR_THRESHOLD = 0.10


def juicio_key(a: int, b: int) -> str:
    i, j = (a, b) if a < b else (b, a)
    return f'{i}_{j}'


def is_valid_saaty(value: float) -> bool:
    """Compatibilidad: acepta cualquier número positivo finito (entrada libre)."""
    return is_valid_juicio(value)


def is_valid_juicio(value: float) -> bool:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return False
    return v > 0 and v < float('inf')


def saaty_label(value: float) -> str:
    for k, label in SAATY_LABELS.items():
        if abs(float(value) - k) < 1e-6:
            return label
    inv = 1.0 / float(value)
    for k, label in SAATY_LABELS.items():
        if abs(inv - k) < 1e-6:
            return f'Inverso: {label.lower()}'
    return str(value)


def get_juicio(juicios: dict[str, Any], i: int, j: int) -> float:
    if i == j:
        return 1.0
    a, b = (i, j) if i < j else (j, i)
    key = f'{a}_{b}'
    if key not in juicios:
        return 1.0
    val = float(juicios[key])
    if i < j:
        return val
    return 1.0 / val


def build_matrix(nodo_ids: list[int], juicios: dict[str, Any]) -> np.ndarray:
    n = len(nodo_ids)
    matrix = np.ones((n, n), dtype=float)
    for i in range(n):
        for j in range(i + 1, n):
            val = get_juicio(juicios, nodo_ids[i], nodo_ids[j])
            matrix[i, j] = val
            matrix[j, i] = 1.0 / val
    return matrix


def weights_from_matrix(matrix: np.ndarray) -> tuple[np.ndarray, float]:
    eigenvalues, eigenvectors = np.linalg.eig(matrix)
    idx = int(np.argmax(eigenvalues.real))
    lambda_max = float(eigenvalues.real[idx])
    weights = np.abs(eigenvectors[:, idx].real)
    total = weights.sum()
    if total <= 0:
        n = matrix.shape[0]
        return np.full(n, 1.0 / n), lambda_max
    return weights / total, lambda_max


def consistency_ratio(matrix: np.ndarray, lambda_max: float) -> float:
    n = matrix.shape[0]
    if n < 2:
        return 0.0
    ci = (lambda_max - n) / (n - 1)
    ri = RI_TABLE.get(n, 1.49)
    if ri <= 0:
        return 0.0
    return float(ci / ri)


def compute_ahp(
    nodo_ids: list[int],
    juicios: dict[str, Any],
) -> dict[str, Any]:
    """Calcula matriz, pesos (%) y CR para un grupo de nodos activos."""
    n = len(nodo_ids)
    if n == 0:
        return {
            'nodo_ids': [],
            'matriz': [],
            'pesos': [],
            'consistency_ratio': None,
            'consistency_ok': True,
            'lambda_max': None,
        }
    if n == 1:
        return {
            'nodo_ids': nodo_ids,
            'matriz': [[1.0]],
            'pesos': [{'nodo_id': nodo_ids[0], 'peso': 100.0}],
            'consistency_ratio': 0.0,
            'consistency_ok': True,
            'lambda_max': 1.0,
        }

    matrix = build_matrix(nodo_ids, juicios)
    weights, lambda_max = weights_from_matrix(matrix)
    cr = consistency_ratio(matrix, lambda_max)

    pesos = [
        {'nodo_id': nid, 'peso': round(float(w) * 100.0, 2)}
        for nid, w in zip(nodo_ids, weights)
    ]
    matriz = [[round(float(matrix[i, j]), 4) for j in range(n)] for i in range(n)]

    return {
        'nodo_ids': nodo_ids,
        'matriz': matriz,
        'pesos': pesos,
        'consistency_ratio': round(cr, 4),
        'consistency_ok': cr <= CR_THRESHOLD,
        'lambda_max': round(lambda_max, 4),
    }

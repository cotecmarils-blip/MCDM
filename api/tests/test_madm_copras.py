"""COPRAS clásico vs pymcdm (bug conocido) y cableado en MADMRanker."""
from django.test import SimpleTestCase
import numpy as np
from pymcdm.methods import COPRAS as PymcdmCopras

from api.madm_copras import ClassicalCOPRAS
from api.madm_ranker import MADMRanker, MatrixOrientation


# Ejemplo oficial de pymcdm.methods.COPRAS (notebook 03, sección 4).
MATRIX = np.array(
    [
        [1543, 2000, 39000, 15, 13.76, 3.86, 5, 3, 5000],
        [1496, 3600, 43000, 14, 14, 2.5, 4, 4, 4000],
        [1584, 3100, 24500, 10, 13.1, 3.7, 2, 2, 3500],
        [1560, 2700, 36000, 12, 13.2, 3.2, 3, 3, 3500],
        [1572, 2500, 31500, 13, 13.3, 3.4, 3, 2, 3500],
        [1580, 2400, 20000, 12, 12.8, 3.9, 2, 2, 3000],
    ],
    dtype=float,
)
WEIGHTS = np.array([0.2027, 0.1757, 0.1622, 0.1351, 0.1081, 0.0946, 0.0676, 0.0405, 0.0135])
TYPES = np.array([-1, -1, -1, 1, 1, -1, 1, 1, 1])
DIRECTIONS = [
    'min', 'min', 'min', 'max', 'max', 'min', 'max', 'max', 'max',
]
DIMS = [f'C{i}' for i in range(1, 10)]
ALTS = [f'A{i}' for i in range(1, 7)]


class ClassicalCoprasTests(SimpleTestCase):
    def test_matches_documented_formula_and_beats_pymcdm_winner(self):
        classic = ClassicalCOPRAS()(MATRIX, WEIGHTS, TYPES)
        naive_pymcdm = PymcdmCopras()(MATRIX, WEIGHTS, TYPES)

        # Fórmula documentada (notebook): ganador Alternativa 1 (índice 0).
        self.assertEqual(int(np.argmax(classic)), 0)
        # pymcdm incorrecto: ganador Alternativa 2 (índice 1).
        self.assertEqual(int(np.argmax(naive_pymcdm)), 1)
        self.assertFalse(np.allclose(classic, naive_pymcdm, atol=1e-3))

        expected = np.array([1.0, 0.9167, 0.8675, 0.9084, 0.9315, 0.9486])
        np.testing.assert_allclose(classic, expected, atol=1e-3)

    def test_ranker_uses_classical_copras(self):
        ranker = MADMRanker(
            MATRIX,
            alternatives=ALTS,
            dimensions=DIMS,
            directions=DIRECTIONS,
            matrix_orientation=MatrixOrientation.ORIGINAL_DIRECTIONS,
        )
        result = ranker.rank('copras', weights=WEIGHTS)
        self.assertEqual(result.best_alternative, 'A1')
        self.assertEqual(int(result.best_index), 0)
        np.testing.assert_allclose(
            result.scores,
            np.array([1.0, 0.9167, 0.8675, 0.9084, 0.9315, 0.9486]),
            atol=1e-3,
        )

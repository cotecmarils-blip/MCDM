"""Vectorial vs vectorial direccional: fórmulas distintas y correctas."""
from django.test import SimpleTestCase
import numpy as np

from api.matrix_normalizer import NonDominatedNormalizer


MATRIX = [
    [10.0, 2.0],
    [20.0, 8.0],
    [30.0, 4.0],
]
DIRS = ['max', 'min']
DIMS = ['beneficio', 'costo']
ALTS = ['A', 'B', 'C']


class DirectionalVectorNormalizationTests(SimpleTestCase):
    def setUp(self):
        self.norm = NonDominatedNormalizer(
            MATRIX,
            pareto_indices=[0, 1, 2],
            directions=DIRS,
            dimensions=DIMS,
            alternatives=ALTS,
        )

    def test_vector_and_directional_differ_on_cost(self):
        vector = self.norm.normalize('vector').normalized_matrix
        directional = self.norm.normalize('directional_vector').normalized_matrix

        np.testing.assert_allclose(vector[:, 0], directional[:, 0], atol=1e-12)
        self.assertFalse(np.allclose(vector[:, 1], directional[:, 1]))

    def test_directional_cost_uses_reciprocal_then_norm(self):
        result = self.norm.normalize('directional_vector').normalized_matrix
        cost = np.array([2.0, 8.0, 4.0])
        inv = 1.0 / cost
        expected = inv / np.linalg.norm(inv)
        np.testing.assert_allclose(result[:, 1], expected, atol=1e-12)
        # Menor costo → mayor valor normalizado
        self.assertGreater(result[0, 1], result[1, 1])

    def test_plain_vector_keeps_raw_euclidean(self):
        result = self.norm.normalize('vector').normalized_matrix
        col = np.array([2.0, 8.0, 4.0])
        expected = col / np.linalg.norm(col)
        np.testing.assert_allclose(result[:, 1], expected, atol=1e-12)

from django.test import SimpleTestCase

from api.simulacion_sensibilidad_service import (
    build_stochastic_sensibilidad_from_resultado,
)


def _resultado_fixture():
    return {
        'ok': True,
        'opciones_calculo': {
            'metodo_madm': 'topsis',
            'metodo_pesos': 'equal_weights',
            'normalizacion_metodo': 'directional_minmax',
            'direcciones': {'1': 'max', '2': 'max'},
        },
        'pesos': {
            'method': 'equal_weights',
            'weights': [0.5, 0.5],
            'weights_by_dimension': {'Efectividad': 0.5, 'Costo': 0.5},
        },
        'madm': {
            'method': 'topsis',
            'scores_by_alternative': {'A': 0.7, 'B': 0.4},
            'ranking_by_alternative': {'A': 1, 'B': 2},
            'best_alternative': 'A',
        },
        'normalizacion': {
            'dimensions': ['Efectividad', 'Costo'],
            'normalized_matrix': [
                [0.9, 0.4],
                [0.5, 0.8],
            ],
            'pareto_alternatives': ['A', 'B'],
            'directions': ['max', 'max'],
        },
        'alternativas': [
            {
                'id': 1,
                'nombre': 'A',
                'dimensiones': [
                    {'omoe_id': 1, 'omoe_nombre': 'Efectividad', 'rama_evaluacion': 'omoe'},
                    {'omoe_id': 2, 'omoe_nombre': 'Costo', 'rama_evaluacion': 'omoc'},
                ],
            },
            {
                'id': 2,
                'nombre': 'B',
                'dimensiones': [
                    {'omoe_id': 1, 'omoe_nombre': 'Efectividad', 'rama_evaluacion': 'omoe'},
                    {'omoe_id': 2, 'omoe_nombre': 'Costo', 'rama_evaluacion': 'omoc'},
                ],
            },
        ],
    }


class StochasticSensibilidadTests(SimpleTestCase):
    def test_smaa_macro_devuelve_metricas_guia(self):
        payload = build_stochastic_sensibilidad_from_resultado(
            _resultado_fixture(),
            muestras=256,
            concentracion=30,
            seed=7,
        )

        self.assertTrue(payload.get('ok'), payload.get('mensaje'))
        self.assertEqual(payload['tipo'], 'sensibilidad_estocastica_smaa')
        self.assertGreaterEqual(payload['muestras'], 128)
        self.assertEqual(len(payload['alternatives']), 2)
        self.assertIn('rank_acceptability', payload)
        self.assertIn('robustness_dashboard', payload)
        self.assertIn('pairwise_preference', payload)
        self.assertTrue(payload.get('convergence'))

        win_sum = sum(item['win_probability'] for item in payload['alternatives'])
        self.assertAlmostEqual(win_sum, 1.0, places=5)
        for item in payload['alternatives']:
            self.assertEqual(len(item['rank_frequency']), 2)
            self.assertAlmostEqual(sum(item['rank_frequency']), 1.0, places=5)

    def test_muestras_se_acotan(self):
        payload = build_stochastic_sensibilidad_from_resultado(
            _resultado_fixture(),
            muestras=10,
            concentracion=1,
            seed=1,
        )
        self.assertTrue(payload.get('ok'), payload.get('mensaje'))
        self.assertGreaterEqual(payload['muestras'], 50)
        self.assertGreaterEqual(payload['concentracion'], 2.0)

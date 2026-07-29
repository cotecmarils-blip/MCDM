import json

from django.test import SimpleTestCase

from api.simulacion_sensibilidad_service import (
    build_stochastic_sensibilidad_from_resultado,
    extract_meso_macro_inputs,
)
from api.stochastic_smaa_bridge import run_smaa_meso_macro


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


def _resultado_meso_fixture():
    """Tres ramas + dos contextos OMOE (selección)."""
    def dim(omoe_id, nombre, rama, valor, por=None):
        d = {
            'omoe_id': omoe_id,
            'omoe_nombre': nombre,
            'rama_evaluacion': rama,
            'valor': valor,
        }
        if por is not None:
            d['escenarios_resumen'] = {'por_escenario': por}
        return d

    por_a = [
        {'escenario_id': 11, 'nombre': 'Paz', 'valor': 0.8, 'peso': 60},
        {'escenario_id': 12, 'nombre': 'Conflicto', 'valor': 0.5, 'peso': 40},
    ]
    por_b = [
        {'escenario_id': 11, 'nombre': 'Paz', 'valor': 0.6, 'peso': 60},
        {'escenario_id': 12, 'nombre': 'Conflicto', 'valor': 0.7, 'peso': 40},
    ]
    return {
        'ok': True,
        'opciones_calculo': {'metodo_madm': 'wsm'},
        'pesos': {
            'weights_by_dimension': {
                'Costo': 0.3,
                'Efectividad': 0.5,
                'Riesgo': 0.2,
            },
        },
        'madm': {'method': 'wsm'},
        'normalizacion': {
            'dimensions': ['Costo', 'Efectividad', 'Riesgo'],
            'normalized_matrix': [
                [0.7, 0.8, 0.6],
                [0.5, 0.6, 0.7],
            ],
            'pareto_alternatives': ['A', 'B'],
            'directions': ['min', 'max', 'min'],
        },
        'alternativas': [
            {
                'nombre': 'A',
                'dimensiones': [
                    dim(2, 'Costo', 'omoc', 120),
                    dim(1, 'Efectividad', 'omoe', 0.7, por_a),
                    dim(3, 'Riesgo', 'omor', 0.2),
                ],
            },
            {
                'nombre': 'B',
                'dimensiones': [
                    dim(2, 'Costo', 'omoc', 150),
                    dim(1, 'Efectividad', 'omoe', 0.55, por_b),
                    dim(3, 'Riesgo', 'omor', 0.15),
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
        self.assertEqual(payload['nivel'], 'macro')
        self.assertGreaterEqual(payload['muestras'], 128)
        self.assertEqual(len(payload['alternatives']), 2)
        self.assertIn('rank_acceptability', payload)
        self.assertIn('robustness_dashboard', payload)
        self.assertIn('pairwise_preference', payload)
        self.assertIn('kendall_tau', payload)
        self.assertIn('conditional_macro_weights', payload)
        self.assertTrue(payload.get('convergence'))

        win_sum = sum(item['win_probability'] for item in payload['alternatives'])
        self.assertAlmostEqual(win_sum, 1.0, places=5)
        for item in payload['alternatives']:
            self.assertEqual(len(item['rank_frequency']), 2)
            self.assertAlmostEqual(sum(item['rank_frequency']), 1.0, places=5)
        # DRF JSONRenderer (strict) rechaza nan/inf — mismo criterio aquí.
        json.dumps(payload, allow_nan=False)

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

    def test_admissibility_en_dashboard(self):
        payload = build_stochastic_sensibilidad_from_resultado(
            _resultado_fixture(),
            muestras=256,
            concentracion=40,
            seed=3,
            admissibility_threshold=0.3,
        )
        self.assertTrue(payload.get('ok'), payload.get('mensaje'))
        self.assertEqual(payload['admissibility_threshold'], 0.3)
        row = payload['robustness_dashboard'][0]
        self.assertIn('P(admisible)', row)

    def test_meso_macro_con_dos_contextos(self):
        inputs, err = extract_meso_macro_inputs(_resultado_meso_fixture())
        self.assertIsNone(err, err)
        self.assertEqual(len(inputs['omoe_contexts'][0]), 2)

        payload = build_stochastic_sensibilidad_from_resultado(
            _resultado_meso_fixture(),
            muestras=256,
            concentracion=25,
            seed=5,
            nivel='meso_macro',
        )
        self.assertTrue(payload.get('ok'), payload.get('mensaje'))
        self.assertEqual(payload['nivel'], 'meso_macro')
        self.assertIn('surfaces_3d', payload)
        self.assertTrue(payload.get('ternary_winner_map'))
        self.assertIsNotNone(payload.get('omoe_derived_distribution'))
        json.dumps(payload, allow_nan=False)

    def test_meso_directo_bridge(self):
        payload = run_smaa_meso_macro(
            alternatives=['A', 'B', 'C'],
            omoc=[100, 120, 90],
            omor=[0.2, 0.1, 0.3],
            omoe_contexts=[[0.8, 0.5], [0.6, 0.7], [0.9, 0.4]],
            nominal_macro_weights=[0.3, 0.5, 0.2],
            nominal_meso_weights=[0.6, 0.4],
            muestras=256,
            concentracion=20,
            seed=9,
            aggregation='additive',
        )
        self.assertTrue(payload['ok'])
        self.assertEqual(payload['nivel'], 'meso_macro')
        json.dumps(payload, allow_nan=False)

    def test_joan_guide_demo_macro_y_meso(self):
        from api.joan_smaa_demo import run_joan_guide_demo

        macro = run_joan_guide_demo(nivel='macro', muestras=512)
        self.assertTrue(macro['ok'], macro.get('mensaje'))
        self.assertTrue(macro.get('ejemplo_joan'))
        self.assertEqual(len(macro['alternatives']), 6)
        self.assertTrue(macro.get('ternary_winner_map'))
        self.assertTrue(macro.get('surfaces_3d'))
        self.assertEqual(macro.get('admissibility_threshold'), 0.4)
        json.dumps(macro, allow_nan=False)

        meso = run_joan_guide_demo(nivel='meso_macro', muestras=512)
        self.assertTrue(meso['ok'], meso.get('mensaje'))
        self.assertEqual(meso['nivel'], 'meso_macro')
        self.assertIsNotNone(meso.get('omoe_derived_distribution'))
        json.dumps(meso, allow_nan=False)

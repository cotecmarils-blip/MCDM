"""Selección múltiple de métodos MADM y parámetros (v, λ, τ)."""
from django.test import SimpleTestCase

from api.madm_pipeline import _parse_madm_params, _parse_metodos_madm, run_madm_pipeline
from api.madm_ranker import MADMRanker


MATRIX = [
    [0.9, 0.4],
    [0.5, 0.8],
    [0.7, 0.6],
]
ALTS = ['A', 'B', 'C']
DIMS = ['d1', 'd2']
DIRS = ['max', 'max']


class MadmMultiParamsTests(SimpleTestCase):
    def test_parse_metodos_preserves_order_and_primary(self):
        selected = _parse_metodos_madm({
            'metodos_madm': ['vikor', 'topsis', 'vikor'],
            'metodo_madm': 'codas',
        })
        # Primario ausente en la lista se antepone; duplicados se ignoran.
        self.assertEqual(selected, ['codas', 'vikor', 'topsis'])

    def test_parse_madm_params(self):
        parsed = _parse_madm_params({
            'vikor': {'v': 0.7},
            'waspas': {'lambda': 0.3},
            'codas': {'tau': 0.05},
            'topsis': {'ignored': 1},
        })
        self.assertEqual(parsed, {
            'vikor': {'v': 0.7},
            'waspas': {'l': 0.3},
            'codas': {'tau': 0.05},
        })

    def test_ranker_applies_vikor_v_and_codas_tau(self):
        ranker = MADMRanker(
            MATRIX,
            alternatives=ALTS,
            dimensions=DIMS,
            directions=DIRS,
        )
        vikor = ranker.rank('vikor', weights=[0.5, 0.5], method_params={'v': 0.2})
        self.assertEqual(vikor.params, {'v': 0.2})
        codas = ranker.rank('codas', weights=[0.5, 0.5], method_params={'tau': 0.01})
        self.assertEqual(codas.params, {'tau': 0.01})

    def test_pipeline_returns_madm_por_metodo(self):
        result = run_madm_pipeline(
            MATRIX,
            ALTS,
            DIMS,
            DIRS,
            {
                'aplicar_pareto': False,
                'normalizacion_metodo': 'vector',
                'metodo_pesos': 'equal_weights',
                'metodos_madm': ['topsis', 'vikor', 'waspas'],
                'metodo_madm': 'vikor',
                'madm_params': {
                    'vikor': {'v': 0.6},
                    'waspas': {'l': 0.4},
                },
            },
        )
        self.assertIn('madm_por_metodo', result)
        self.assertEqual(set(result['madm_por_metodo'].keys()), {'topsis', 'vikor', 'waspas'})
        self.assertEqual(result['madm']['method'], 'vikor')
        self.assertEqual(result['madm'].get('params'), {'v': 0.6})
        self.assertEqual(result['opciones']['metodos_madm'], ['topsis', 'vikor', 'waspas'])
        self.assertEqual(result['opciones']['metodo_madm'], 'vikor')

"""Pruebas UAT / funcionales del módulo de métodos de cálculo por dimensión."""
from django.test import TestCase

from api.calculation_method_choices import (
    CALC_METHOD_MAUT,
    CALC_METHOD_MAVT,
    CALC_METHOD_UTA,
    CALC_METHOD_WEIGHTED_SUM,
    DEFAULT_CALCULATION_METHOD,
    merge_calculation_config,
    resolve_calculation_method,
)
from api.dimension_calculation_service import calcular_dimension
from api.models import Omoe, Proyecto


class CalculationMethodChoicesTests(TestCase):
    def test_default_method_is_mavt(self):
        class _Omoe:
            calculation_method = ''

        self.assertEqual(resolve_calculation_method(_Omoe()), DEFAULT_CALCULATION_METHOD)

    def test_merge_config_fills_defaults(self):
        cfg = merge_calculation_config(CALC_METHOD_MAVT, {})
        self.assertTrue(cfg.get('normalize_weights'))
        self.assertEqual(cfg.get('aggregation'), 'additive')


class DimensionCalculationDispatchTests(TestCase):
    def setUp(self):
        self.proyecto = Proyecto.objects.create(nombre='Proyecto test')
        self.omoe = Omoe.objects.create(
            proyecto=self.proyecto,
            nombre_modelo='Dimensión test',
            calculation_method=CALC_METHOD_MAVT,
        )

    def _mavt_stub(self, omoe, terminales, escenarios, valores, debug_logs=None):
        return 0.75, {'metodo': 'stub_mavt', 'valor': 0.75}

    def _weighted_stub(self, omoe, terminales, escenarios, valores, config, debug_logs=None):
        return 0.5, {'metodo': 'stub_weighted', 'valor': 0.5}

    def test_mavt_dispatches_to_mavt_fn(self):
        valor, det = calcular_dimension(
            self.omoe, [], [], {},
            mavt_fn=self._mavt_stub,
            weighted_sum_fn=self._weighted_stub,
        )
        self.assertEqual(valor, 0.75)
        self.assertEqual(det['calculation_method'], CALC_METHOD_MAVT)

    def test_weighted_sum_dispatches(self):
        self.omoe.calculation_method = CALC_METHOD_WEIGHTED_SUM
        valor, det = calcular_dimension(
            self.omoe, [], [], {},
            mavt_fn=self._mavt_stub,
            weighted_sum_fn=self._weighted_stub,
        )
        self.assertEqual(valor, 0.5)
        self.assertEqual(det['calculation_method'], CALC_METHOD_WEIGHTED_SUM)

    def test_maut_without_scenarios_returns_error(self):
        self.omoe.calculation_method = CALC_METHOD_MAUT
        self.omoe.calculation_config = {'scenarios': []}
        valor, det = calcular_dimension(
            self.omoe, [], [], {},
            mavt_fn=self._mavt_stub,
        )
        self.assertEqual(valor, 0.0)
        self.assertTrue(det.get('errors'))

    def test_uta_without_preferences_returns_error(self):
        self.omoe.calculation_method = CALC_METHOD_UTA
        self.omoe.calculation_config = {'preferences': {}}
        valor, det = calcular_dimension(
            self.omoe, [], [], {},
            mavt_fn=self._mavt_stub,
        )
        self.assertEqual(valor, 0.0)
        self.assertTrue(det.get('errors'))

    def test_method_persists_on_omoe(self):
        self.omoe.calculation_method = CALC_METHOD_WEIGHTED_SUM
        self.omoe.enable_sensitivity_analysis = True
        self.omoe.calculation_config = {'normalize_weights': False}
        self.omoe.save()
        refreshed = Omoe.objects.get(pk=self.omoe.pk)
        self.assertEqual(refreshed.calculation_method, CALC_METHOD_WEIGHTED_SUM)
        self.assertTrue(refreshed.enable_sensitivity_analysis)
        self.assertFalse(refreshed.calculation_config.get('normalize_weights', True))

"""Utilidad (tipo/familia/params) persistida por escenario, no solo en el nodo base."""
from decimal import Decimal

from django.test import TestCase

from api.arbol_nivel_service import ensure_niveles_arbol
from api.models import Escenario, NodoArbol, NodoArbolEscenario, Omoe, Proyecto, ProyectoNivelArbol
from api.nodo_escenario_service import (
    get_nodo_config_payload,
    load_config_map,
    merge_criterio_fields_for_escenario,
    save_nodo_config,
)


class NodoUtilidadEscenarioTests(TestCase):
    def setUp(self):
        self.proyecto = Proyecto.objects.create(nombre='Util esc', descripcion='')
        ensure_niveles_arbol(self.proyecto, 'omoe')
        nivel = ProyectoNivelArbol.objects.filter(
            proyecto=self.proyecto, rama_evaluacion='omoe', orden=1,
        ).first()
        self.omoe = Omoe.objects.create(
            proyecto=self.proyecto,
            nombre_modelo='Desempeño',
            rama_evaluacion='omoe',
        )
        # Nodo hoja SIN utilidad en el base (solo se configura por escenario).
        self.nodo = NodoArbol.objects.create(
            omoe=self.omoe,
            tipo_nivel=nivel,
            nombre='Alcance',
            peso=Decimal('100'),
            tipo_criterio='',
            familia_funciones='',
            parametros_funcion={},
        )
        self.esc = Escenario.objects.create(
            proyecto=self.proyecto,
            omoe=self.omoe,
            nombre='Base',
            peso=Decimal('100'),
            rama_evaluacion='omoe',
        )

    def test_save_nodo_config_persists_utility_on_escenario(self):
        payload = save_nodo_config(
            self.esc,
            self.nodo.id,
            {
                'peso': 100,
                'aplica': True,
                'tipo_criterio': 'mas_es_mejor',
                'familia_funciones': 'min_max',
                'parametros_funcion': {'L': 0, 'U': 40},
            },
        )
        self.assertEqual(payload['familia_funciones'], 'min_max')
        self.assertEqual(payload['tipo_criterio'], 'mas_es_mejor')
        self.assertEqual(payload['parametros_funcion'].get('U'), 40)

        row = NodoArbolEscenario.objects.get(escenario=self.esc, nodo_arbol=self.nodo)
        self.assertEqual(row.familia_funciones, 'min_max')
        self.assertEqual(row.tipo_criterio, 'mas_es_mejor')
        self.assertEqual(row.parametros_funcion.get('L'), 0)

        # El nodo base sigue vacío (la UI no debe depender de él).
        self.nodo.refresh_from_db()
        self.assertEqual(self.nodo.familia_funciones, '')
        self.assertEqual(self.nodo.tipo_criterio, '')

        loaded = get_nodo_config_payload(self.esc, self.nodo.id)
        self.assertEqual(loaded['familia_funciones'], 'min_max')
        self.assertTrue(loaded['es_terminal'])

        cfg_map = load_config_map(self.esc.id)
        fields = merge_criterio_fields_for_escenario(self.nodo, cfg_map)
        self.assertEqual(fields['familia'], 'min_max')
        self.assertEqual(fields['tipo_criterio'], 'mas_es_mejor')

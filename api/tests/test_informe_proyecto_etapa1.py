from types import SimpleNamespace

from django.test import SimpleTestCase

from api.informe_word_service import _peso_rows_for_escenario, _terminal_funcion_text


class InformeProyectoEtapa1Tests(SimpleTestCase):
    def test_tabla_pesos_incluye_todos_los_niveles_y_peso_acumulado(self):
        root = SimpleNamespace(
            id=1,
            parent_id=None,
            parent=None,
            nombre='Movilidad',
            peso=100,
            aplica=True,
            descripcion='Grupo principal',
            justificacion_peso='',
            familia_funciones='',
            parametros_funcion={},
            tipo_nivel_id=1,
            tipo_nivel=SimpleNamespace(nombre='Grupo de afinidad'),
        )
        intermediate = SimpleNamespace(
            id=2,
            parent_id=1,
            parent=root,
            nombre='Desempeño',
            peso=60,
            aplica=True,
            descripcion='Nodo intermedio',
            justificacion_peso='',
            familia_funciones='',
            parametros_funcion={},
            tipo_nivel_id=2,
            tipo_nivel=SimpleNamespace(nombre='MOB'),
        )
        terminal = SimpleNamespace(
            id=3,
            parent_id=2,
            parent=intermediate,
            nombre='Velocidad',
            peso=50,
            aplica=True,
            descripcion='Velocidad máxima',
            justificacion_peso='Dato operacional',
            familia_funciones='min_max',
            parametros_funcion={'L': 10, 'U': 30},
            tipo_nivel_id=3,
            tipo_nivel=SimpleNamespace(nombre='DT'),
        )
        config = {
            1: {'peso': 100, 'aplica': True},
            2: {'peso': 40, 'aplica': True},
            3: {'peso': 25, 'aplica': True},
        }

        rows = _peso_rows_for_escenario(
            'Escenario base',
            'Efectividad',
            [root, intermediate, terminal],
            config,
        )

        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0][2:5], [
            'GRUPO DE AFINIDAD',
            'Movilidad',
            'Raíz de la dimensión',
        ])
        self.assertEqual(rows[1][5], '40 %')
        self.assertEqual(rows[1][6], '100 %')
        self.assertEqual(rows[2][5], '25 %')
        self.assertEqual(rows[2][6], '100 %')
        self.assertIn('Función de utilidad', rows[2][7])

    def test_peso_acumulado_normaliza_hermanos_activos(self):
        root = SimpleNamespace(
            id=1,
            parent_id=None,
            parent=None,
            nombre='Raíz',
            peso=100,
            aplica=True,
            descripcion='',
            justificacion_peso='',
            familia_funciones='',
            parametros_funcion={},
            tipo_nivel_id=1,
            tipo_nivel=SimpleNamespace(nombre='Grupo'),
        )
        sibling_a = SimpleNamespace(
            id=2,
            parent_id=1,
            parent=root,
            nombre='Rama A',
            peso=30,
            aplica=True,
            descripcion='',
            justificacion_peso='',
            familia_funciones='',
            parametros_funcion={},
            tipo_nivel_id=2,
            tipo_nivel=SimpleNamespace(nombre='MOB'),
        )
        sibling_b = SimpleNamespace(
            id=3,
            parent_id=1,
            parent=root,
            nombre='Rama B',
            peso=30,
            aplica=True,
            descripcion='',
            justificacion_peso='',
            familia_funciones='',
            parametros_funcion={},
            tipo_nivel_id=2,
            tipo_nivel=SimpleNamespace(nombre='MOB'),
        )

        rows = _peso_rows_for_escenario(
            'Escenario',
            'Dimensión',
            [root, sibling_a, sibling_b],
            {1: {'peso': 100, 'aplica': True}, 2: {'peso': 30, 'aplica': True}, 3: {'peso': 30, 'aplica': True}},
        )

        by_name = {row[3]: row for row in rows}
        self.assertEqual(by_name['Rama A'][6], '50 %')
        self.assertEqual(by_name['Rama B'][6], '50 %')

    def test_terminal_funcion_usa_nodo_como_fuente_de_verdad(self):
        terminal = SimpleNamespace(
            id=10,
            familia_funciones='lineal',
            parametros_funcion={'L': 1, 'U': 5},
        )
        config = {
            10: {
                'familia_funciones': 'exponencial',
                'parametros_funcion': {'k': 2},
            },
        }

        text = _terminal_funcion_text(terminal, config)

        self.assertIn('lineal', text)
        self.assertNotIn('exponencial', text)

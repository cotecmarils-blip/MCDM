from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from api.models import (
    Alternativa,
    Capacidad,
    Caracteristica,
    CaracteristicaPlantilla,
    Escenario,
    NodoArbol,
    NodoArbolEscenario,
    Omoe,
    Proyecto,
    ProyectoNivelArbol,
    ValorEvaluacion,
)
from api.arbol_nivel_service import ensure_niveles_arbol
from api.proyecto_config_clone_service import (
    importar_config_proyecto,
    preview_config_proyecto,
)


User = get_user_model()


class ProyectoConfigCloneTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cfg', password='x')
        self.src = Proyecto.objects.create(nombre='Fuente', descripcion='src')
        self.dst = Proyecto.objects.create(nombre='Destino', descripcion='dst')
        ensure_niveles_arbol(self.src, 'omoe')
        ensure_niveles_arbol(self.dst, 'omoe')
        nivel = ProyectoNivelArbol.objects.filter(
            proyecto=self.src, rama_evaluacion='omoe', orden=1,
        ).first()

        self.omoe = Omoe.objects.create(
            proyecto=self.src,
            nombre_modelo='Desempeño',
            rama_evaluacion='omoe',
        )
        self.nodo = NodoArbol.objects.create(
            omoe=self.omoe,
            tipo_nivel=nivel,
            nombre='Velocidad',
            peso=Decimal('100'),
            tipo_criterio='mas_es_mejor',
            familia_funciones='min_max',
            parametros_funcion={'L': 0, 'U': 30},
        )
        self.esc = Escenario.objects.create(
            proyecto=self.src,
            omoe=self.omoe,
            nombre='Combate',
            peso=Decimal('50'),
            rama_evaluacion='omoe',
        )
        NodoArbolEscenario.objects.create(
            escenario=self.esc,
            nodo_arbol=self.nodo,
            peso=Decimal('100'),
            aplica=True,
            tipo_criterio='mas_es_mejor',
            familia_funciones='min_max',
            parametros_funcion={'L': 0, 'U': 30},
        )
        plantilla = CaracteristicaPlantilla.objects.create(
            proyecto=self.src, nombre='Eslora', unidad='m', orden=1,
        )
        self.alt = Alternativa.objects.create(
            proyecto=self.src,
            nombre='Buque A',
            apodo='BA',
            costo=Decimal('10.5'),
        )
        Capacidad.objects.create(alternativa=self.alt, nombre='Radar', descripcion='X')
        Caracteristica.objects.create(
            alternativa=self.alt, plantilla=plantilla, dato='120',
        )
        ValorEvaluacion.objects.create(
            alternativa=self.alt,
            escenario=self.esc,
            nodo_arbol=self.nodo,
            nivel='nodo_arbol',
            nodo_id=self.nodo.id,
            valor='22',
        )

    def test_preview_lists_entities(self):
        data = preview_config_proyecto(self.src)
        self.assertEqual(data['resumen']['dimensiones'], 1)
        self.assertGreaterEqual(data['resumen']['escenarios'], 1)
        self.assertEqual(data['resumen']['alternativas'], 1)
        self.assertEqual(data['alternativas'][0]['caracteristicas'][0]['dato'], '120')

    def test_import_selective_with_values(self):
        result = importar_config_proyecto(
            self.src,
            self.dst,
            omoe_ids=[self.omoe.id],
            escenario_ids=[self.esc.id],
            alternativa_ids=[self.alt.id],
            incluir_valores=True,
        )
        self.assertEqual(len(result['dimensiones']), 1)
        self.assertEqual(result['alternativas_copiadas'], 1)
        self.assertGreaterEqual(result['escenarios_copiados'], 1)
        self.assertEqual(result['valores_copiados'], 1)

        dest_alt = Alternativa.objects.get(proyecto=self.dst, nombre='Buque A')
        self.assertEqual(dest_alt.capacidades.count(), 1)
        self.assertEqual(dest_alt.caracteristicas.count(), 1)
        self.assertEqual(ValorEvaluacion.objects.filter(alternativa=dest_alt).count(), 1)

        dest_omoe = Omoe.objects.get(pk=result['dimensiones'][0]['omoe_id'])
        self.assertEqual(dest_omoe.nodos.count(), 1)
        # Escenario Combate debe existir en destino
        self.assertTrue(
            Escenario.objects.filter(omoe=dest_omoe, nombre='Combate').exists()
        )

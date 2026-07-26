"""Eliminación de proyectos con árbol (PROTECT en tipo_nivel)."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api.arbol_nivel_service import ensure_all_ramas_niveles
from api.models import NodoArbol, Omoe, Proyecto, ProyectoMembership, ProyectoNivelArbol
from api.proyecto_delete_service import delete_proyecto


User = get_user_model()


class ProyectoDeleteServiceTests(TestCase):
    def test_delete_proyecto_con_nodos_y_niveles(self):
        proyecto = Proyecto.objects.create(nombre='Con árbol')
        ensure_all_ramas_niveles(proyecto)
        omoe = Omoe.objects.create(
            proyecto=proyecto,
            nombre_modelo='OMOE',
            rama_evaluacion='omoe',
        )
        nivel = ProyectoNivelArbol.objects.get(
            proyecto=proyecto,
            rama_evaluacion='omoe',
            orden=1,
        )
        NodoArbol.objects.create(omoe=omoe, tipo_nivel=nivel, nombre='Raíz')

        delete_proyecto(proyecto)

        self.assertFalse(Proyecto.objects.filter(pk=proyecto.pk).exists())
        self.assertFalse(NodoArbol.objects.filter(omoe=omoe).exists())
        self.assertFalse(ProyectoNivelArbol.objects.filter(proyecto_id=proyecto.pk).exists())


class ProyectoDeleteApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='jefe', password='test-password')
        self.proyecto = Proyecto.objects.create(nombre='Proyecto con árbol')
        ensure_all_ramas_niveles(self.proyecto)
        omoe = Omoe.objects.create(
            proyecto=self.proyecto,
            nombre_modelo='OMOE',
            rama_evaluacion='omoe',
        )
        nivel = ProyectoNivelArbol.objects.get(
            proyecto=self.proyecto,
            rama_evaluacion='omoe',
            orden=1,
        )
        NodoArbol.objects.create(omoe=omoe, tipo_nivel=nivel, nombre='Nodo')
        ProyectoMembership.objects.create(
            usuario=self.user,
            proyecto=self.proyecto,
            rol=ProyectoMembership.ROL_JEFE,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_api_elimina_proyecto_con_arbol(self):
        pk = self.proyecto.id
        response = self.client.delete(
            f'/api/proyectos/{pk}/',
            {'password': 'test-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 204, getattr(response, 'data', response.content))
        self.assertFalse(Proyecto.objects.filter(pk=pk).exists())

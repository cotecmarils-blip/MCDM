from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Proyecto, ProyectoMembership


User = get_user_model()


class GlobalManagerAccessTests(TestCase):
    def setUp(self):
        self.gerente = User.objects.create_user(
            username='gerente_global',
            password='test-password',
        )
        self.proyecto_base = Proyecto.objects.create(nombre='Proyecto base')
        self.proyecto_sin_asignacion = Proyecto.objects.create(nombre='Proyecto nuevo')
        ProyectoMembership.objects.create(
            usuario=self.gerente,
            proyecto=self.proyecto_base,
            rol=ProyectoMembership.ROL_JEFE,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.gerente)

    def test_gerente_lista_todos_los_proyectos(self):
        response = self.client.get('/api/proyectos/')

        self.assertEqual(response.status_code, 200)
        ids = {item['id'] for item in response.data}
        self.assertEqual(
            ids,
            {self.proyecto_base.id, self.proyecto_sin_asignacion.id},
        )

    def test_gerente_tiene_permiso_virtual_sin_autoasignacion(self):
        response = self.client.get(
            f'/api/auth/proyectos/{self.proyecto_sin_asignacion.id}/membership/'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['rol'], ProyectoMembership.ROL_JEFE)
        self.assertTrue(response.data['puede_editar'])
        self.assertFalse(
            ProyectoMembership.objects.filter(
                usuario=self.gerente,
                proyecto=self.proyecto_sin_asignacion,
            ).exists()
        )

    def test_crear_proyecto_no_autoasigna_al_gerente(self):
        response = self.client.post(
            '/api/proyectos/',
            {'nombre': 'Creado por gerente'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(
            ProyectoMembership.objects.filter(
                usuario=self.gerente,
                proyecto_id=response.data['id'],
            ).exists()
        )


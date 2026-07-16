from unittest.mock import patch
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from api.models import InformeProyectoJob, Proyecto


class InformeProyectoProgressApiTests(APITestCase):
    def setUp(self):
        self.media_dir = TemporaryDirectory()
        self.override_media = override_settings(MEDIA_ROOT=self.media_dir.name)
        self.override_media.enable()
        self.addCleanup(self.override_media.disable)
        self.addCleanup(self.media_dir.cleanup)
        self.user = get_user_model().objects.create_superuser(
            username='report-admin',
            email='report@example.com',
            password='test-password',
        )
        self.proyecto = Proyecto.objects.create(nombre='Proyecto de prueba')
        self.client.force_authenticate(self.user)

    @patch('api.informe_job_service.start_informe_proyecto_job')
    def test_start_and_read_progress(self, start_job):
        response = self.client.post(
            f'/api/proyectos/{self.proyecto.id}/informe-proyecto-word/jobs/',
            {'map_weights': True},
            format='json',
        )

        self.assertEqual(response.status_code, 202)
        job = InformeProyectoJob.objects.get(pk=response.data['job_id'])
        self.assertTrue(job.incluir_pesos_mapas)
        start_job.assert_called_once_with(job)

        job.estado = InformeProyectoJob.ESTADO_PROCESANDO
        job.progreso = 58
        job.etapa = 'Agregando alternativas'
        job.save()
        status_response = self.client.get(
            f'/api/proyectos/{self.proyecto.id}/'
            f'informe-proyecto-word/jobs/{job.id}/',
        )

        self.assertEqual(status_response.status_code, 200)
        self.assertEqual(status_response.data['progreso'], 58)
        self.assertEqual(status_response.data['etapa'], 'Agregando alternativas')

    def test_download_is_rejected_while_job_is_pending(self):
        job = InformeProyectoJob.objects.create(
            proyecto=self.proyecto,
            usuario=self.user,
        )
        pending_response = self.client.get(
            f'/api/proyectos/{self.proyecto.id}/'
            f'informe-proyecto-word/jobs/{job.id}/download/',
        )
        self.assertEqual(pending_response.status_code, 409)

    def test_activo_endpoint_returns_running_job(self):
        empty = self.client.get(
            f'/api/proyectos/{self.proyecto.id}/informe-proyecto-word/activo/',
        )
        self.assertEqual(empty.status_code, 200)
        self.assertFalse(empty.data['activo'])

        job = InformeProyectoJob.objects.create(
            proyecto=self.proyecto,
            usuario=self.user,
            estado=InformeProyectoJob.ESTADO_PROCESANDO,
            progreso=42,
            etapa='Agregando alternativas',
        )
        active = self.client.get(
            f'/api/proyectos/{self.proyecto.id}/informe-proyecto-word/activo/',
        )
        self.assertEqual(active.status_code, 200)
        self.assertTrue(active.data['activo'])
        self.assertEqual(active.data['job_id'], str(job.id))
        self.assertEqual(active.data['progreso'], 42)
        self.assertEqual(active.data['etapa'], 'Agregando alternativas')

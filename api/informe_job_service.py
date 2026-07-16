"""Ejecución asíncrona y seguimiento del informe integral de proyecto."""
from __future__ import annotations

import logging
from threading import Thread

from django.core.files.base import ContentFile
from django.db import close_old_connections

from .models import InformeProyectoJob


logger = logging.getLogger(__name__)


def _run_informe_proyecto_job(job_id) -> None:
    close_old_connections()
    try:
        job = InformeProyectoJob.objects.select_related('proyecto').get(pk=job_id)
        InformeProyectoJob.objects.filter(pk=job_id).update(
            estado=InformeProyectoJob.ESTADO_PROCESANDO,
            progreso=1,
            etapa='Iniciando generación',
            error='',
        )

        def update_progress(percent: int, stage: str) -> None:
            InformeProyectoJob.objects.filter(pk=job_id).update(
                progreso=max(1, min(int(percent), 99)),
                etapa=stage[:160],
            )

        from .informe_word_service import build_informe_proyecto_docx

        content = build_informe_proyecto_docx(
            job.proyecto,
            include_map_weights=job.incluir_pesos_mapas,
            progress_callback=update_progress,
        )
        filename = f'informe-proyecto-{job.proyecto_id}-{job.id}.docx'
        job.refresh_from_db()
        job.archivo.save(filename, ContentFile(content), save=False)
        job.estado = InformeProyectoJob.ESTADO_COMPLETADO
        job.progreso = 100
        job.etapa = 'Informe listo para descargar'
        job.error = ''
        job.save()
    except Exception as exc:  # El error se comunica al cliente mediante el job.
        logger.exception('Error generando informe de proyecto %s', job_id)
        InformeProyectoJob.objects.filter(pk=job_id).update(
            estado=InformeProyectoJob.ESTADO_ERROR,
            etapa='No se pudo generar el informe',
            error=str(exc)[:2000],
        )
    finally:
        close_old_connections()


def start_informe_proyecto_job(job: InformeProyectoJob) -> None:
    """Inicia el trabajo sin mantener abierta la petición HTTP."""
    worker = Thread(
        target=_run_informe_proyecto_job,
        args=(job.id,),
        name=f'informe-proyecto-{job.id}',
        daemon=True,
    )
    worker.start()

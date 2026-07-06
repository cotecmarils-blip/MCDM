import React from 'react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl } from '../utils/media';

function ProjectInfoPanel({ proyecto, proyectoId }) {
  const requisitosCount = proyecto?.requisitos?.length || 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Información del proyecto</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Aquí ves el resumen del proyecto y accedes a su edición general.
          </p>
        </div>
        <Link to={`/proyecto/${proyectoId}/editar`} className="btn-sm bg-navy-800 text-white hover:bg-navy-700">
          Editar proyecto
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-4">
          {proyecto.foto && (
            <img
              src={resolveMediaUrl(proyecto.foto)}
              alt={proyecto.nombre}
              className="w-full h-56 object-cover rounded-2xl border border-gray-200 dark:border-gray-700/60"
            />
          )}
          <div className="rounded-2xl border border-gray-200 dark:border-navy-800/80 bg-gray-50 dark:bg-navy-950/40 p-4 space-y-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Requisitos cargados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{requisitosCount}</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-6">
              Los requisitos se administran en{' '}
              <span className="font-semibold">Gestión de alternativas → Requisitos</span>, con
              plantilla XLSX e importación masiva.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 dark:border-navy-800/80 bg-white dark:bg-navy-900 p-5 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Resumen</h3>
            <div>
              <dt className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Nombre</dt>
              <dd className="text-base text-gray-900 dark:text-gray-100 font-semibold mt-0.5">{proyecto.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Descripción</dt>
              <dd className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-line">
                {proyecto.descripcion || 'Sin descripción'}
              </dd>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-navy-300 dark:border-navy-700 bg-navy-50/70 dark:bg-navy-950/30 p-5 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-navy-800 dark:text-navy-200">
              Requisitos
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-6">
              Ve a <span className="font-semibold">Gestión de alternativas</span> y abre la subpestaña{' '}
              <span className="font-semibold">Requisitos</span> para descargar la plantilla, importar
              el archivo diligenciado y convertirlo en registros del proyecto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectInfoPanel;

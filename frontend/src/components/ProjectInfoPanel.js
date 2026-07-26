import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { proyectos } from '../api';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';
import ImportarConfigProyectoModal from './ImportarConfigProyectoModal';

function ProjectInfoPanel({ proyecto, proyectoId, canWrite = false, onConfigImported }) {
  const requisitosCount = proyecto?.requisitos?.length || 0;
  const [importOpen, setImportOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [dupError, setDupError] = useState(null);
  const { puedeCrearProyecto } = useAuth();
  const navigate = useNavigate();

  const handleDuplicar = async () => {
    if (duplicating) return;
    const ok = window.confirm(
      'Se creará un proyecto nuevo con la configuración completa de este '
      + '(dimensiones, escenarios, alternativas, evaluación y requisitos).\n\n'
      + 'No se copian fotos/anexos de alternativas ni el historial de cálculos.\n\n'
      + '¿Continuar?',
    );
    if (!ok) return;
    setDuplicating(true);
    setDupError(null);
    try {
      const res = await proyectos.duplicar(proyectoId);
      const nuevoId = res.data?.proyecto?.id;
      if (nuevoId) {
        navigate(`/proyecto/${nuevoId}`);
        return;
      }
      setDupError('El proyecto se duplicó, pero no se recibió el id del nuevo proyecto.');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setDupError(
        Array.isArray(detail)
          ? detail.join(' ')
          : (detail || 'No se pudo duplicar el proyecto.'),
      );
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Información del proyecto</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Aquí ves el resumen del proyecto y accedes a su edición general.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeCrearProyecto && (
            <button
              type="button"
              onClick={handleDuplicar}
              disabled={duplicating}
              className="btn-sm border border-emerald-600 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
            >
              {duplicating ? 'Duplicando…' : 'Duplicar proyecto'}
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="btn-sm border border-navy-600 text-navy-800 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-900"
            >
              Importar configuración
            </button>
          )}
          <Link to={`/proyecto/${proyectoId}/editar`} className="btn-sm bg-navy-800 text-white hover:bg-navy-700">
            Editar proyecto
          </Link>
        </div>
      </div>

      {dupError && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {dupError}
        </div>
      )}

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

          {puedeCrearProyecto && (
            <div className="rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 p-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Duplicar proyecto
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-6">
                Crea un proyecto nuevo con toda la configuración de este: dimensiones, escenarios,
                alternativas, evaluación y requisitos. Las fotos de alternativas y el historial
                de cálculos no se copian.
              </p>
              <button
                type="button"
                onClick={handleDuplicar}
                disabled={duplicating}
                className="btn-sm bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {duplicating ? 'Duplicando…' : 'Duplicar este proyecto'}
              </button>
            </div>
          )}

          {canWrite && (
            <div className="rounded-2xl border border-dashed border-navy-300 dark:border-navy-700 bg-navy-50/70 dark:bg-navy-950/30 p-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-navy-800 dark:text-navy-200">
                Copiar desde otro proyecto
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-6">
                En lugar de importar dimensión por dimensión, puede traer de golpe las
                dimensiones, escenarios y alternativas que elija (y opcionalmente la matriz
                de evaluación), revisando antes la ficha de cada alternativa.
              </p>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="btn-sm bg-navy-800 text-white hover:bg-navy-700"
              >
                Abrir importador
              </button>
            </div>
          )}

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

      <ImportarConfigProyectoModal
        open={importOpen}
        proyectoId={proyectoId}
        canWrite={canWrite}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          onConfigImported?.();
        }}
      />
    </div>
  );
}

export default ProjectInfoPanel;

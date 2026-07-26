import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { proyectos } from '../api';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../utils/media';
import { ModalOverlay } from '../utils/modalBackdrop';
import ImportarConfigProyectoModal from './ImportarConfigProyectoModal';

function IconMoreVertical({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function ProjectInfoPanel({ proyecto, proyectoId, canWrite = false, onConfigImported }) {
  const requisitosCount = proyecto?.requisitos?.length || 0;
  const [importOpen, setImportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dupConfirmOpen, setDupConfirmOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [dupError, setDupError] = useState(null);
  const { puedeCrearProyecto } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const showToolsMenu = puedeCrearProyecto || canWrite;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocClick = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const openDuplicarConfirm = () => {
    setMenuOpen(false);
    setDupError(null);
    setDupConfirmOpen(true);
  };

  const openImportar = () => {
    setMenuOpen(false);
    setImportOpen(true);
  };

  const handleDuplicar = async () => {
    if (duplicating) return;
    setDuplicating(true);
    setDupError(null);
    try {
      const res = await proyectos.duplicar(proyectoId);
      const nuevoId = res.data?.proyecto?.id;
      if (nuevoId) {
        setDupConfirmOpen(false);
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
        <div className="flex flex-wrap gap-2 items-center">
          {showToolsMenu && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="btn-sm border border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800 px-2"
                aria-label="Más opciones"
                aria-expanded={menuOpen}
                title="Más opciones"
              >
                <IconMoreVertical />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-navy-900 shadow-lg z-30 py-1 overflow-hidden">
                  {puedeCrearProyecto && (
                    <button
                      type="button"
                      onClick={openDuplicarConfirm}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-navy-800"
                    >
                      Duplicar proyecto
                    </button>
                  )}
                  {canWrite && (
                    <button
                      type="button"
                      onClick={openImportar}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-navy-800"
                    >
                      Importar configuración
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <Link to={`/proyecto/${proyectoId}/editar`} className="btn-sm bg-navy-800 text-white hover:bg-navy-700">
            Editar proyecto
          </Link>
        </div>
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

      {dupConfirmOpen && (
        <ModalOverlay onClose={duplicating ? undefined : () => setDupConfirmOpen(false)}>
          <div className="bg-white dark:bg-navy-900 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-gray-200/80 dark:border-navy-700/60">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Duplicar proyecto
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-6">
                Se creará un proyecto nuevo con la configuración de{' '}
                <span className="font-semibold">{proyecto?.nombre || 'este proyecto'}</span>:
                dimensiones, escenarios, alternativas, evaluación y requisitos.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-6">
                No se copian fotos/anexos de alternativas ni el historial de cálculos.
              </p>
            </div>

            {dupError && (
              <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {dupError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={duplicating}
                onClick={() => setDupConfirmOpen(false)}
                className="btn-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={duplicating}
                onClick={handleDuplicar}
                className="btn-sm bg-navy-800 text-white hover:bg-navy-700 disabled:opacity-50"
              >
                {duplicating ? 'Duplicando…' : 'Duplicar'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

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

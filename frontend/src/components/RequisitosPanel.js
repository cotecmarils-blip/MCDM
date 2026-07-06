import React, { useCallback, useEffect, useRef, useState } from 'react';
import SplitColumnLayout from '../layout/SplitColumnLayout';
import { requisitos, proyectos } from '../api';
import { useTheme } from '../ThemeContext';
import { getAlternativaInputClass, getAlternativaLabelClass } from './alternativaFormStyles';
import {
  emptyRequisitoFormState,
  requisitoToFormState,
} from '../constants/requisitos';

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function RequisitosListSidebar({ items, selectedId, isNew, onSelect, onNew, loading, canWrite = true }) {
  return (
    <div className="p-3 space-y-3">
      {canWrite && (
        <button
          type="button"
          className="w-full btn btn-primary justify-center"
          onClick={onNew}
        >
          Nuevo requisito
        </button>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Cargando requisitos...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
          Aún no hay requisitos cargados.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const active = selectedId === item.id && !isNew;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                  active
                    ? 'border-navy-300 bg-navy-50 dark:bg-navy-950/40 dark:border-navy-700'
                    : 'border-gray-200 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-navy-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {item.codigo || item.titulo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {item.titulo}
                    </p>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {item.prioridad}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequisitosDetailPanel({
  formData,
  onChange,
  onSubmit,
  onDelete,
  onCancelNew,
  isNew,
  saving,
  hasSelection,
  inputClass,
  labelClass,
  onDownloadTemplate,
  onImportClick,
  importInputRef,
  canWrite = true,
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {isNew ? 'Nuevo requisito' : hasSelection ? 'Detalle del requisito' : 'Requisito'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cada fila puede ser algo como “Barco / Eslora / 25 / m”.
          </p>
        </div>
        <details className="relative">
          <summary className="btn-sm border border-gray-200 dark:border-gray-700/60 cursor-pointer list-none select-none">
            Acciones Excel
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-navy-950">
            <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-navy-900" onClick={onDownloadTemplate}>
              Descargar plantilla XLSX
            </button>
            {canWrite && (
              <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-navy-900" onClick={onImportClick}>
                Importar XLSX
              </button>
            )}
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = '';
                onImportClick(file);
              }}
            />
          </div>
        </details>
      </div>

      {!hasSelection && !isNew ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
          Selecciona un requisito existente o crea uno nuevo.
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Parámetro *</label>
              <input type="text" name="titulo" value={formData.titulo} onChange={onChange} required readOnly={!canWrite} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Orden</label>
              <input type="number" name="orden" value={formData.orden} onChange={onChange} readOnly={!canWrite} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Valor esperado</label>
            <textarea name="descripcion" value={formData.descripcion} onChange={onChange} rows={3} readOnly={!canWrite} className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Unidad</label>
              <input type="text" name="criterio_aceptacion" value={formData.criterio_aceptacion} onChange={onChange} readOnly={!canWrite} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Observaciones</label>
              <textarea name="observaciones" value={formData.observaciones} onChange={onChange} rows={3} readOnly={!canWrite} className={`${inputClass} resize-none`} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {canWrite && (
              <>
                <button type="submit" disabled={saving || !formData.titulo.trim()} className="btn btn-primary disabled:opacity-50">
                  {saving ? 'Guardando...' : isNew ? 'Crear requisito' : 'Guardar requisito'}
                </button>
                {!isNew && (
                  <button type="button" onClick={onDelete} className="btn-sm border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30">
                    Eliminar
                  </button>
                )}
              </>
            )}
            {isNew && (
              <button type="button" onClick={onCancelNew} className="btn-sm border border-gray-200 dark:border-gray-700/60">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function RequisitosPanel({ proyectoId, embedded = false, canWrite = true }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyRequisitoFormState());
  const importInputRef = useRef(null);
  const { isDark } = useTheme();

  const inputClass = getAlternativaInputClass(isDark);
  const labelClass = getAlternativaLabelClass(isDark);

  const loadList = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        const response = await requisitos.getByProyecto(proyectoId);
        setItems(response.data);
      } catch (err) {
        console.error('Error cargando requisitos:', err);
        alert('No se pudieron cargar los requisitos');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [proyectoId],
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId && !isNew) {
      const selected = items.find((item) => item.id === selectedId);
      if (selected) setFormData(requisitoToFormState(selected));
    }
  }, [items, selectedId, isNew]);

  const handleNew = () => {
    setIsNew(true);
    setSelectedId(null);
    setFormData(emptyRequisitoFormState());
  };

  const handleSelect = (id) => {
    const selected = items.find((item) => item.id === id);
    if (!selected) return;
    setIsNew(false);
    setSelectedId(id);
    setFormData(requisitoToFormState(selected));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const refreshAfterMutation = async (keepSelectionId = null) => {
    await loadList({ silent: true });
    if (keepSelectionId) {
      const next = await requisitos.getById(keepSelectionId);
      setSelectedId(keepSelectionId);
      setIsNew(false);
      setFormData(requisitoToFormState(next.data));
    } else {
      setSelectedId(null);
      setIsNew(false);
      setFormData(emptyRequisitoFormState());
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.titulo.trim()) return;

    try {
      setSaving(true);
      const payload = {
        proyecto: proyectoId,
        ...formData,
        orden: formData.orden === '' ? 0 : Number(formData.orden),
      };

      if (isNew) {
        const response = await requisitos.create(payload);
        await refreshAfterMutation(response.data.id);
      } else if (selectedId) {
        await requisitos.update(selectedId, payload);
        await refreshAfterMutation(selectedId);
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data;
      const msg =
        typeof detail === 'string'
          ? detail
          : detail
            ? Object.entries(detail)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                .join('\n')
            : err.message;
      alert(`Error al guardar el requisito:\n${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('¿Deseas eliminar este requisito?')) return;

    try {
      await requisitos.delete(selectedId);
      await loadList({ silent: true });
      setSelectedId(null);
      setIsNew(false);
      setFormData(emptyRequisitoFormState());
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el requisito');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await proyectos.downloadRequisitosTemplate(proyectoId);
      downloadBlob(response.data, 'plantilla_requisitos.xlsx');
    } catch (err) {
      console.error(err);
      alert('No se pudo descargar la plantilla');
    }
  };

  const handleImportClick = (file) => {
    if (file instanceof File) {
      const shouldReplace = window.confirm(
        'La importación reemplazará los requisitos actuales del proyecto. ¿Deseas continuar?',
      );
      if (!shouldReplace) return;
      proyectos
        .importRequisitos(proyectoId, file, true)
        .then(async () => {
          await loadList({ silent: true });
          setSelectedId(null);
          setIsNew(false);
          setFormData(emptyRequisitoFormState());
          alert('Requisitos importados correctamente');
        })
        .catch((err) => {
          console.error(err);
          const detail = err.response?.data;
          const msg =
            typeof detail === 'string'
              ? detail
              : detail
                ? Object.entries(detail)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('\n')
                : err.message;
          alert(`No se pudo importar el archivo:\n${msg}`);
        });
      return;
    }

    if (importInputRef.current) {
      importInputRef.current.click();
    }
  };

  return (
    <SplitColumnLayout
      title={embedded ? 'Requisitos del proyecto' : 'Gestión de requisitos'}
      description="Descarga una plantilla XLSX, recibe el archivo diligenciado y conviértelo en registros del proyecto."
      left={
        <RequisitosListSidebar
          items={items}
          selectedId={selectedId}
          isNew={isNew}
          onSelect={handleSelect}
          onNew={handleNew}
          loading={loading}
          canWrite={canWrite}
        />
      }
      right={
        <RequisitosDetailPanel
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onCancelNew={() => {
            setIsNew(false);
            setSelectedId(null);
            setFormData(emptyRequisitoFormState());
          }}
          isNew={isNew}
          saving={saving}
          hasSelection={Boolean(selectedId)}
          inputClass={inputClass}
          labelClass={labelClass}
          onDownloadTemplate={handleDownloadTemplate}
          onImportClick={handleImportClick}
          importInputRef={importInputRef}
          canWrite={canWrite}
        />
      }
    />
  );
}

export default RequisitosPanel;

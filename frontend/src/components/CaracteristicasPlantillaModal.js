import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../ThemeContext';
import { caracteristicasPlantilla } from '../api';
import { MODAL_BACKDROP_CLASS } from '../utils/modalBackdrop';
import { formatPlantillaLabel, normalizeUnidad } from '../utils/caracteristicas';
import { getAlternativaInputClass, getAlternativaLabelClass } from './alternativaFormStyles';

const emptyRow = () => ({
  _key: crypto.randomUUID(),
  id: null,
  nombre: '',
  unidad: '',
  orden: 0,
  por_defecto: true,
});

function CaracteristicasPlantillaModal({ proyectoId, onClose, onSaved }) {
  const { isDark } = useTheme();
  const inputClass = getAlternativaInputClass(isDark);
  const labelClass = getAlternativaLabelClass(isDark);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await caracteristicasPlantilla.getByProyecto(proyectoId);
      setRows(
        res.data.length
          ? res.data.map((p) => ({
              _key: `id-${p.id}`,
              id: p.id,
              nombre: p.nombre,
              unidad: p.unidad || '',
              orden: p.orden ?? 0,
              por_defecto: Boolean(p.por_defecto),
            }))
          : []
      );
    } catch (err) {
      console.error(err);
      alert('Error al cargar las características del proyecto');
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (key, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    );
  };

  const removeRow = async (row) => {
    if (row.id) {
      if (!window.confirm(`¿Eliminar "${row.nombre}" del catálogo?`)) return;
      try {
        await caracteristicasPlantilla.delete(row.id);
      } catch (err) {
        console.error(err);
        alert('No se pudo eliminar');
        return;
      }
    }
    setRows((prev) => prev.filter((r) => r._key !== row._key));
  };

  const handleSave = async () => {
    const valid = rows.filter((r) => r.nombre.trim());
    if (valid.length === 0) {
      alert('Agrega al menos una característica con nombre.');
      return;
    }
    try {
      setSaving(true);
      for (let i = 0; i < valid.length; i++) {
        const row = valid[i];
        const payload = {
          proyecto: proyectoId,
          nombre: row.nombre.trim(),
          unidad: normalizeUnidad(row.unidad),
          orden: i,
          por_defecto: row.por_defecto,
        };
        if (row.id) {
          await caracteristicasPlantilla.update(row.id, payload);
        } else {
          await caracteristicasPlantilla.create(payload);
        }
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      alert(
        `Error al guardar: ${
          data ? JSON.stringify(data) : err.message
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={MODAL_BACKDROP_CLASS}>
      <div
        className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col`}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700/60 shrink-0">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Características del proyecto
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Define el catálogo (nombre y unidad). Las marcadas como «por defecto» se cargan al crear
            una alternativa. En cada alternativa eliges cuáles aplican y solo ingresas el dato.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
            </div>
          ) : rows.length === 0 ? (
            <p className={`text-sm italic ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Sin características. Agrega Eslora, Manga, Velocidad, etc.
            </p>
          ) : (
            rows.map((row, index) => (
              <div
                key={row._key}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-navy-900/40 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500">
                    {index + 1}. {row.nombre ? formatPlantillaLabel(row) : 'Nueva'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(row)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Nombre *</label>
                    <input
                      type="text"
                      value={row.nombre}
                      onChange={(e) => updateRow(row._key, 'nombre', e.target.value)}
                      className={inputClass}
                      placeholder="Eslora"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unidad</label>
                    <input
                      type="text"
                      value={row.unidad}
                      onChange={(e) => updateRow(row._key, 'unidad', e.target.value)}
                      className={inputClass}
                      placeholder="m, Kn, % (sin corchetes)"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.por_defecto}
                    onChange={(e) => updateRow(row._key, 'por_defecto', e.target.checked)}
                    className="rounded border-gray-300 text-navy-800 focus:ring-navy-500"
                  />
                  Incluir por defecto en nuevas alternativas
                </label>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="btn-sm bg-navy-800 text-white hover:bg-navy-700 w-full sm:w-auto"
          >
            + Agregar característica al catálogo
          </button>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700/60 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-sm border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-sm bg-navy-800 text-white hover:bg-navy-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar catálogo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CaracteristicasPlantillaModal;

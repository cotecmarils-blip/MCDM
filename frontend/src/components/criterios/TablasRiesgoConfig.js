import React, { useEffect, useState } from 'react';
import { authApi, tablasRiesgoApi } from '../../api';
import { MODAL_BACKDROP_CLASS } from '../../utils/modalBackdrop';

function TablasRiesgoConfig({ proyectoId, open, onClose, onSaved }) {
  const [probabilidades, setProbabilidades] = useState([]);
  const [impactos, setImpactos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [tab, setTab] = useState('prob');

  useEffect(() => {
    if (!open || !proyectoId) return undefined;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [tablasRes, membershipRes] = await Promise.all([
          tablasRiesgoApi.get(proyectoId),
          authApi.getProyectoMembership(proyectoId).catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        const data = tablasRes.data || {};
        setProbabilidades(data.probabilidades || []);
        setImpactos(data.impactos || []);
        const m = membershipRes.data;
        setCanManage(Boolean(m?.puede_gestionar_miembros || m?.es_admin_global));
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'No se pudieron cargar las tablas de riesgo.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, proyectoId]);

  if (!open) return null;

  const patchProb = (id, field, value) => {
    setProbabilidades((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const patchImp = (id, field, value) => {
    setImpactos((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await tablasRiesgoApi.update(proyectoId, {
        probabilidades,
        impactos,
      });
      const data = res.data || {};
      setProbabilidades(data.probabilidades || []);
      setImpactos(data.impactos || []);
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron guardar las tablas.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-900/40';

  return (
    <div className={MODAL_BACKDROP_CLASS}>
      <div className="bg-white dark:bg-navy-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col p-5">
        <div className="shrink-0">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Tablas de riesgo
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tabla 29 (probabilidad) y Tabla 30 (impacto/consecuencia). Los selects en nodos
            terminales muestran la descripción y guardan el nivel numérico.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setTab('prob')}
              className={`text-xs px-3 py-1.5 rounded-lg ${
                tab === 'prob'
                  ? 'bg-teal-600 text-white'
                  : 'border border-gray-200 dark:border-gray-700/60'
              }`}
            >
              Probabilidad
            </button>
            <button
              type="button"
              onClick={() => setTab('imp')}
              className={`text-xs px-3 py-1.5 rounded-lg ${
                tab === 'imp'
                  ? 'bg-teal-600 text-white'
                  : 'border border-gray-200 dark:border-gray-700/60'
              }`}
            >
              Impacto / consecuencia
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
            </div>
          ) : tab === 'prob' ? (
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700/60">
                  <th className="py-2 pr-2 w-16">Nivel</th>
                  <th className="py-2">Descripción (select)</th>
                </tr>
              </thead>
              <tbody>
                {probabilidades.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800/80">
                    <td className="py-2 pr-2 tabular-nums font-mono text-gray-600">
                      {row.valor}
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={row.descripcion || ''}
                        disabled={!canManage}
                        onChange={(e) => patchProb(row.id, 'descripcion', e.target.value)}
                        className={inputClass}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700/60">
                  <th className="py-2 pr-2 w-14">Nivel</th>
                  <th className="py-2 pr-2">Desempeño</th>
                  <th className="py-2 pr-2">Cronograma</th>
                  <th className="py-2">Costo</th>
                </tr>
              </thead>
              <tbody>
                {impactos.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800/80 align-top">
                    <td className="py-2 pr-2 tabular-nums font-mono text-gray-600">
                      {row.valor}
                    </td>
                    {['descripcion_desempeno', 'descripcion_cronograma', 'descripcion_costo'].map(
                      (field) => (
                        <td key={field} className="py-2 pr-2">
                          <textarea
                            rows={3}
                            value={row[field] || ''}
                            disabled={!canManage}
                            onChange={(e) => patchImp(row.id, field, e.target.value)}
                            className={`${inputClass} resize-y min-h-[3.5rem]`}
                          />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!canManage && !loading && (
          <p className="text-sm text-amber-600 dark:text-amber-400 shrink-0 mt-2">
            Solo el jefe del proyecto o un administrador global puede editar estas tablas.
          </p>
        )}

        {error && <p className="text-sm text-red-500 shrink-0 mt-2">{error}</p>}

        <div className="flex justify-end gap-2 shrink-0 mt-4 pt-2 border-t border-gray-100 dark:border-gray-800/60">
          <button type="button" onClick={onClose} className="btn-sm border-gray-200 dark:border-gray-700/60">
            Cerrar
          </button>
          {canManage && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="btn-sm btn-primary disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TablasRiesgoConfig;

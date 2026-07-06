import React, { useEffect, useState } from 'react';
import { authApi, nivelesArbolApi } from '../../api';
import { MODAL_BACKDROP_CLASS } from '../../utils/modalBackdrop';
import { RAMA_META } from './ramaContext';
import { MAX_NIVELES_ARBOL, MIN_NIVELES_ARBOL } from './nivelArbolRules';

const RAMAS = ['omoe', 'omoc', 'omor'];

function emptyDraft() {
  return { omoe: [], omoc: [], omor: [] };
}

function NivelesArbolConfig({ proyectoId, open, onClose, onSaved }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [ramaTab, setRamaTab] = useState('omoe');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    if (!open || !proyectoId) return undefined;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [nivelesRes, membershipRes] = await Promise.all([
          nivelesArbolApi.getAll(proyectoId),
          authApi.getProyectoMembership(proyectoId).catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        setDraft({
          omoe: nivelesRes.data?.omoe || [],
          omoc: nivelesRes.data?.omoc || [],
          omor: nivelesRes.data?.omor || [],
        });
        const m = membershipRes.data;
        setCanManage(Boolean(m?.puede_gestionar_miembros || m?.es_admin_global));
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'No se pudieron cargar los niveles.');
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

  const niveles = draft[ramaTab] || [];

  const setNivelesRama = (updater) => {
    setDraft((prev) => ({
      ...prev,
      [ramaTab]: typeof updater === 'function' ? updater(prev[ramaTab] || []) : updater,
    }));
  };

  const handleChange = (index, field, value) => {
    setNivelesRama((prev) =>
      prev.map((n, i) => (i === index ? { ...n, [field]: value } : n)),
    );
  };

  const handleAddNivel = () => {
    if (niveles.length >= MAX_NIVELES_ARBOL) return;
    const orden = niveles.length + 1;
    setNivelesRama((prev) => [
      ...prev,
      { id: null, orden, nombre: `Nivel ${orden}`, activo: true },
    ]);
  };

  const handleRemoveNivel = (index) => {
    if (niveles.length <= MIN_NIVELES_ARBOL) return;
    setNivelesRama((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((n, i) => ({ ...n, orden: i + 1 })),
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = niveles.map(({ id, nombre, activo }, index) => ({
        id: id || undefined,
        nombre: (nombre || '').trim() || `Nivel ${index + 1}`,
        activo: activo !== false,
      }));
      const res = await nivelesArbolApi.update(proyectoId, ramaTab, payload);
      const updated = res.data || [];
      const nextDraft = { ...draft, [ramaTab]: updated };
      setDraft(nextDraft);
      onSaved?.(nextDraft);
      onClose?.();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || data?.niveles?.[0] || 'No se pudieron guardar los niveles.');
    } finally {
      setSaving(false);
    }
  };

  const ramaMeta = RAMA_META[ramaTab];

  return (
    <div className={MODAL_BACKDROP_CLASS}>
      <div className="bg-white dark:bg-navy-900 rounded-xl shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Niveles del árbol por dimensión
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configuración por proyecto para OMOE, OMOC y OMOR. Puedes usar entre{' '}
            {MIN_NIVELES_ARBOL} y {MAX_NIVELES_ARBOL} niveles en cada rama.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700/60 p-0.5 bg-gray-50 dark:bg-navy-900/40 shrink-0">
          {RAMAS.map((rama) => (
            <button
              key={rama}
              type="button"
              onClick={() => setRamaTab(rama)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
                ramaTab === rama
                  ? 'bg-white dark:bg-navy-800 text-navy-700 dark:text-navy-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {RAMA_META[rama]?.label || rama.toUpperCase()}
            </button>
          ))}
        </div>

        {ramaMeta && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{ramaMeta.hint}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            {niveles.map((nivel, index) => (
              <div
                key={nivel.id ?? `new-${index}`}
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700/60"
              >
                <span className="text-xs font-semibold text-gray-400 w-8 shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={nivel.nombre || ''}
                  onChange={(e) => handleChange(index, 'nombre', e.target.value)}
                  disabled={!canManage}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-900/40"
                  placeholder={`Nivel ${index + 1}`}
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 shrink-0">
                  <input
                    type="checkbox"
                    checked={nivel.activo !== false}
                    onChange={(e) => handleChange(index, 'activo', e.target.checked)}
                    disabled={!canManage}
                  />
                  Activo
                </label>
                {canManage && niveles.length > MIN_NIVELES_ARBOL && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNivel(index)}
                    className="text-xs text-red-500 hover:text-red-600 shrink-0 px-1"
                    title="Quitar nivel"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && !loading && niveles.length < MAX_NIVELES_ARBOL && (
          <button
            type="button"
            onClick={handleAddNivel}
            className="btn-sm border-gray-200 dark:border-gray-700/60 w-full"
          >
            + Añadir nivel ({niveles.length}/{MAX_NIVELES_ARBOL})
          </button>
        )}

        {!canManage && !loading && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Solo el jefe del proyecto o un administrador global puede editar estos niveles.
          </p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 shrink-0">
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
              {saving ? 'Guardando…' : `Guardar ${ramaMeta?.label || ramaTab}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NivelesArbolConfig;

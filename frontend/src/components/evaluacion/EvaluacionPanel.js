import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { alternativas, evaluacionApi } from '../../api';
import SplitColumnLayout from '../../layout/SplitColumnLayout';
import EvaluacionMatrix from './EvaluacionMatrix';
import { buildDimensionMatrices } from './evaluacionUtils';

function AlternativasEvalSidebar({ items, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-1.5">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 px-2">
            No hay alternativas. Créalas en el módulo Alternativas.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = selectedId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    title={item.referencia ? `${item.nombre} — ${item.referencia}` : item.nombre}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-navy-500/[0.12] dark:from-navy-500/[0.24] to-navy-500/[0.04] text-navy-600 dark:text-navy-400'
                        : 'text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-navy-800/40'
                    }`}
                  >
                    <span className="font-medium text-sm block truncate leading-tight">{item.nombre}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function EvaluacionPanel({ proyectoId, canWrite = true }) {
  const [alternativasList, setAlternativasList] = useState([]);
  const [schema, setSchema] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [valores, setValores] = useState({});
  const [loadingAlt, setLoadingAlt] = useState(true);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [loadingValores, setLoadingValores] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);

  const loadAlternativas = useCallback(async () => {
    try {
      setLoadingAlt(true);
      const res = await alternativas.getByProyecto(proyectoId);
      setAlternativasList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAlt(false);
    }
  }, [proyectoId]);

  const loadSchema = useCallback(async () => {
    try {
      setLoadingSchema(true);
      const res = await evaluacionApi.getSchema(proyectoId);
      setSchema(res.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la matriz de evaluación.');
    } finally {
      setLoadingSchema(false);
    }
  }, [proyectoId]);

  const loadValores = useCallback(async (alternativaId) => {
    if (!alternativaId) {
      setValores({});
      return;
    }
    try {
      setLoadingValores(true);
      const res = await evaluacionApi.getValores(proyectoId, alternativaId);
      setValores(res.data.valores || {});
      setDirty(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los valores de evaluación.');
    } finally {
      setLoadingValores(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    loadAlternativas();
    loadSchema();
  }, [loadAlternativas, loadSchema]);

  useEffect(() => {
    if (selectedId) loadValores(selectedId);
    else setValores({});
  }, [selectedId, loadValores]);

  const dimensionMatrices = useMemo(() => buildDimensionMatrices(schema), [schema]);

  const selectedAlt = alternativasList.find((a) => a.id === selectedId);

  const handleCellChange = (key, value) => {
    setValores((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      setSaving(true);
      const res = await evaluacionApi.saveValores(proyectoId, selectedId, valores);
      setValores(res.data.valores || {});
      setDirty(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar la evaluación.');
    } finally {
      setSaving(false);
    }
  };

  const rightContent = () => {
    if (loadingAlt || loadingSchema) {
      return (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
        </div>
      );
    }

    if (alternativasList.length === 0) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center px-4">
          No hay alternativas en este proyecto. Créalas en el módulo{' '}
          <strong>Alternativas</strong> para diligenciar la evaluación.
        </p>
      );
    }

    if (!selectedId) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center px-4">
          Selecciona una alternativa para diligenciar la variable <strong>x</strong> por criterio
          y misión.
        </p>
      );
    }

    if (loadingValores) {
      return (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-0 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 sticky top-0 z-20 bg-white dark:bg-navy-900 pb-2 mb-1 border-b border-gray-100 dark:border-gray-800/60">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">
              {selectedAlt?.nombre || 'Alternativa'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Valor ofertado (x) por criterio y escenario
            </p>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50 shrink-0"
            >
              {saving ? 'Guardando…' : 'Guardar evaluación'}
            </button>
          )}
        </div>

        <EvaluacionMatrix
          matrices={dimensionMatrices}
          valores={valores}
          onChange={handleCellChange}
          disabled={!canWrite}
        />

        {error && <p className="text-xs text-red-500 shrink-0">{error}</p>}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full">
      <SplitColumnLayout
        title="Evaluación"
        description="Variable x por alternativa, escenario y criterio terminal."
        leftLabel="Alternativas"
        rightLabel="Matriz"
        leftWidthClass="lg:w-48 xl:w-52"
        rightPaddingClass="p-3 sm:p-4"
        left={
          <AlternativasEvalSidebar
            items={alternativasList}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loadingAlt}
          />
        }
        right={rightContent()}
      />
    </div>
  );
}

export default EvaluacionPanel;

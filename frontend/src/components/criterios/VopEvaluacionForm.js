import React, { useState, useEffect } from 'react';
import { vopResultadosApi } from '../../api';
import CriterioDynamicForm from './CriterioDynamicForm';
import { VOP_FORM_SCHEMA } from './nodeFormSchemas';

const VOP_FIELD_NAMES = VOP_FORM_SCHEMA.map((f) => f.name);

function buildVopDefaults(item) {
  const values = {};
  VOP_FIELD_NAMES.forEach((name) => {
    const v = item?.[name];
    if (name === 'cumplimiento_minimo') values[name] = v ?? true;
    else if (typeof v === 'number') values[name] = String(v);
    else values[name] = v ?? '';
  });
  return values;
}

function buildVopPayload(formData) {
  const payload = {};
  VOP_FIELD_NAMES.forEach((name) => {
    const val = formData[name];
    if (name === 'cumplimiento_minimo') payload[name] = Boolean(val);
    else if (['valor_real_ofertado', 'valor_umbral', 'valor_meta', 'vop_calculado'].includes(name)) {
      payload[name] = val === '' || val == null ? null : Number(val);
    } else {
      payload[name] = val ?? '';
    }
  });
  return payload;
}

/**
 * Captura VOP por alternativa y DP (nodo hoja del árbol).
 * No forma parte del árbol editable.
 */
function VopEvaluacionForm({ alternativaId, dpId, dpNombre, alternativaNombre, onSaved }) {
  const [formData, setFormData] = useState(buildVopDefaults());
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-900/40 text-gray-800 dark:text-gray-100 input-focus';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await vopResultadosApi.getByAlternativa(alternativaId);
        const row = (res.data || []).find((v) => String(v.dp) === String(dpId));
        if (!cancelled && row) {
          setExistingId(row.id);
          setFormData(buildVopDefaults(row));
        } else if (!cancelled) {
          setExistingId(null);
          setFormData(buildVopDefaults());
        }
      } catch {
        /* sin registro previo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alternativaId, dpId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...buildVopPayload(formData),
      alternativa: alternativaId,
      dp: dpId,
    };
    try {
      setLoading(true);
      setError(null);
      if (existingId) {
        await vopResultadosApi.update(existingId, payload);
      } else {
        const res = await vopResultadosApi.create(payload);
        setExistingId(res.data.id);
      }
      onSaved?.();
    } catch (err) {
      const data = err.response?.data || {};
      setError(data.detail || Object.values(data).flat().join(' ') || 'Error al guardar VOP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-gray-200 dark:border-gray-700/60 rounded-lg p-4">
      <div>
        <h4 className="font-semibold text-gray-800 dark:text-gray-100">Evaluación VOP</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Alternativa: {alternativaNombre || alternativaId} · Nodo (DP): {dpNombre || dpId}
        </p>
      </div>
      <CriterioDynamicForm
        level="_vop"
        formData={formData}
        onChange={setFormData}
        disabled={false}
        inputClass={inputClass}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary btn-sm disabled:opacity-50">
        {loading ? 'Guardando...' : existingId ? 'Actualizar VOP' : 'Registrar VOP'}
      </button>
    </form>
  );
}

export default VopEvaluacionForm;

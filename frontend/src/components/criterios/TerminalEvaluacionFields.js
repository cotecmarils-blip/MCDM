import React, { useCallback, useEffect, useState } from 'react';
import { tablasRiesgoApi } from '../../api';
import MopCriterioFields from './MopCriterioFields';
import TablasRiesgoConfig from './TablasRiesgoConfig';
import { defaultMopCriterioFields } from './mopCriterioOptions';

const DEFAULT_NIVELES = ['0.1', '0.3', '0.5', '0.7', '0.9'];

/** Clave canónica de un nivel: 0.10 -> "0.1" (coincide con el backend). */
export function nivelKey(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? String(n) : String(valor ?? '').trim();
}

/**
 * Configuración de evaluación del nodo terminal (aplica a todos los escenarios).
 * - Certeza: función de utilidad (tipo de criterio + familia).
 * - Incertidumbre: descripciones de consecuencia por nivel; el riesgo = probabilidad × consecuencia
 *   se calcula en el módulo de Evaluación.
 */
function TerminalEvaluacionFields({
  modo = 'certeza',
  tipoCriterio,
  familiaFunciones,
  parametrosFuncion,
  consecuenciaDescripciones = {},
  proyectoId = null,
  onChange,
  disabled = false,
  inputClass,
  compact = false,
}) {
  const [impactos, setImpactos] = useState([]);
  const [tablasOpen, setTablasOpen] = useState(false);

  const loadTablas = useCallback(async () => {
    if (!proyectoId) return;
    try {
      const res = await tablasRiesgoApi.get(proyectoId);
      setImpactos(res.data?.impactos || []);
    } catch (err) {
      console.error('Error cargando tablas de riesgo:', err);
    }
  }, [proyectoId]);

  useEffect(() => {
    loadTablas();
  }, [loadTablas]);

  const isIncert = modo === 'incertidumbre';

  const niveles = impactos.length
    ? impactos.map((i) => ({ key: nivelKey(i.valor), meta: i.descripcion || '' }))
    : DEFAULT_NIVELES.map((k) => ({ key: k, meta: '' }));

  const setModo = (next) => {
    if (next === 'incertidumbre') {
      onChange({ modo_evaluacion: 'incertidumbre' });
      return;
    }
    const defaults = defaultMopCriterioFields();
    const params = parametrosFuncion && Object.keys(parametrosFuncion).length
      ? parametrosFuncion
      : defaults.parametros_funcion;
    onChange({
      modo_evaluacion: 'certeza',
      tipo_criterio: tipoCriterio || defaults.tipo_criterio,
      familia_funciones: familiaFunciones || defaults.familia_funciones,
      parametros_funcion: params,
    });
  };

  const setDescripcion = (key, text) => {
    onChange({
      consecuencia_descripciones: { ...(consecuenciaDescripciones || {}), [key]: text },
    });
  };

  const segBtn = (value, label) => {
    const active = (value === 'incertidumbre') === isIncert;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setModo(value)}
        className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
          active
            ? 'bg-navy-600 text-white shadow-sm'
            : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-navy-500/10'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {label}
      </button>
    );
  };

  return (
    <section
      className={`rounded-xl border-2 border-amber-500/25 bg-gradient-to-b from-amber-500/[0.06] to-transparent ${
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
      }`}
    >
      <div>
        <h4 className={`font-bold text-amber-700 dark:text-amber-300 ${compact ? 'text-xs' : 'text-sm'}`}>
          Modo de evaluación del nodo
        </h4>
        {!compact && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Aplica a <strong>todos los escenarios</strong>. Certeza usa función de utilidad;
            Incertidumbre usa riesgo = probabilidad × consecuencia (se ingresa en Evaluación).
          </p>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-navy-900/50">
        {segBtn('certeza', 'Certeza')}
        {segBtn('incertidumbre', 'Incertidumbre')}
      </div>

      {!isIncert && (
        <MopCriterioFields
          tipoCriterio={tipoCriterio || defaultMopCriterioFields().tipo_criterio}
          familiaFunciones={familiaFunciones || defaultMopCriterioFields().familia_funciones}
          parametrosFuncion={parametrosFuncion}
          onChange={(util) => {
            const patch = { ...util };
            const p = util.parametros_funcion || {};
            if (p.L !== undefined && p.L !== '') patch.valor_umbral = p.L;
            if (p.U !== undefined && p.U !== '') patch.valor_meta = p.U;
            onChange(patch);
          }}
          disabled={disabled}
          inputClass={inputClass}
        />
      )}

      {isIncert && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Descripción de consecuencia por nivel
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={() => setTablasOpen(true)}
                className="text-[11px] text-navy-600 dark:text-navy-300 hover:underline"
              >
                Configurar niveles…
              </button>
            )}
          </div>
          {!impactos.length && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              No hay una escala de consecuencia configurada; se usan los niveles por defecto
              (0.1 – 0.9). Configúrela en «Configurar niveles».
            </p>
          )}
          <div className="space-y-1.5">
            {niveles.map(({ key, meta }) => (
              <div key={key} className="flex items-start gap-2">
                <span className="mt-1.5 w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                  {key}
                </span>
                <input
                  type="text"
                  value={(consecuenciaDescripciones || {})[key] ?? ''}
                  onChange={(e) => setDescripcion(key, e.target.value)}
                  disabled={disabled}
                  placeholder={meta ? `Ej.: ${meta}` : 'Describe la consecuencia en este nivel'}
                  className={`${inputClass} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <TablasRiesgoConfig
        proyectoId={proyectoId}
        open={tablasOpen}
        onClose={() => setTablasOpen(false)}
        onSaved={(data) => setImpactos(data?.impactos || [])}
      />
    </section>
  );
}

export default TerminalEvaluacionFields;

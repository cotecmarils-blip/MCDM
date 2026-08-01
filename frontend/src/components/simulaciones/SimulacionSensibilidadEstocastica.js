import React, { useCallback, useEffect, useState } from 'react';
import { simulacionApi } from '../../api';
import { sensibilidadRequestBody } from './simulacionSensibilidadUtils';
import SimulacionSensibilidadEstocasticaCharts from './SimulacionSensibilidadEstocasticaCharts';
import SimulacionPlotBgPicker from './SimulacionPlotBgPicker';

const MADM_LABELS = {
  topsis: 'TOPSIS',
  wsm: 'WSM',
  moora: 'MOORA',
  vikor: 'VIKOR',
  copras: 'COPRAS',
  aras: 'ARAS',
  codas: 'CODAS',
  edas: 'EDAS',
  mabac: 'MABAC',
  marcos: 'MARCOS',
  waspas: 'WASPAS',
  wpm: 'WPM',
};

function MatrixTable({ title, subtitle, matrix }) {
  if (!matrix?.index?.length || !matrix?.columns?.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/60">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h4>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-navy-900/60">
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Alt.</th>
            {matrix.columns.map((c) => (
              <th key={c} className="px-2 py-1.5 text-right font-semibold text-gray-500 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.index.map((rowId, i) => (
            <tr key={rowId} className="border-t border-gray-100 dark:border-gray-800/80">
              <td className="px-2 py-1.5 font-medium text-gray-700 dark:text-gray-200">{rowId}</td>
              {(matrix.values[i] || []).map((v, j) => (
                <td key={`${rowId}-${j}`} className="px-2 py-1.5 text-right font-mono">
                  {v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(3)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordsTable({ title, subtitle, rows, columns }) {
  if (!rows?.length) return null;
  const cols = columns || Object.keys(rows[0]).filter((k) => k !== 'id');
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/60">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h4>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-navy-900/60">
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Alt.</th>
            {cols.map((c) => (
              <th key={c} className="px-2 py-1.5 text-right font-semibold text-gray-500 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800/80">
              <td className="px-2 py-1.5 font-medium text-gray-700 dark:text-gray-200">{row.id}</td>
              {cols.map((c) => (
                <td key={`${row.id}-${c}`} className="px-2 py-1.5 text-right font-mono">
                  {typeof row[c] === 'string'
                    ? row[c]
                    : row[c] == null || Number.isNaN(Number(row[c]))
                      ? '—'
                      : Number(row[c]).toFixed(4)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function convNum(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return Number(row[k]);
  }
  return NaN;
}

function SimulacionSensibilidadEstocastica({
  proyectoId,
  resultado,
  plotBgColor = '#f7f7ef',
  onPlotBgColorChange,
}) {
  const historialKey = resultado?.historial_id ?? resultado?.titulo_historial ?? '';
  const [nivel, setNivel] = useState('macro');
  const [muestras, setMuestras] = useState(2048);
  const [concentracion, setConcentracion] = useState(40);
  const [concentracionMeso, setConcentracionMeso] = useState(40);
  const [samplingMethod, setSamplingMethod] = useState('mc');
  const [umbral, setUmbral] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ejemploReferencia, setEjemploReferencia] = useState(false);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async () => {
    if (!proyectoId || (!resultado && !ejemploReferencia)) return;
    setLoading(true);
    setError(null);
    try {
      const body = sensibilidadRequestBody(ejemploReferencia ? {} : resultado, {
        accion: 'estocastica',
        nivel,
        muestras: Number(muestras) || 2048,
        concentracion: Number(concentracion) || 40,
        concentracion_meso: Number(concentracionMeso) || 40,
        sampling_method: samplingMethod,
        seed: 42,
        ejemplo_referencia: ejemploReferencia,
      });
      if (ejemploReferencia) {
        body.ejemplo_referencia = true;
        // Demo no depende del historial guardado.
        delete body.historial_id;
        delete body.resultado;
      }
      if (!ejemploReferencia && umbral !== '' && umbral != null) {
        const thr = Number(umbral);
        if (!Number.isNaN(thr)) body.admissibility_threshold = thr;
      }
      if (ejemploReferencia) {
        // La guía usa umbral 0.40
        body.admissibility_threshold = 0.4;
      }
      const res = await simulacionApi.sensibilidad(proyectoId, body);
      if (!res.data?.ok) {
        setPayload(null);
        setError(res.data?.mensaje || 'No se pudo calcular la sensibilidad estocástica.');
        return;
      }
      setPayload(res.data);
    } catch (err) {
      setPayload(null);
      const data = err.response?.data;
      setError(
        (typeof data?.mensaje === 'string' && data.mensaje)
          || (typeof data?.detail === 'string' && data.detail)
          || (typeof data?.error === 'string' && data.error)
          || (err.response
            ? `Error del servidor (${err.response.status}). Vuelva a intentar tras el deploy.`
            : 'Error de red al calcular la sensibilidad estocástica.'),
      );
    } finally {
      setLoading(false);
    }
  }, [
    proyectoId,
    resultado,
    nivel,
    muestras,
    concentracion,
    concentracionMeso,
    samplingMethod,
    umbral,
    ejemploReferencia,
  ]);

  useEffect(() => {
    setPayload(null);
    setError(null);
  }, [historialKey]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const metodoLabel = MADM_LABELS[resultado?.opciones_calculo?.metodo_madm]
    || MADM_LABELS[payload?.metodo_madm]
    || payload?.metodo_madm_label
    || 'MADM';

  const nivelLabel = nivel === 'meso_macro' ? 'meso–macro' : 'macro';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Sensibilidad y robustez estocástica (SMAA · {nivelLabel})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
            Análisis SMAA: muestreo Dirichlet, agregación{' '}
            {payload?.aggregation === 'topsis' ? 'TOPSIS' : 'aditiva'} alineada a {metodoLabel},
            aceptabilidad de rangos, Kendall, dashboard, superficies 3D y detención secuencial.
          </p>
        </div>
        <SimulacionPlotBgPicker
          plotBgColor={plotBgColor}
          onChange={onPlotBgColorChange}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setNivel('macro')}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            nivel === 'macro'
              ? 'bg-navy-700 text-white border-navy-700'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          Enfoque macro
        </button>
        <button
          type="button"
          onClick={() => setNivel('meso_macro')}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            nivel === 'meso_macro'
              ? 'bg-navy-700 text-white border-navy-700'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          Meso–macro
        </button>
        <button
          type="button"
          onClick={() => {
            setEjemploReferencia((v) => {
              const next = !v;
              if (next) {
                setMuestras(4096);
                setUmbral('0.4');
                setSamplingMethod('mc');
              }
              return next;
            });
          }}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            ejemploReferencia
              ? 'bg-amber-700 text-white border-amber-700'
              : 'border-amber-300 text-amber-800 dark:border-amber-600 dark:text-amber-200'
          }`}
          title="Carga un ejemplo de referencia (alternativas A–F, dimensiones OMOC/OMOE/OMOR)"
        >
          {ejemploReferencia ? 'Ejemplo de referencia (activo)' : 'Cargar ejemplo de referencia'}
        </button>
      </div>

      {ejemploReferencia && (
        <p className="text-xs text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
          Ejemplo de referencia: alternativas A–F, matriz OMOC/OMOE/OMOR, Dirichlet uniforme,
          umbral de admisibilidad 0.40 y agregación aditiva. No usa el cálculo del proyecto;
          sirve para revisar el módulo. Cambia macro ↔ meso–macro y pulsa Recalcular.
        </p>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white/70 dark:bg-navy-950/30 p-3 flex flex-wrap gap-3 items-end">
        <label className="text-xs text-gray-600 dark:text-gray-300">
          Iteraciones máx.
          <input
            type="number"
            min={256}
            max={16384}
            step={256}
            value={muestras}
            onChange={(e) => setMuestras(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-navy-950 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-600 dark:text-gray-300">
          Concentración Dirichlet (macro)
          <input
            type="number"
            min={2}
            max={500}
            step={1}
            value={concentracion}
            onChange={(e) => setConcentracion(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-navy-950 px-2 py-1.5 text-sm"
          />
          <span className="block text-[10px] text-gray-400 mt-1">
            Más alto = pesos más cercanos al cálculo original
          </span>
        </label>
        {nivel === 'meso_macro' && (
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Concentración meso (λ)
            <input
              type="number"
              min={2}
              max={500}
              step={1}
              value={concentracionMeso}
              onChange={(e) => setConcentracionMeso(e.target.value)}
              className="mt-1 block w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-navy-950 px-2 py-1.5 text-sm"
            />
          </label>
        )}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="btn btn-sm border border-gray-300 dark:border-gray-600 text-sm"
        >
          {showAdvanced ? 'Ocultar avanzado' : 'Parámetros avanzados'}
        </button>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="btn btn-primary text-sm disabled:opacity-50"
        >
          {loading ? 'Calculando…' : 'Recalcular'}
        </button>
      </div>

      {showAdvanced && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3 flex flex-wrap gap-3 items-end">
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Método de muestreo
            <select
              value={samplingMethod}
              onChange={(e) => setSamplingMethod(e.target.value)}
              className="mt-1 block w-40 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-navy-950 px-2 py-1.5 text-sm"
            >
              <option value="mc">Monte Carlo</option>
              <option value="lhs">LHS (requiere SciPy)</option>
              <option value="sobol">Sobol (requiere SciPy)</option>
            </select>
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Umbral de admisibilidad
            <input
              type="number"
              step={0.01}
              min={0}
              max={1}
              placeholder="opcional"
              value={umbral}
              onChange={(e) => setUmbral(e.target.value)}
              className="mt-1 block w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-navy-950 px-2 py-1.5 text-sm"
            />
            <span className="block text-[10px] text-gray-400 mt-1">
              Activa columna P(admisible) en el dashboard
            </span>
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 whitespace-pre-wrap">
          {error}
        </p>
      )}

      {payload?.ok && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Iteraciones</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {payload.muestras}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Muestreo</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 uppercase">
                {payload.sampling_method || 'mc'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Ganador base</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
                {payload.baseline_winner || '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                P(1.º) ganador base
              </p>
              <p className="text-lg font-semibold text-navy-700 dark:text-navy-300">
                {payload.estabilidad_ganador_pct?.toFixed?.(1) ?? payload.estabilidad_ganador_pct}%
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Parada</p>
              <p className="text-xs text-gray-700 dark:text-gray-200 leading-snug">
                {payload.stop_reason || '—'}
              </p>
            </div>
          </div>

          <SimulacionSensibilidadEstocasticaCharts
            payload={payload}
            plotBgColor={plotBgColor}
          />

          <RecordsTable
            title="Dashboard de robustez"
            subtitle="Score base, P(1.º), Q05, regret normalizado, estabilidad ordinal, P(admisible)."
            rows={payload.robustness_dashboard}
          />

          <MatrixTable
            title="Aceptabilidad de rangos (SMAA-2)"
            subtitle="Proporción de escenarios en los que cada alternativa ocupa cada puesto."
            matrix={payload.rank_acceptability}
          />

          <MatrixTable
            title="Preferencia pareada"
            subtitle="P(score_i > score_k) sobre el muestreo de pesos."
            matrix={payload.pairwise_preference}
          />

          <RecordsTable
            title="Resumen de scores"
            subtitle="Distribución del score agregado bajo incertidumbre de pesos."
            rows={payload.score_summary}
          />

          <RecordsTable
            title="Regret"
            subtitle="Distancia al mejor score de cada iteración."
            rows={payload.regret_summary}
          />

          {payload.omoe_derived_distribution && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 p-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                OMOE derivado (meso–macro)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Distribución del valor OMOE = λ₁z₁ + λ₂z₂ sobre el muestreo meso.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-navy-900/60">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Alt.</th>
                      <th className="px-2 py-1.5 text-right">Media</th>
                      <th className="px-2 py-1.5 text-right">Q05</th>
                      <th className="px-2 py-1.5 text-right">Q95</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payload.omoe_derived_distribution.index || []).map((name, i) => (
                      <tr key={name} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-2 py-1.5">{name}</td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {Number(payload.omoe_derived_distribution.mean[i]).toFixed(4)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {Number(payload.omoe_derived_distribution.q05[i]).toFixed(4)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {Number(payload.omoe_derived_distribution.q95[i]).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payload.convergence?.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 p-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                Diagnóstico de convergencia
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Últimos puntos de control del monitor secuencial.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-navy-900/60">
                    <tr>
                      <th className="px-2 py-1.5 text-left">N</th>
                      <th className="px-2 py-1.5 text-right">Δ rango</th>
                      <th className="px-2 py-1.5 text-right">Δ cuantil</th>
                      <th className="px-2 py-1.5 text-right">½ Wilson</th>
                      <th className="px-2 py-1.5 text-left">Líder</th>
                      <th className="px-2 py-1.5 text-left">OK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.convergence.slice(-8).map((row) => {
                      const n = convNum(row, 'Iteraciones', 'iterations');
                      const dR = convNum(row, 'Cambio máx. aceptabilidad', 'max_rank_change');
                      const dQ = convNum(row, 'Cambio máx. cuantiles', 'max_quantile_change');
                      const wil = convNum(row, 'Semiancho Wilson máx.', 'max_wilson_half_width');
                      const leader = row['Alternativa líder'] || row.leading_alternative || '—';
                      const ok = row['Criterios cumplidos'] ?? row.criteria_satisfied;
                      return (
                        <tr key={row.id || n} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-2 py-1.5 font-mono">{Number.isFinite(n) ? n : '—'}</td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {Number.isFinite(dR) ? dR.toFixed(4) : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {Number.isFinite(dQ) ? dQ.toFixed(4) : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">
                            {Number.isFinite(wil) ? wil.toFixed(4) : '—'}
                          </td>
                          <td className="px-2 py-1.5">{leader}</td>
                          <td className="px-2 py-1.5">{ok ? 'sí' : 'no'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SimulacionSensibilidadEstocastica;

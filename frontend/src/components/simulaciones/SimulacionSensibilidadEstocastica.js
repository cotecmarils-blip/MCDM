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

function SimulacionSensibilidadEstocastica({
  proyectoId,
  resultado,
  plotBgColor = '#f7f7ef',
  onPlotBgColorChange,
}) {
  const historialKey = resultado?.historial_id ?? resultado?.titulo_historial ?? '';
  const [muestras, setMuestras] = useState(500);
  const [concentracion, setConcentracion] = useState(40);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async () => {
    if (!proyectoId || !resultado) return;
    setLoading(true);
    setError(null);
    try {
      const res = await simulacionApi.sensibilidad(
        proyectoId,
        sensibilidadRequestBody(resultado, {
          accion: 'estocastica',
          muestras: Number(muestras) || 500,
          concentracion: Number(concentracion) || 40,
          seed: 42,
        }),
      );
      if (!res.data?.ok) {
        setPayload(null);
        setError(res.data?.mensaje || 'No se pudo calcular la sensibilidad estocástica.');
        return;
      }
      setPayload(res.data);
    } catch (err) {
      setPayload(null);
      setError(
        err.response?.data?.mensaje
          || err.response?.data?.detail
          || 'Error al calcular la sensibilidad estocástica.',
      );
    } finally {
      setLoading(false);
    }
  }, [proyectoId, resultado, muestras, concentracion]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Análisis de sensibilidad estocástica (macro)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
            Simula muchas perturbaciones aleatorias de los pesos entre dimensiones y vuelve a
            correr el ranking {metodoLabel}. Sirve para ver qué tan estable es el ganador cuando
            hay incertidumbre en la ponderación macro.
          </p>
        </div>
        <SimulacionPlotBgPicker
          plotBgColor={plotBgColor}
          onChange={onPlotBgColorChange}
        />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white/70 dark:bg-navy-950/30 p-3 flex flex-wrap gap-3 items-end">
        <label className="text-xs text-gray-600 dark:text-gray-300">
          Simulaciones
          <input
            type="number"
            min={50}
            max={3000}
            step={50}
            value={muestras}
            onChange={(e) => setMuestras(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-navy-950 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-600 dark:text-gray-300">
          Concentración
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
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="btn btn-primary text-sm disabled:opacity-50"
        >
          {loading ? 'Calculando…' : 'Recalcular'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
          {error}
        </p>
      )}

      {payload?.ok && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Simulaciones</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {payload.muestras}
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
                Estabilidad del ganador
              </p>
              <p className="text-lg font-semibold text-navy-700 dark:text-navy-300">
                {payload.estabilidad_ganador_pct?.toFixed?.(1) ?? payload.estabilidad_ganador_pct}%
              </p>
            </div>
          </div>

          <SimulacionSensibilidadEstocasticaCharts
            payload={payload}
            plotBgColor={plotBgColor}
          />

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/60">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-navy-900/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Alternativa</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">P(1.º)</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Score medio</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Desv. std</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Rank base</th>
                </tr>
              </thead>
              <tbody>
                {(payload.alternatives || []).map((alt) => (
                  <tr
                    key={alt.name}
                    className="border-t border-gray-100 dark:border-gray-800/80"
                  >
                    <td className="px-3 py-2 font-medium">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                        style={{ backgroundColor: alt.color }}
                      />
                      {alt.name}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {Number(alt.win_probability_pct).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {Number(alt.score_mean).toFixed(4)}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {Number(alt.score_std).toFixed(4)}
                    </td>
                    <td className="px-3 py-2 font-mono">{alt.baseline_rank || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default SimulacionSensibilidadEstocastica;

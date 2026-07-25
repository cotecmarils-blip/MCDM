import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from '../../ThemeContext';
import { DEFAULT_PLOT_BG_COLOR } from './simulacionPlotBg';

function SimulacionSensibilidadEstocasticaCharts({
  payload,
  plotBgColor = DEFAULT_PLOT_BG_COLOR,
}) {
  const { isDark } = useTheme();
  const fontColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  const winPlot = useMemo(() => {
    const alts = payload?.alternatives || [];
    if (!alts.length) return null;
    return {
      x: alts.map((a) => a.name),
      y: alts.map((a) => a.win_probability_pct),
      colors: alts.map((a) => a.color),
      text: alts.map((a) => `${Number(a.win_probability_pct).toFixed(1)}%`),
    };
  }, [payload]);

  const rankPlot = useMemo(() => {
    const alts = payload?.alternatives || [];
    if (!alts.length) return null;
    const ranks = (alts[0]?.rank_frequency_pct || []).map((_, idx) => `Puesto ${idx + 1}`);
    return {
      alts,
      ranks,
      traces: ranks.map((rankLabel, rankIdx) => ({
        name: rankLabel,
        x: alts.map((a) => a.name),
        y: alts.map((a) => a.rank_frequency_pct?.[rankIdx] ?? 0),
      })),
    };
  }, [payload]);

  if (!payload?.ok) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 p-3">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Probabilidad de quedar 1.º
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Cuántas veces gana cada alternativa al perturbar los pesos entre dimensiones.
        </p>
        {winPlot ? (
          <Plot
            data={[{
              type: 'bar',
              x: winPlot.x,
              y: winPlot.y,
              text: winPlot.text,
              textposition: 'outside',
              marker: { color: winPlot.colors },
              hovertemplate: '%{x}<br>%{y:.1f}%<extra></extra>',
            }]}
            layout={{
              autosize: true,
              height: 320,
              margin: { l: 48, r: 24, t: 24, b: 64 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: plotBgColor,
              font: { color: fontColor, size: 11 },
              yaxis: {
                title: 'Probabilidad (%)',
                range: [0, Math.max(100, ...winPlot.y) * 1.15],
                gridcolor: gridColor,
              },
              xaxis: { tickangle: -20 },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 p-3">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Distribución de puestos
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Frecuencia con la que cada alternativa cae en cada posición del ranking.
        </p>
        {rankPlot ? (
          <Plot
            data={rankPlot.traces.map((trace) => ({
              type: 'bar',
              name: trace.name,
              x: trace.x,
              y: trace.y,
              hovertemplate: '%{x}<br>%{fullData.name}: %{y:.1f}%<extra></extra>',
            }))}
            layout={{
              autosize: true,
              height: 340,
              barmode: 'stack',
              margin: { l: 48, r: 24, t: 24, b: 64 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: plotBgColor,
              font: { color: fontColor, size: 11 },
              yaxis: {
                title: 'Frecuencia (%)',
                range: [0, 100],
                gridcolor: gridColor,
              },
              xaxis: { tickangle: -20 },
              legend: { orientation: 'h', y: 1.12 },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        ) : null}
      </div>
    </div>
  );
}

export default SimulacionSensibilidadEstocasticaCharts;

import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from '../../ThemeContext';
import { buildChartSeries } from '../../utils/sensitivityCalculations';

export default function SensitivityChart({
  criteria,
  weights,
  localPriorities,
  alternatives,
  onWeightChange,
}) {
  const { isDark } = useTheme();

  const { labels, series, bars } = useMemo(
    () => buildChartSeries(alternatives, criteria, weights, localPriorities),
    [alternatives, criteria, weights, localPriorities],
  );

  const barWeights = bars.map((b) => b.weight);

  const plotData = [
    {
      type: 'bar',
      x: labels,
      y: [...barWeights, null],
      name: 'Peso criterio',
      marker: { color: isDark ? '#6b7280' : '#9ca3af' },
      yaxis: 'y',
      hovertemplate: '%{x}<br>Peso: %{y:.3f}<extra></extra>',
    },
    ...series.map((s) => ({
      type: 'scatter',
      mode: 'lines+markers',
      x: labels,
      y: s.values,
      name: s.name,
      line: { color: s.color, width: 2 },
      marker: { color: s.color, size: 7 },
      yaxis: 'y2',
      hovertemplate: '%{x}<br>%{fullData.name}: %{y:.3f}<extra></extra>',
    })),
  ];

  const layout = {
    autosize: true,
    height: 420,
    margin: { l: 55, r: 55, t: 30, b: 90 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: isDark ? '#e5e7eb' : '#374151', size: 11 },
    xaxis: {
      tickangle: -35,
      gridcolor: isDark ? '#374151' : '#e5e7eb',
    },
    yaxis: {
      title: 'Crit%',
      range: [0, 1.05],
      gridcolor: isDark ? '#374151' : '#e5e7eb',
      side: 'left',
    },
    yaxis2: {
      title: 'Alt%',
      range: [0, 1.05],
      overlaying: 'y',
      side: 'right',
      gridcolor: 'transparent',
    },
    legend: { orientation: 'h', y: -0.35 },
    bargap: 0.25,
  };

  const handlePlotClick = (event) => {
    if (!onWeightChange || !event.points?.length) return;
    const point = event.points[0];
    if (point.curveNumber !== 0) return;
    const idx = point.pointIndex;
    if (idx >= criteria.length) return;
    const criterion = criteria[idx];
    const next = Math.min(1, Math.max(0, (point.y ?? 0) + 0.05));
    onWeightChange(criterion, next);
  };

  return (
    <div className="space-y-3">
      <Plot
        data={plotData}
        layout={layout}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
        onClick={handlePlotClick}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {criteria.map((criterion) => (
          <label key={criterion} className="flex flex-col gap-1 text-xs">
            <span className="text-gray-600 dark:text-gray-400 truncate" title={criterion}>
              {criterion}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={weights[criterion] ?? 0}
              onChange={(e) => onWeightChange(criterion, parseFloat(e.target.value))}
              className="w-full accent-navy-700"
            />
            <span className="tabular-nums text-navy-700 dark:text-navy-300">
              {(weights[criterion] ?? 0).toFixed(3)}
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Las barras son pesos (Crit%). Las líneas son puntajes locales de alternativas (Alt%).
        Mover una barra no cambia los puntajes locales; recalcula el OVERALL.
      </p>
    </div>
  );
}

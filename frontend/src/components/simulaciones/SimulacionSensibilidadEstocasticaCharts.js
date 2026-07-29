import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from '../../ThemeContext';
import { DEFAULT_PLOT_BG_COLOR } from './simulacionPlotBg';

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 p-3">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h4>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{subtitle}</p>
      )}
      {children}
    </div>
  );
}

function Surface3D({ title, subtitle, surface, plotBgColor, fontColor, zlabel }) {
  if (!surface?.x?.length) return null;
  return (
    <Section title={title} subtitle={subtitle}>
      <Plot
        data={[{
          type: 'mesh3d',
          x: surface.x,
          y: surface.y,
          z: surface.z,
          intensity: surface.z,
          colorscale: 'Viridis',
          showscale: true,
          opacity: 0.95,
          hovertemplate: `x=%{x:.3f}<br>y=%{y:.3f}<br>${zlabel}=%{z:.4f}<extra></extra>`,
        }]}
        layout={{
          autosize: true,
          height: 360,
          margin: { l: 0, r: 0, t: 16, b: 0 },
          paper_bgcolor: 'transparent',
          scene: {
            bgcolor: plotBgColor,
            xaxis: { title: 'bary x', color: fontColor },
            yaxis: { title: 'bary y', color: fontColor },
            zaxis: { title: zlabel, color: fontColor },
          },
          font: { color: fontColor, size: 11 },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
        useResizeHandler
      />
    </Section>
  );
}

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
    const ranks = (alts[0]?.rank_frequency_pct || []).map((_, idx) => `Rango ${idx + 1}`);
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

  const ternaryPlot = useMemo(() => {
    const pts = payload?.ternary_winner_map?.points;
    if (!pts?.length) return null;
    const byWinner = {};
    pts.forEach((p) => {
      if (!byWinner[p.winner]) byWinner[p.winner] = { x: [], y: [], color: p.color, name: p.winner };
      byWinner[p.winner].x.push(p.x ?? (p.w1 + 0.5 * p.w2));
      byWinner[p.winner].y.push(p.y ?? ((Math.sqrt(3) / 2) * p.w2));
    });
    return {
      criteria: payload.ternary_winner_map.criteria || [],
      traces: Object.values(byWinner),
    };
  }, [payload]);

  const kendall = payload?.kendall_tau;
  const cond = payload?.conditional_macro_weights;
  const condMeso = payload?.conditional_meso_weights;
  const surfaces = payload?.surfaces_3d || {};
  const convP1 = payload?.convergence_p1 || [];

  if (!payload?.ok) return null;

  return (
    <div className="space-y-4">
      <Section
        title="Probabilidad de primer lugar P(rango=1)"
        subtitle="Aceptabilidad SMAA-2 del primer puesto bajo incertidumbre de pesos."
      >
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
      </Section>

      <Section
        title="Aceptabilidad de rangos"
        subtitle="Frecuencia con la que cada alternativa cae en cada rango del ordenamiento."
      >
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
              barmode: 'stack',
              autosize: true,
              height: 340,
              margin: { l: 48, r: 24, t: 24, b: 64 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: plotBgColor,
              font: { color: fontColor, size: 11 },
              yaxis: { title: '%', gridcolor: gridColor, range: [0, 100] },
              xaxis: { tickangle: -20 },
              legend: { orientation: 'h' },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        ) : null}
      </Section>

      {ternaryPlot && (
        <Section
          title="Regiones de ganador en el simplex (mapa ternario)"
          subtitle={`Criterios: ${(ternaryPlot.criteria || []).join(' · ')}. Cada punto es una muestra de pesos.`}
        >
          <Plot
            data={ternaryPlot.traces.map((t) => ({
              type: 'scatter',
              mode: 'markers',
              name: t.name,
              x: t.x,
              y: t.y,
              marker: { color: t.color, size: 6, opacity: 0.75 },
              hovertemplate: `${t.name}<extra></extra>`,
            }))}
            layout={{
              autosize: true,
              height: 380,
              margin: { l: 40, r: 20, t: 20, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: plotBgColor,
              font: { color: fontColor, size: 11 },
              xaxis: { title: 'coordenada baricéntrica x', zeroline: false, gridcolor: gridColor },
              yaxis: {
                title: 'coordenada baricéntrica y',
                zeroline: false,
                gridcolor: gridColor,
                scaleanchor: 'x',
                scaleratio: 1,
              },
              legend: { orientation: 'h' },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        </Section>
      )}

      {kendall?.histogram && (
        <Section
          title="Concordancia ordinal (τ de Kendall)"
          subtitle={`Distribución del τ vs ranking nominal. Media = ${Number(kendall.mean).toFixed(3)}.`}
        >
          <Plot
            data={[{
              type: 'bar',
              x: (kendall.histogram.bins || []).slice(0, -1).map((b, i) => {
                const next = kendall.histogram.bins[i + 1];
                return (Number(b) + Number(next)) / 2;
              }),
              y: kendall.histogram.counts,
              marker: { color: '#59636E' },
              hovertemplate: 'τ≈%{x:.2f}<br>n=%{y}<extra></extra>',
            }]}
            layout={{
              autosize: true,
              height: 300,
              margin: { l: 48, r: 24, t: 20, b: 48 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: plotBgColor,
              font: { color: fontColor, size: 11 },
              xaxis: { title: 'τ de Kendall', range: [-1, 1], gridcolor: gridColor },
              yaxis: { title: 'Frecuencia', gridcolor: gridColor },
              shapes: [{
                type: 'line',
                x0: kendall.mean,
                x1: kendall.mean,
                y0: 0,
                y1: 1,
                yref: 'paper',
                line: { color: '#8B1E3F', width: 2, dash: 'dash' },
              }],
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        </Section>
      )}

      {cond?.rows?.length > 0 && (
        <Section
          title={`Pesos macro condicionados a que gane ${cond.alternative}`}
          subtitle="Distribución de pesos en las muestras donde la alternativa ocupa el 1.er lugar."
        >
          <Plot
            data={[
              {
                type: 'bar',
                name: 'media',
                x: cond.rows.map((r) => r.id),
                y: cond.rows.map((r) => Number(r.media) * 100),
                marker: { color: '#1F4E79' },
              },
            ]}
            layout={{
              autosize: true,
              height: 280,
              margin: { l: 48, r: 24, t: 20, b: 64 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: plotBgColor,
              font: { color: fontColor, size: 11 },
              yaxis: { title: 'Peso medio (%)', gridcolor: gridColor },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        </Section>
      )}

      {condMeso?.rows?.length > 0 && (
        <Section
          title={`Pesos meso (λ) condicionados a que gane ${condMeso.alternative}`}
          subtitle="Distribución de pesos contextuales OMOE cuando la alternativa es 1.ª."
        >
          <Plot
            data={[{
              type: 'bar',
              x: condMeso.rows.map((r) => r.id),
              y: condMeso.rows.map((r) => Number(r.media) * 100),
              marker: { color: '#2E6F40' },
            }]}
            layout={{
              autosize: true,
              height: 260,
              margin: { l: 48, r: 24, t: 20, b: 48 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: plotBgColor,
              font: { color: fontColor, size: 11 },
              yaxis: { title: 'λ medio (%)', gridcolor: gridColor },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        </Section>
      )}

      {convP1.length > 0 && (
        <Section
          title="Convergencia de P(rango=1)"
          subtitle="Evolución de la probabilidad de primer lugar a lo largo de los lotes."
        >
          <Plot
            data={(payload.alternatives || []).map((a) => ({
              type: 'scatter',
              mode: 'lines+markers',
              name: a.name,
              x: convP1.map((row) => row.iterations),
              y: convP1.map((row) => (row.p_first?.[a.name] ?? 0) * 100),
              line: { color: a.color },
              marker: { size: 5 },
            }))}
            layout={{
              autosize: true,
              height: 320,
              margin: { l: 48, r: 24, t: 20, b: 48 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: plotBgColor,
              font: { color: fontColor, size: 11 },
              xaxis: { title: 'Iteraciones', gridcolor: gridColor },
              yaxis: { title: 'P(1.º) %', gridcolor: gridColor },
              legend: { orientation: 'h' },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
            useResizeHandler
          />
        </Section>
      )}

      {surfaces.score && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Surface3D
            title={`Superficie 3D de score — ${surfaces.target}`}
            subtitle="Score sobre el simplex macro (matriz de referencia)."
            surface={surfaces.score}
            plotBgColor={plotBgColor}
            fontColor={fontColor}
            zlabel="Score"
          />
          <Surface3D
            title={`Margen pareado ${surfaces.target} − ${surfaces.rival}`}
            subtitle="Frontera de indiferencia donde el margen se anula."
            surface={surfaces.pairwise_margin}
            plotBgColor={plotBgColor}
            fontColor={fontColor}
            zlabel="Margen"
          />
          <Surface3D
            title={`Margen de victoria — ${surfaces.target}`}
            subtitle="Diferencia frente a la segunda mejor en cada punto del simplex."
            surface={surfaces.victory_margin}
            plotBgColor={plotBgColor}
            fontColor={fontColor}
            zlabel="Victoria"
          />
          <Surface3D
            title={`Regret — ${surfaces.target}`}
            subtitle="Distancia al mejor score alcanzable en cada configuración de pesos."
            surface={surfaces.regret}
            plotBgColor={plotBgColor}
            fontColor={fontColor}
            zlabel="Regret"
          />
        </div>
      )}
    </div>
  );
}

export default SimulacionSensibilidadEstocasticaCharts;

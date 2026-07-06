import React from 'react';

const W = 280;
const H = 130;
const PAD = { t: 12, r: 12, b: 28, l: 36 };
const CW = W - PAD.l - PAD.r;
const CH = H - PAD.t - PAD.b;

function scaleLinear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

function Axis({ xLabel, yLabel }) {
  return (
    <>
      <line x1={PAD.l} y1={PAD.t + CH} x2={PAD.l + CW} y2={PAD.t + CH} stroke="currentColor" strokeOpacity={0.25} />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + CH} stroke="currentColor" strokeOpacity={0.25} />
      {xLabel && (
        <text x={PAD.l + CW / 2} y={H - 6} textAnchor="middle" className="fill-gray-500 text-[9px]">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={10}
          y={PAD.t + CH / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${PAD.t + CH / 2})`}
          className="fill-gray-500 text-[9px]"
        >
          {yLabel}
        </text>
      )}
    </>
  );
}

function LineChart({ points, xLabel, yLabel, color = '#1e3a5f' }) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xScale = scaleLinear([Math.min(...xs), Math.max(...xs)], [PAD.l, PAD.l + CW]);
  const yScale = scaleLinear([0, Math.max(...ys, 1)], [PAD.t + CH, PAD.t]);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.x)},${yScale(p.y)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px] text-gray-700 dark:text-gray-300">
      <Axis xLabel={xLabel} yLabel={yLabel} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {points.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={xScale(p.x)} cy={yScale(p.y)} r={2.5} fill={color} />
      ))}
    </svg>
  );
}

function BarChart({ labels, values, yMax, title }) {
  const maxV = yMax || Math.max(...values, 0.01);
  const barW = CW / values.length - 8;
  const yScale = scaleLinear([0, maxV], [PAD.t + CH, PAD.t]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px] text-gray-700 dark:text-gray-300">
      {title && (
        <text x={PAD.l} y={10} className="fill-gray-500 text-[9px]">
          {title}
        </text>
      )}
      <Axis xLabel="Dimensión" yLabel="Peso" />
      {values.map((v, i) => {
        const x = PAD.l + i * (barW + 8) + 4;
        const y = yScale(v);
        const h = PAD.t + CH - y;
        return (
          <g key={labels[i]}>
            <rect x={x} y={y} width={barW} height={h} rx={2} className="fill-navy-500/70" />
            <text
              x={x + barW / 2}
              y={PAD.t + CH + 14}
              textAnchor="middle"
              className="fill-gray-500 text-[8px]"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BeforeAfterBars({ before, after, title }) {
  const maxV = Math.max(...before, ...after, 0.01);
  const groups = before.length;
  const groupW = CW / groups;
  const barW = groupW * 0.28;
  const yScale = scaleLinear([0, maxV], [PAD.t + CH, PAD.t]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px] text-gray-700 dark:text-gray-300">
      {title && (
        <text x={PAD.l} y={10} className="fill-gray-500 text-[9px]">
          {title}
        </text>
      )}
      <Axis xLabel="Alternativa" yLabel="Valor" />
      {before.map((b, i) => {
        const gx = PAD.l + i * groupW + groupW * 0.15;
        const bx = gx;
        const ax = gx + barW + 4;
        const by = yScale(b);
        const ay = yScale(after[i]);
        return (
          <g key={`g-${i}`}>
            <rect x={bx} y={by} width={barW} height={PAD.t + CH - by} rx={1} className="fill-gray-400/60" />
            <rect x={ax} y={ay} width={barW} height={PAD.t + CH - ay} rx={1} className="fill-navy-500/75" />
            <text x={gx + barW} y={PAD.t + CH + 14} textAnchor="middle" className="fill-gray-500 text-[8px]">
              A{i + 1}
            </text>
          </g>
        );
      })}
      <text x={PAD.l + CW - 4} y={PAD.t + 8} textAnchor="end" className="fill-gray-400 text-[8px]">
        gris = original · azul = normalizado
      </text>
    </svg>
  );
}

function MethodDocChart({ chartId }) {
  switch (chartId) {
    case 'directional_minmax': {
      const points = [2, 4, 6, 8, 10].map((x) => ({ x, y: (x - 2) / 8 }));
      return <LineChart points={points} xLabel="xᵢⱼ" yLabel="rᵢⱼ (max)" />;
    }
    case 'vector':
    case 'directional_vector':
      return <BeforeAfterBars before={[3, 4, 5]} after={[0.42, 0.57, 0.71]} title="Ejemplo columna" />;
    case 'sum':
      return <BeforeAfterBars before={[2, 3, 5]} after={[0.2, 0.3, 0.5]} title="Beneficio: proporción a la suma" />;
    case 'equal_weights':
      return <BarChart labels={['C1', 'C2', 'C3', 'C4']} values={[0.25, 0.25, 0.25, 0.25]} yMax={0.3} />;
    case 'user_defined_weights':
      return <BarChart labels={['D1', 'D2', 'D3']} values={[0.4, 0.35, 0.25]} yMax={0.5} title="p = 40 %, 35 %, 25 %" />;
    case 'entropy':
      return <BarChart labels={['C1', 'C2', 'C3']} values={[0.18, 0.45, 0.37]} title="Más diversidad → mayor peso" />;
    case 'critic':
      return <BarChart labels={['C1', 'C2', 'C3']} values={[0.22, 0.51, 0.27]} title="σ y conflicto" />;
    default:
      return null;
  }
}

export default MethodDocChart;

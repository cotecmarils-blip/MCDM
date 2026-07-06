import React, { useMemo } from 'react';
import { abbreviateDim, coerceWeightsMap } from './simulacionSensibilidadUtils';

function HorizBar({ label, value, max, color, suffix = '%', title }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]" title={title || label}>
      <span className="w-24 shrink-0 truncate text-gray-500 dark:text-gray-400 text-right">
        {label}
      </span>
      <div className="flex-1 h-4 rounded bg-gray-200/80 dark:bg-navy-800 overflow-hidden">
        <div
          className="h-full rounded"
          style={{ width: `${pct}%`, backgroundColor: color || '#1f4ed8' }}
        />
      </div>
      <span className="w-12 shrink-0 tabular-nums text-gray-700 dark:text-gray-200 text-right">
        {suffix === '%' ? `${(value * 100).toFixed(1)}%` : value.toFixed(3)}
      </span>
    </div>
  );
}

export default function SimulacionSensibilidadDynamicPanel({
  criteria,
  weights,
  alternatives,
  scoresByAlt,
  onWeightChange,
  metodoLabel,
}) {
  const wmap = coerceWeightsMap(weights, criteria);

  const maxScore = useMemo(() => {
    const vals = alternatives.map((a) => scoresByAlt?.[a.name] ?? 0);
    return Math.max(...vals, 0.001);
  }, [alternatives, scoresByAlt]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
          Pesos (Dynamic)
        </p>
        <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700/60 p-3 bg-white/60 dark:bg-navy-900/40">
          {criteria.map((criterion) => (
            <div key={criterion} className="space-y-1">
              <HorizBar
                label={abbreviateDim(criterion, 18)}
                value={wmap[criterion] ?? 0}
                max={1}
                color="#64748b"
                title={`${criterion} — ${((wmap[criterion] ?? 0) * 100).toFixed(1)}%`}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.005}
                value={wmap[criterion] ?? 0}
                onChange={(e) => onWeightChange(criterion, parseFloat(e.target.value))}
                className="w-full accent-slate-600 h-1"
                aria-label={`Peso ${criterion}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
          Puntuación {metodoLabel}
        </p>
        <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700/60 p-3 bg-white/60 dark:bg-navy-900/40">
          {alternatives.map((alt) => (
            <HorizBar
              key={alt.name}
              label={abbreviateDim(alt.name, 18)}
              value={scoresByAlt?.[alt.name] ?? 0}
              max={maxScore}
              color={alt.color}
              suffix="score"
              title={alt.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';

function formatNum(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(2);
  return n.toFixed(4);
}

export function SimulacionPreviewMatrix({
  alternativas,
  dimensiones,
  matriz,
  direcciones,
  destacadas,
  atenuadas,
  animate,
}) {
  if (!matriz?.length || !dimensiones?.length) return null;

  const destacadasSet = new Set(destacadas || []);
  const atenuadasSet = new Set(atenuadas || []);

  return (
    <div
      className={`overflow-x-auto mt-2 rounded-md border border-gray-200 dark:border-gray-700/60 ${
        animate ? 'pipeline-content-reveal' : ''
      }`}
    >
      <table className="min-w-full text-[11px]">
        <thead className="bg-gray-50 dark:bg-navy-900/60">
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-500 sticky left-0 bg-gray-50 dark:bg-navy-900/60">
              Alt.
            </th>
            {dimensiones.map((dim, j) => (
              <th key={dim} className="px-2 py-1.5 text-left font-semibold text-gray-500 whitespace-nowrap">
                <span className="block truncate max-w-[8rem]" title={dim}>
                  {dim}
                </span>
                {direcciones?.[j] && (
                  <span className="text-[9px] font-normal text-gray-400">
                    {direcciones[j] === 'min' ? 'MIN' : 'MAX'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {alternativas.map((alt, i) => {
            const row = matriz[i] || [];
            const atenuada = atenuadasSet.has(alt);
            const destacada = destacadasSet.has(alt);
            return (
              <tr
                key={alt}
                className={`border-t border-gray-100 dark:border-gray-800/80 ${
                  atenuada
                    ? 'opacity-45 line-through'
                    : destacada
                      ? 'bg-emerald-500/10'
                      : ''
                }`}
              >
                <td
                  className={`px-2 py-1 font-medium sticky left-0 ${
                    atenuada
                      ? 'bg-white dark:bg-navy-900 text-gray-400'
                      : destacada
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                        : 'bg-white dark:bg-navy-900 text-gray-800 dark:text-gray-100'
                  }`}
                >
                  {alt}
                </td>
                {dimensiones.map((dim, j) => (
                  <td key={`${alt}-${dim}`} className="px-2 py-1 tabular-nums text-gray-700 dark:text-gray-300">
                    {formatNum(row[j])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SimulacionPreviewPesos({ dimensiones, pesosPorcentaje, pesos, animate }) {
  const items = dimensiones.map((dim, j) => ({
    dim,
    pct: pesosPorcentaje?.[dim] ?? (pesos?.[j] != null ? pesos[j] * 100 : null),
  }));

  return (
    <div className={`mt-2 space-y-1 ${animate ? 'pipeline-content-reveal' : ''}`}>
      {items.map(({ dim, pct }) => (
        <div key={dim} className="flex items-center gap-2 text-[11px]">
          <span className="truncate flex-1 text-gray-600 dark:text-gray-400">{dim}</span>
          <div className="w-24 h-1.5 rounded-full bg-gray-100 dark:bg-navy-800 overflow-hidden">
            <div
              className="h-full bg-navy-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }}
            />
          </div>
          <span className="w-12 text-right tabular-nums font-medium text-gray-800 dark:text-gray-100">
            {pct != null ? `${Number(pct).toFixed(2)} %` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SimulacionPreviewRanking({ filas, animate }) {
  if (!filas?.length) return null;
  return (
    <div
      className={`overflow-x-auto mt-2 rounded-md border border-gray-200 dark:border-gray-700/60 ${
        animate ? 'pipeline-content-reveal' : ''
      }`}
    >
      <table className="min-w-full text-[11px]">
        <thead className="bg-gray-50 dark:bg-navy-900/60">
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-500">#</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Alternativa</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-500">Puntuación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.alternativa} className="border-t border-gray-100 dark:border-gray-800/80">
              <td className="px-2 py-1 font-bold text-navy-600">{f.ranking || '—'}</td>
              <td className="px-2 py-1">{f.alternativa}</td>
              <td className="px-2 py-1 text-right tabular-nums">{formatNum(f.puntuacion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

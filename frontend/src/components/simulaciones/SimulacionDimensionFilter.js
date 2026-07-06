import React from 'react';

const RAMA_BADGE = {
  omoe: 'OMOE',
  omoc: 'OMOC',
  omor: 'OMOR',
};

export const MIN_CHART_DIMENSIONS = 1;
/** Sin tope práctico: el diagrama de araña admite muchas dimensiones. */
export const MAX_CHART_DIMENSIONS = 32;

export function minChartDimensionsForProject() {
  return MIN_CHART_DIMENSIONS;
}

export function defaultSelectedDimIds(dimensiones) {
  if (!dimensiones.length) return [];
  return dimensiones.map((d) => d.id);
}

function SimulacionDimensionFilter({ dimensiones, selectedIds, onChange }) {
  if (!dimensiones.length) return null;

  const minDims = minChartDimensionsForProject();
  const selectedSet = new Set(selectedIds);
  const atMin = selectedIds.length <= minDims;
  const atMax = selectedIds.length >= MAX_CHART_DIMENSIONS;
  const allSelected = dimensiones.length > 0 && dimensiones.every((d) => selectedSet.has(d.id));

  const toggle = (id) => {
    if (selectedSet.has(id)) {
      if (atMin) return;
      onChange(selectedIds.filter((x) => x !== id));
    } else if (atMax) {
      return;
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectMax = () => onChange(defaultSelectedDimIds(dimensiones));

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50/80 dark:bg-navy-900/40 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          Dimensiones para ejes del gráfico
        </p>
        <button
          type="button"
          onClick={selectMax}
          disabled={allSelected}
          className="text-[11px] text-navy-600 dark:text-navy-400 hover:underline disabled:opacity-40"
        >
          Todas
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {dimensiones.map((dim) => {
          const active = selectedSet.has(dim.id);
          const disabled = !active && atMax;
          const rama = RAMA_BADGE[dim.rama] || dim.rama?.toUpperCase();
          return (
            <button
              key={dim.id}
              type="button"
              onClick={() => toggle(dim.id)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? 'bg-navy-600 text-white border-navy-600 dark:bg-navy-500 dark:border-navy-500'
                  : 'bg-white dark:bg-navy-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-navy-400'
              }`}
              aria-pressed={active}
            >
              <span className="truncate max-w-[12rem]">{dim.nombre}</span>
              {rama && (
                <span
                  className={`text-[10px] px-1 py-0.5 rounded ${
                    active
                      ? 'bg-white/20'
                      : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {rama}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        {dimensiones.length === 1 ? (
          <>Una dimensión: gráficos de barras y líneas.</>
        ) : (
          <>
            <strong>1 dimensión</strong> → barras y líneas · <strong>2 dimensiones</strong> → espacio
            de decisión 2D, comparación A vs B y araña · <strong>3+ dimensiones</strong> → espacio 3D
            y araña (sin gráficos 2D).
          </>
        )}
      </p>
    </div>
  );
}

export default SimulacionDimensionFilter;

import React from 'react';

function EscenarioGlobalBar({
  escenariosList,
  escenarioId,
  onEscenarioChange,
  dimensionLabel = null,
  inline = false,
}) {
  if (!escenariosList?.length) return null;

  const selectClass =
    'text-xs font-medium min-w-[12rem] max-w-[20rem] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-800 text-navy-700 dark:text-navy-200 input-focus truncate';

  const inner = (
    <>
      <label className="inline-flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 shrink-0">
          Escenario
        </span>
        <select
          value={escenarioId ?? ''}
          onChange={(e) => onEscenarioChange?.(Number(e.target.value))}
          className={selectClass}
          title={escenariosList.find((e) => e.id === escenarioId)?.nombre}
        >
          {escenariosList.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>

      {dimensionLabel && (
        <span
          className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[10rem] shrink-0 hidden sm:inline"
          title={dimensionLabel}
        >
          {dimensionLabel}
        </span>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
        {inner}
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-gray-200 dark:border-navy-700/60 bg-white/95 dark:bg-navy-900/95 backdrop-blur-sm px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">{inner}</div>
    </div>
  );
}

export default EscenarioGlobalBar;

import React, { useEffect, useRef } from 'react';

function SimulacionNombreField({ value, onChange, disabled, error, autoFocus, hideStepBadge }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  return (
    <div className={`flex items-start gap-2 ${hideStepBadge ? '' : ''}`}>
      {!hideStepBadge && (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-navy-800 text-xs font-bold text-gray-700 dark:text-gray-200 mt-0.5"
          aria-hidden
        >
          1
        </span>
      )}
      <div className={`flex-1 min-w-0 ${hideStepBadge ? '' : 'max-w-md'}`}>
        <label
          htmlFor="sim-nombre-calculo-input"
          className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1"
        >
          Nombre del cálculo *
        </label>
        <input
          ref={inputRef}
          id="sim-nombre-calculo-input"
          type="text"
          value={value || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full text-sm px-3 py-2 rounded-lg border transition-colors bg-white dark:bg-navy-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500/30 disabled:opacity-50 ${
            error
              ? 'border-amber-500 dark:border-amber-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Ej. Comparación con Pareto y TOPSIS"
          maxLength={200}
          aria-required="true"
          aria-invalid={Boolean(error)}
        />
        {error ? (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{error}</p>
        ) : (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            Aparecerá en el historial junto con la fecha de ejecución.
          </p>
        )}
      </div>
    </div>
  );
}

export default SimulacionNombreField;

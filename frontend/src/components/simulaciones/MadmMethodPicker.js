import React from 'react';
import PercentInput from '../PercentInput';

/**
 * Selección múltiple de métodos MADM + parámetros (v, λ, τ) cuando aplica.
 */
function MadmMethodPicker({
  methods = [],
  selected = [],
  primary,
  madmParams = {},
  onChangeSelected,
  onChangePrimary,
  onChangeParams,
  disabled = false,
  layout = 'grid', // grid | stack
}) {
  const selectedSet = new Set(selected);

  const toggle = (value) => {
    const adding = !selectedSet.has(value);
    const next = adding
      ? [...selected, value]
      : selected.filter((v) => v !== value);
    if (!next.length) return; // al menos uno
    onChangeSelected(next);
    if (!next.includes(primary)) {
      onChangePrimary(next[0]);
    }
    // Sembrar parámetros por defecto al activar un método que los requiere.
    if (adding) {
      const meta = methods.find((m) => m.value === value);
      if (Array.isArray(meta?.params) && meta.params.length) {
        const existing = madmParams[value] || {};
        const seeded = { ...existing };
        let changed = false;
        meta.params.forEach((p) => {
          if (seeded[p.key] == null || seeded[p.key] === '') {
            seeded[p.key] = p.default;
            changed = true;
          }
        });
        if (changed) {
          onChangeParams({ ...madmParams, [value]: seeded });
        }
      }
    }
  };

  const setParam = (method, key, value) => {
    onChangeParams({
      ...madmParams,
      [method]: {
        ...(madmParams[method] || {}),
        [key]: value,
      },
    });
  };

  const wrapperClass =
    layout === 'stack'
      ? 'space-y-2'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-2';

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Puede seleccionar varios métodos. El ranking principal del historial usa el método
        marcado como primario; el resto se guarda para comparación.
      </p>
      <div className={wrapperClass}>
        {methods.map((m) => {
          const checked = selectedSet.has(m.value);
          const isPrimary = primary === m.value;
          return (
            <div
              key={m.value}
              className={`rounded-lg border p-3 text-sm transition-colors ${
                checked
                  ? 'border-navy-500 bg-navy-500/5'
                  : 'border-gray-200 dark:border-gray-700/60'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(m.value)}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-gray-800 dark:text-gray-100">{m.label}</span>
                  {checked && (
                    <button
                      type="button"
                      disabled={disabled || isPrimary}
                      onClick={(e) => {
                        e.preventDefault();
                        onChangePrimary(m.value);
                      }}
                      className={`ml-2 text-[10px] uppercase tracking-wide font-semibold ${
                        isPrimary
                          ? 'text-navy-600 dark:text-navy-300'
                          : 'text-gray-400 hover:text-navy-500'
                      }`}
                    >
                      {isPrimary ? 'primario' : 'hacer primario'}
                    </button>
                  )}
                </span>
              </label>

              {checked && Array.isArray(m.params) && m.params.length > 0 && (
                <div className="mt-2 ml-7 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-2">
                  {m.params.map((p) => {
                    const cur = madmParams?.[m.value]?.[p.key];
                    const display = cur == null || cur === '' ? p.default : cur;
                    return (
                      <label key={p.key} className="block text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{p.label}</span>
                        {p.help && (
                          <span className="block text-[10px] text-gray-400 mt-0.5 mb-1">{p.help}</span>
                        )}
                        <PercentInput
                          disabled={disabled}
                          value={display}
                          min={p.min}
                          max={p.max}
                          onChange={(next) => {
                            const n = next === '' || next == null ? p.default : Number(next);
                            setParam(m.value, p.key, Number.isFinite(n) ? n : p.default);
                          }}
                          className="mt-0.5 w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-navy-950 px-2 py-1 text-sm tabular-nums"
                          aria-label={p.label}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MadmMethodPicker;

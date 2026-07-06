import React, { useState } from 'react';
import {
  getParamSpecsForFamilia,
  familiaRequiresParams,
  formatParamValue,
} from './mopFuncionParams';

function OptionPoolEditor({ spec, value, onChange, disabled, inputClass }) {
  const options = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState('');

  const addOption = () => {
    const trimmed = draft.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onChange([...options, trimmed]);
    setDraft('');
  };

  const removeOption = (opt) => {
    onChange(options.filter((o) => o !== opt));
  };

  if (disabled) {
    return (
      <p className={`${inputClass} opacity-60 text-sm`}>{formatParamValue(spec, value)}</p>
    );
  }

  return (
    <div className="space-y-2">
      {spec.hint && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{spec.hint}</p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder="Nueva opción…"
          className={`${inputClass} flex-1`}
        />
        <button type="button" onClick={addOption} className="btn-sm border-gray-200 dark:border-gray-700/60">
          Agregar
        </button>
      </div>
      {options.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <li
              key={opt}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-navy-800/10 dark:bg-navy-500/20 text-navy-900 dark:text-navy-100"
            >
              {opt}
              <button
                type="button"
                onClick={() => removeOption(opt)}
                className="text-gray-500 hover:text-red-500"
                aria-label={`Quitar ${opt}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Agregue al menos una opción para habilitar la tabla siguiente.
        </p>
      )}
    </div>
  );
}

function PairedListEditor({ spec, value, options, onChange, disabled, inputClass }) {
  const leftKey = spec.leftKey || 'estado';
  const rightKey = spec.rightKey || 'utilidad';
  const rows = Array.isArray(value) ? value : [];
  const hasOptions = options && options.length > 0;

  const updateRow = (index, patch) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, { [leftKey]: '', [rightKey]: '' }]);
  };

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  if (disabled) {
    return (
      <p className={`${inputClass} opacity-60 text-sm`}>{formatParamValue(spec, value)}</p>
    );
  }

  return (
    <div className="space-y-2">
      {!hasOptions && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Defina las opciones del paso anterior para habilitar los selects.
        </p>
      )}
      {rows.map((row, index) => {
        const leftVal = row[leftKey] || '';
        const utilidadEnabled = hasOptions && Boolean(leftVal);
        return (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[8rem]">
              <label className="block text-xs text-gray-500 mb-0.5 capitalize">{leftKey}</label>
              <select
                value={leftVal}
                disabled={!hasOptions}
                onChange={(e) => updateRow(index, { [leftKey]: e.target.value, [rightKey]: '' })}
                className={inputClass}
              >
                <option value="">Seleccionar…</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[6rem]">
              <label className="block text-xs text-gray-500 mb-0.5">{rightKey}</label>
              <input
                type="number"
                step="any"
                value={row[rightKey] ?? ''}
                disabled={!utilidadEnabled}
                onChange={(e) => updateRow(index, { [rightKey]: e.target.value })}
                className={`${inputClass} ${!utilidadEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={utilidadEnabled ? '0.0' : '—'}
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(index)}
              className="btn-sm text-red-600 border-red-200/80 dark:border-red-500/40 mb-0.5"
            >
              Quitar
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addRow}
        disabled={!hasOptions}
        className="btn-sm border-gray-200 dark:border-gray-700/60 disabled:opacity-40"
      >
        + Agregar fila
      </button>
    </div>
  );
}

function MopFuncionParamFields({ familia, parametros, onChange, disabled, inputClass, compact = false }) {
  const specs = getParamSpecsForFamilia(familia);

  if (!familiaRequiresParams(familia)) {
    if (compact) return null;
    return (
      <div className="border-t border-gray-200 dark:border-gray-700/60 pt-4">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Constantes de la función
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Esta familia no define parámetros numéricos adicionales en el árbol.
        </p>
      </div>
    );
  }

  const handleFieldChange = (key, val) => {
    onChange({ ...parametros, [key]: val });
  };

  const labelClass = compact
    ? 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5'
    : 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div
      className={
        compact
          ? 'grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-200/80 dark:border-gray-700/50'
          : 'space-y-4 border-t border-gray-200 dark:border-gray-700/60 pt-4'
      }
    >
      {!compact && (
        <>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 col-span-full">
            Constantes de la función
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 col-span-full">
            Diligencie aquí los parámetros fijos de la ecuación. El valor ofertado (x) no va en este formulario.
          </p>
        </>
      )}
      {compact && (
        <p className="text-[10px] text-gray-400 col-span-full -mt-0.5 mb-0.5">Constantes (L, U, k…)</p>
      )}
      {specs.map((spec) => {
        const val = parametros?.[spec.key];

        if (spec.type === 'option_pool') {
          return (
            <div key={spec.key} className={compact ? 'col-span-2' : ''}>
              <label className={labelClass}>
                {spec.label}
                {spec.required && !disabled ? ' *' : ''}
              </label>
              <OptionPoolEditor
                spec={spec}
                value={val}
                onChange={(v) => handleFieldChange(spec.key, v)}
                disabled={disabled}
                inputClass={inputClass}
              />
            </div>
          );
        }

        if (spec.type === 'paired_list') {
          const options = parametros?.[spec.optionsFrom] || [];
          return (
            <div key={spec.key} className="col-span-full">
              <label className={labelClass}>
                {spec.label}
                {spec.required && !disabled ? ' *' : ''}
              </label>
              <PairedListEditor
                spec={spec}
                value={val}
                options={options}
                onChange={(v) => handleFieldChange(spec.key, v)}
                disabled={disabled}
                inputClass={inputClass}
              />
            </div>
          );
        }

        if (disabled) {
          return (
            <div key={spec.key}>
              <label className={labelClass}>{spec.label}</label>
              <p className={`${inputClass} opacity-60 text-sm py-1`}>{formatParamValue(spec, val)}</p>
            </div>
          );
        }

        const Tag = spec.type === 'textarea' ? 'textarea' : 'input';
        return (
          <div key={spec.key} className={spec.type === 'textarea' ? 'col-span-full' : ''}>
            <label className={labelClass}>
              {spec.label}
              {spec.required ? ' *' : ''}
            </label>
            <Tag
              type={spec.type === 'textarea' ? undefined : spec.type === 'number' ? 'number' : 'text'}
              step={spec.type === 'number' ? 'any' : undefined}
              rows={spec.type === 'textarea' ? 3 : undefined}
              value={val ?? ''}
              onChange={(e) => handleFieldChange(spec.key, e.target.value)}
              required={spec.required}
              className={`${inputClass} ${compact ? 'py-1.5 text-sm' : ''}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default MopFuncionParamFields;

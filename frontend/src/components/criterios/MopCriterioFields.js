import React from 'react';
import {
  TIPOS_CRITERIO,
  getFamiliasForTipo,
  getTipoLabel,
  getFamiliaLabel,
  normalizeMopCriterioFields,
} from './mopCriterioOptions';
import { defaultParametrosForFamilia } from './mopFuncionParams';
import MopFuncionParamFields from './MopFuncionParamFields';

function MopCriterioFields({
  tipoCriterio,
  familiaFunciones,
  parametrosFuncion,
  onChange,
  disabled,
  inputClass,
  compact = false,
}) {
  const familias = getFamiliasForTipo(tipoCriterio);
  const fieldGap = compact ? 'gap-2' : 'space-y-4';
  const labelClass = compact
    ? 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5'
    : 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  const handleTipoChange = (e) => {
    const nextTipo = e.target.value;
    const normalized = normalizeMopCriterioFields(nextTipo, familiaFunciones);
    onChange({
      ...normalized,
      parametros_funcion: defaultParametrosForFamilia(normalized.familia_funciones),
    });
  };

  const handleFamiliaChange = (e) => {
    const nextFamilia = e.target.value;
    onChange({
      tipo_criterio: tipoCriterio,
      familia_funciones: nextFamilia,
      parametros_funcion: defaultParametrosForFamilia(nextFamilia),
    });
  };

  const handleParametrosChange = (parametros) => {
    onChange({
      tipo_criterio: tipoCriterio,
      familia_funciones: familiaFunciones,
      parametros_funcion: parametros,
    });
  };

  if (disabled) {
    return (
      <div className={compact ? `grid grid-cols-2 ${fieldGap}` : fieldGap}>
        <div>
          <label className={labelClass}>Tipo de criterio</label>
          <p className={`${inputClass} opacity-60 text-sm py-1.5`}>{getTipoLabel(tipoCriterio)}</p>
        </div>
        <div>
          <label className={labelClass}>Familia de función</label>
          <p className={`${inputClass} opacity-60 text-sm py-1.5`}>
            {getFamiliaLabel(tipoCriterio, familiaFunciones)}
          </p>
        </div>
        <div className={compact ? 'col-span-2' : ''}>
          <MopFuncionParamFields
            familia={familiaFunciones}
            parametros={parametrosFuncion || {}}
            onChange={() => {}}
            disabled
            inputClass={inputClass}
            compact={compact}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? `grid grid-cols-2 ${fieldGap}` : fieldGap}>
      <div>
        <label className={labelClass}>Tipo de criterio *</label>
        <select
          name="tipo_criterio"
          value={tipoCriterio}
          onChange={handleTipoChange}
          required
          className={`${inputClass} ${compact ? 'py-1.5 text-sm' : ''}`}
        >
          {TIPOS_CRITERIO.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Familia de función *</label>
        <select
          name="familia_funciones"
          value={familiaFunciones}
          onChange={handleFamiliaChange}
          required
          disabled={!familias.length}
          className={`${inputClass} ${compact ? 'py-1.5 text-sm' : ''}`}
        >
          {familias.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={compact ? 'col-span-2' : ''}>
        <MopFuncionParamFields
          familia={familiaFunciones}
          parametros={parametrosFuncion || {}}
          onChange={handleParametrosChange}
          disabled={false}
          inputClass={inputClass}
          compact={compact}
        />
      </div>
    </div>
  );
}

export default MopCriterioFields;

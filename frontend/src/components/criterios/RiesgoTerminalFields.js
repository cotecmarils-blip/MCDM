import React, { useMemo } from 'react';

const TIPOS_CONSECUENCIA = [
  { value: 'desempeno', label: 'Desempeño' },
  { value: 'cronograma', label: 'Cronograma' },
  { value: 'costo', label: 'Costo' },
];

function impactoDescripcion(row, tipo) {
  if (!row) return '';
  if (tipo === 'cronograma') return row.descripcion_cronograma || row.descripcion || '';
  if (tipo === 'costo') return row.descripcion_costo || row.descripcion || '';
  return row.descripcion_desempeno || row.descripcion || '';
}

function RiesgoTerminalFields({
  probabilidades = [],
  impactos = [],
  nivelProbabilidadId,
  nivelImpactoId,
  tipoConsecuencia = 'desempeno',
  onChange,
  disabled = false,
  inputClass = '',
  onOpenTablas,
}) {
  const impactoOptions = useMemo(
    () =>
      impactos.map((row) => ({
        id: row.id,
        valor: row.valor,
        label: impactoDescripcion(row, tipoConsecuencia),
      })),
    [impactos, tipoConsecuencia],
  );

  const probSeleccionada = probabilidades.find((p) => p.id === nivelProbabilidadId);
  const impSeleccionada = impactoOptions.find((i) => i.id === nivelImpactoId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Riesgo (probabilidad × impacto)
        </p>
        {onOpenTablas && (
          <button
            type="button"
            onClick={onOpenTablas}
            disabled={disabled}
            title="Gestionar tablas de probabilidad e impacto"
            className="p-1 rounded-md text-gray-500 hover:text-teal-600 hover:bg-teal-500/10 dark:hover:text-teal-400 disabled:opacity-50"
            aria-label="Gestionar tablas de riesgo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 01.804.98v1.361a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.294 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.294-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.97 6.97 0 01-.587-1.416L1.804 9.32a1 1 0 01-.804-.98V6.977a1 1 0 01.804-.98l1.473-.294c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962a1 1 0 011.262-.125l1.25.834c.445-.245.919-.443 1.416-.587l.294-1.473zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block text-xs text-gray-600 dark:text-gray-300">
          <span className="block mb-0.5 text-gray-500">Probabilidad</span>
          <select
            value={nivelProbabilidadId ?? ''}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                nivel_probabilidad_id: e.target.value ? Number(e.target.value) : null,
              })
            }
            className={inputClass}
          >
            <option value="">— Seleccionar —</option>
            {probabilidades.map((p) => (
              <option key={p.id} value={p.id}>
                {p.descripcion} ({p.valor})
              </option>
            ))}
          </select>
          {probSeleccionada && (
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Nivel: {probSeleccionada.valor}
            </span>
          )}
        </label>

        <label className="block text-xs text-gray-600 dark:text-gray-300">
          <span className="block mb-0.5 text-gray-500">Tipo de consecuencia</span>
          <select
            value={tipoConsecuencia}
            disabled={disabled}
            onChange={(e) => onChange({ tipo_consecuencia: e.target.value })}
            className={inputClass}
          >
            {TIPOS_CONSECUENCIA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-gray-600 dark:text-gray-300 sm:col-span-2">
          <span className="block mb-0.5 text-gray-500">Nivel de impacto / consecuencia</span>
          <select
            value={nivelImpactoId ?? ''}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                nivel_impacto_id: e.target.value ? Number(e.target.value) : null,
              })
            }
            className={inputClass}
          >
            <option value="">— Seleccionar —</option>
            {impactoOptions.map((row) => (
              <option key={row.id} value={row.id} title={row.label}>
                {row.label.length > 80 ? `${row.label.slice(0, 77)}…` : row.label} ({row.valor})
              </option>
            ))}
          </select>
          {impSeleccionada && (
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Nivel: {impSeleccionada.valor}
            </span>
          )}
        </label>
      </div>
    </div>
  );
}

export default RiesgoTerminalFields;

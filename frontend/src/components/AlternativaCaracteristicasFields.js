import React from 'react';
import {
  CARACTERISTICAS_GRID_CLASS,
  caracteristicaCardClass,
  formatPlantillaLabel,
} from '../utils/caracteristicas';
import { getAlternativaInputClass } from './alternativaFormStyles';

function AlternativaCaracteristicasFields({
  valores,
  plantillasEmpty,
  isDark,
  onToggleActiva,
  onUpdateDato,
}) {
  const inputClass = getAlternativaInputClass(isDark);
  const activas = valores.filter((v) => v.activa);

  if (plantillasEmpty) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        No hay características en el catálogo. Usa «Configurar catálogo» para agregar Eslora, Manga, etc.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Marca las que aplican e ingresa el dato. El nombre y la unidad vienen del catálogo.
      </p>
      <div className={CARACTERISTICAS_GRID_CLASS}>
        {valores.map((row) => (
          <div
            key={row.plantillaId}
            className={caracteristicaCardClass(row.activa, isDark)}
          >
            <label className="flex flex-col justify-between h-full min-h-[4.75rem] cursor-pointer gap-2">
              <span className="flex items-start justify-between gap-2 w-full">
                <input
                  type="checkbox"
                  checked={row.activa}
                  onChange={() => onToggleActiva(row.plantillaId)}
                  className="mt-0.5 shrink-0 rounded border-gray-300 text-navy-800 focus:ring-navy-500"
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-snug text-right flex-1">
                  {formatPlantillaLabel(row.plantilla)}
                </span>
              </span>
              {row.activa ? (
                <input
                  type="text"
                  value={row.dato}
                  onChange={(e) => onUpdateDato(row.plantillaId, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`${inputClass} text-sm mt-auto`}
                  placeholder="Dato"
                  aria-label={`Dato ${formatPlantillaLabel(row.plantilla)}`}
                />
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic mt-auto">
                  No aplica
                </span>
              )}
            </label>
          </div>
        ))}
      </div>
      {activas.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Ninguna característica seleccionada para esta alternativa.
        </p>
      )}
    </div>
  );
}

export default AlternativaCaracteristicasFields;

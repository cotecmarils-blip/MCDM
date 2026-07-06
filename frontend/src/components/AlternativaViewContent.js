import React from 'react';
import { COSTO_ROM_LABEL } from '../constants/costoUnidades';
import { formatCosto } from '../utils/media';
import {
  CARACTERISTICAS_GRID_CLASS,
  caracteristicaCardClass,
  formatPlantillaLabel,
} from '../utils/caracteristicas';
import ImageGallery from './ImageGallery';
import DocumentosList from './DocumentosList';

function ViewField({ label, value, isDark }) {
  return (
    <div>
      <dt className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </dt>
      <dd className={`mt-1 text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        {value || <span className="italic text-gray-400">—</span>}
      </dd>
    </div>
  );
}

function AlternativaViewContent({ alternativa, isDark, onDocumentsChange, onOpenConfigPlantillas }) {
  const costo = formatCosto(alternativa.costo, alternativa.costo_unidad);
  const capacidades = alternativa.capacidades || [];
  const caracteristicas = alternativa.caracteristicas || [];

  return (
    <div className="space-y-6">
      <ImageGallery
        currentImage={alternativa.foto}
        readOnly
        isDark={isDark}
      />

      <dl className="grid grid-cols-1 gap-4">
        <ViewField label="Nombre" value={alternativa.nombre} isDark={isDark} />
        <ViewField label="Descripción" value={alternativa.descripcion} isDark={isDark} />
        <ViewField label="Referencia" value={alternativa.referencia} isDark={isDark} />
        <ViewField label={COSTO_ROM_LABEL} value={costo} isDark={isDark} />
      </dl>

      <div className="border-t border-gray-200 dark:border-gray-700/60 pt-6">
        <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Capacidades</h4>
        {capacidades.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">Sin capacidades configuradas.</p>
        ) : (
          <div className="space-y-2">
            {capacidades.map((cap) => (
              <div
                key={cap.id}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-navy-900/40"
              >
                <p className="font-medium text-gray-800 dark:text-gray-100">{cap.nombre}</p>
                {cap.descripcion && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{cap.descripcion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700/60 pt-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h4 className="font-bold text-gray-800 dark:text-gray-100">Características</h4>
          {onOpenConfigPlantillas && (
            <button
              type="button"
              onClick={onOpenConfigPlantillas}
              className="btn-sm border border-gray-200 dark:border-gray-700/60 text-navy-800 dark:text-navy-300 hover:bg-gray-50 dark:hover:bg-navy-800/40"
            >
              Configurar catálogo
            </button>
          )}
        </div>
        {caracteristicas.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">Sin características configuradas.</p>
        ) : (
          <div className={CARACTERISTICAS_GRID_CLASS}>
            {caracteristicas.map((car) => (
              <div
                key={car.id}
                className={caracteristicaCardClass(true, isDark)}
              >
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 leading-snug">
                  {formatPlantillaLabel(car)}
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {car.dato || '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700/60 pt-6">
        <DocumentosList
          alternativaId={alternativa.id}
          legacyAnexo={alternativa.anexo}
          onChange={onDocumentsChange}
        />
      </div>
    </div>
  );
}

export default AlternativaViewContent;

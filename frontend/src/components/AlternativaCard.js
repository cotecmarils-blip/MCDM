import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { COSTO_ROM_LABEL } from '../constants/costoUnidades';
import { resolveMediaUrl, formatCosto } from '../utils/media';
import DocumentosList from './DocumentosList';
import AlternativaEditModal from './AlternativaEditModal';

function AlternativaCard({ alternativa, isSelected, onSelect, onDelete, onRefresh }) {
  const { isDark } = useTheme();
  const [editMode, setEditMode] = useState(false);
  const fotoUrl = resolveMediaUrl(alternativa.foto);
  const anexoUrl = resolveMediaUrl(alternativa.anexo);
  const costoLabel = formatCosto(alternativa.costo, alternativa.costo_unidad);

  return (
    <>
      <div
        className={`border rounded-lg p-4 cursor-pointer transition-all ${
          isSelected
            ? isDark
              ? 'bg-navy-900/20 border-navy-500'
              : 'bg-navy-50 border-navy-500'
            : isDark
            ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
        onClick={onSelect}
      >
        <div className="flex gap-4">
          {fotoUrl && (
            <img
              src={fotoUrl}
              alt={alternativa.nombre}
              className="w-20 h-20 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-gray-600"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2 gap-2">
              <h3 className="text-xl font-bold truncate">{alternativa.nombre}</h3>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditMode(true);
                  }}
                  className="p-2 text-navy-800 hover:bg-navy-800/10 rounded transition-colors"
                  title="Editar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  title="Eliminar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {costoLabel && (
              <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                {COSTO_ROM_LABEL}: {costoLabel}
              </p>
            )}

            {alternativa.descripcion && (
              <p className={`mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{alternativa.descripcion}</p>
            )}

            {alternativa.referencia && (
              <div className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <p className="font-semibold">Referencia:</p>
                <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>{alternativa.referencia}</p>
              </div>
            )}

            {anexoUrl && (
              <a
                href={anexoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-sm text-navy-800 hover:text-navy-600 font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h6a1 1 0 00-1-1H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8a1 1 0 00-1-1h-1.5a1 1 0 100 2H16v10H4V4z" />
                </svg>
                Ver anexo de documentos
              </a>
            )}
          </div>
        </div>

        {isSelected && (
          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <DocumentosList alternativaId={alternativa.id} onRefresh={onRefresh} />
          </div>
        )}
      </div>

      {editMode && (
        <AlternativaEditModal
          alternativa={alternativa}
          onClose={() => setEditMode(false)}
          onSuccess={() => {
            setEditMode(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

export default AlternativaCard;

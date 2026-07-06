import React, { useState } from 'react';
import {
  buildExportFilename,
  buildMatrizNormalizadaExport,
  buildRankingExport,
  downloadJson,
} from './simulacionGraficosUtils';

function SimulacionExportButtons({ resultado }) {
  const [exporting, setExporting] = useState(null);
  const tieneMatriz = Boolean(resultado?.normalizacion?.normalized_matrix?.length);

  const handleExport = async (kind) => {
    try {
      setExporting(kind);
      if (kind === 'resultado') {
        const { debug_logs: _dbg, ...rest } = resultado || {};
        downloadJson(rest, buildExportFilename(resultado, 'resultado'));
      } else if (kind === 'ranking') {
        downloadJson(buildRankingExport(resultado), buildExportFilename(resultado, 'ranking'));
      } else if (kind === 'matriz') {
        const data = buildMatrizNormalizadaExport(resultado);
        if (data) {
          downloadJson(data, buildExportFilename(resultado, 'matriz_normalizada'));
        }
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      <button
        type="button"
        disabled={exporting === 'resultado'}
        onClick={() => handleExport('resultado')}
        className="btn-sm btn-primary disabled:opacity-60"
      >
        {exporting === 'resultado' ? 'Exportando…' : 'Exportar resultado'}
      </button>
      <button
        type="button"
        disabled={exporting === 'ranking'}
        onClick={() => handleExport('ranking')}
        className="btn-sm bg-navy-600 hover:bg-navy-700 text-white disabled:opacity-60 border-transparent"
      >
        {exporting === 'ranking' ? 'Exportando…' : 'Exportar ranking'}
      </button>
      {tieneMatriz && (
        <button
          type="button"
          disabled={exporting === 'matriz'}
          onClick={() => handleExport('matriz')}
          className="btn-sm border border-gray-200 dark:border-gray-700/60 disabled:opacity-60"
        >
          {exporting === 'matriz' ? 'Exportando…' : 'Matriz normalizada'}
        </button>
      )}
    </div>
  );
}

export default SimulacionExportButtons;

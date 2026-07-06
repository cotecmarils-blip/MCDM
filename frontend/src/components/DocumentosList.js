import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../ThemeContext';
import { documentos } from '../api';
import { resolveMediaUrl, getFileNameFromUrl } from '../utils/media';
import DocumentoUploadModal from './DocumentoUploadModal';

function DocumentosList({
  alternativaId,
  legacyAnexo,
  readOnly = false,
  onChange,
}) {
  const { isDark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUpload, setOpenUpload] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const loadDocumentos = useCallback(async () => {
    if (!alternativaId) return;
    try {
      setLoading(true);
      const response = await documentos.getByAlternativa(alternativaId);
      setItems(response.data);
      onChangeRef.current?.(response.data);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    } finally {
      setLoading(false);
    }
  }, [alternativaId]);

  useEffect(() => {
    loadDocumentos();
  }, [loadDocumentos]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await documentos.delete(id);
      await loadDocumentos();
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('Error al eliminar el documento');
    }
  };

  const handleUploadSuccess = () => {
    setOpenUpload(false);
    loadDocumentos();
  };

  const legacyEntry = legacyAnexo
    ? {
        id: 'legacy-anexo',
        nombre: getFileNameFromUrl(legacyAnexo),
        archivo: legacyAnexo,
        isLegacy: true,
      }
    : null;

  const allEntries = legacyEntry ? [legacyEntry, ...items] : items;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div>
          <h4 className="font-bold text-gray-800 dark:text-gray-100">Documentos</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Puedes adjuntar varios archivos. Cada uno muestra su nombre.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setOpenUpload(true)}
            className="btn-sm bg-navy-800 text-white hover:bg-navy-700"
          >
            + Agregar documento
          </button>
        )}
      </div>

      {loading ? (
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cargando documentos...</p>
      ) : allEntries.length === 0 ? (
        <p className={`text-sm italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Sin documentos adjuntos.
          {!readOnly && ' Usa «Agregar documento» para subir el primero.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {allEntries.map((doc) => (
            <li
              key={doc.id}
              className={`flex items-center justify-between gap-2 p-2.5 rounded-lg ${
                isDark ? 'bg-navy-900/50' : 'bg-gray-50'
              } border border-gray-200 dark:border-gray-700/60`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg
                  className="w-4 h-4 text-gray-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden
                >
                  <path d="M4 4a2 2 0 012-2h6a1 1 0 00-1-1H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8a1 1 0 00-1-1h-1.5a1 1 0 100 2H16v10H4V4z" />
                </svg>
                <a
                  href={resolveMediaUrl(doc.archivo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-navy-700 hover:text-navy-800 dark:text-navy-400 dark:hover:text-navy-300 font-medium truncate"
                  title={doc.nombre}
                >
                  {doc.nombre || getFileNameFromUrl(doc.archivo)}
                </a>
                {doc.isLegacy && (
                  <span className="text-xs text-gray-400 shrink-0">(anexo principal)</span>
                )}
              </div>
              {!readOnly && !doc.isLegacy && (
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="shrink-0 text-red-500 hover:text-red-600 p-1"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {openUpload && (
        <DocumentoUploadModal
          alternativaId={alternativaId}
          onClose={() => setOpenUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}

export default DocumentosList;

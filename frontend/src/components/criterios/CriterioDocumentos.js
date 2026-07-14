import React, { useState, useEffect, useCallback } from 'react';
import { documentosCriterio, MEDIA_BASE_URL } from '../../api';
import { getApiLevel } from './constants';

function resolveArchivoUrl(archivo) {
  if (!archivo) return '#';
  if (archivo.startsWith('http')) return archivo;
  return `${MEDIA_BASE_URL}${archivo}`;
}

function CriterioDocumentos({ level, entityId, onRefresh, readOnly = false }) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const loadDocumentos = useCallback(async () => {
    try {
      let response;
      const apiLevel = getApiLevel(level);
      if (apiLevel === 'dimension') {
        response = await documentosCriterio.getByDimension(entityId);
      } else if (apiLevel === 'atributo') {
        response = await documentosCriterio.getByAtributo(entityId);
      } else {
        response = await documentosCriterio.getBySubatributo(entityId);
      }
      setItems(response.data);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    }
  }, [entityId, level]);

  useEffect(() => {
    loadDocumentos();
  }, [loadDocumentos]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      setUploading(true);
      const payload = {
        nombre: nombre || file.name,
        archivo: file,
      };
      const apiLevel = getApiLevel(level);
      if (apiLevel === 'dimension') payload.dimension = entityId;
      else if (apiLevel === 'atributo') payload.atributo = entityId;
      else payload.subatributo = entityId;

      await documentosCriterio.create(payload);
      setNombre('');
      setSelectedFile(null);
      e.target.value = '';
      await loadDocumentos();
      onRefresh?.();
    } catch (err) {
      console.error('Error subiendo documento:', err);
      alert('Error al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar documento?')) return;
    try {
      await documentosCriterio.delete(id);
      await loadDocumentos();
      onRefresh?.();
    } catch (err) {
      console.error('Error eliminando documento:', err);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/60">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Documentos</h5>
        {!readOnly && (
          <label className={`btn-sm cursor-pointer bg-navy-800 text-white hover:bg-navy-700`}>
            {uploading ? 'Subiendo...' : '+ Subir'}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>
      {!readOnly && (
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={`Nombre personalizado (si no llenas, usará: ${selectedFile?.name || 'nombre del archivo'})`}
          className="w-full text-sm mb-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-900/40 text-gray-800 dark:text-gray-100"
        />
      )}
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Sin documentos</p>
      ) : (
        <ul className="space-y-1">
          {items.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-navy-900/50 text-sm"
            >
              <a
                href={resolveArchivoUrl(doc.archivo)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy-800 hover:text-navy-600 truncate"
              >
                {doc.nombre || doc.archivo.split('/').pop()}
              </a>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="shrink-0 text-red-500 hover:text-red-600"
                  title="Eliminar"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CriterioDocumentos;

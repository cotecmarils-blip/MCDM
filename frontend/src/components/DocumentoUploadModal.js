import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { documentos } from '../api';
import { MODAL_BACKDROP_CLASS } from '../utils/modalBackdrop';

function DocumentoUploadModal({ alternativaId, onClose, onSuccess }) {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    nombre: '',
    archivo: null,
  });
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        archivo: file,
        nombre: prev.nombre || file.name,
      }));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        archivo: file,
        nombre: prev.nombre || file.name,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.archivo) {
      alert('Selecciona un archivo');
      return;
    }
    try {
      setLoading(true);
      await documentos.create({
        nombre: formData.nombre,
        archivo: formData.archivo,
        alternativa: alternativaId,
      });
      onSuccess();
    } catch (err) {
      console.error('Error subiendo documento:', err);
      alert('Error al subir el documento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={MODAL_BACKDROP_CLASS}>
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Subir Documento</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Nombre
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className={`w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500/20 ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-navy-600'
                    : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400 focus:border-navy-600'
                }`}
                placeholder="Nombre del documento"
              />
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragActive
                  ? 'border-navy-600 bg-navy-500/10'
                  : isDark
                  ? 'border-slate-600 bg-slate-700/50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer block">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {formData.archivo ? formData.archivo.name : 'Arrastra un archivo o haz clic'}
                </p>
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                  isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-gray-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.archivo}
                className="px-6 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                    Subiendo...
                  </>
                ) : (
                  'Subir'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DocumentoUploadModal;

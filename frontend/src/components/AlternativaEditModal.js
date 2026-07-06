import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { alternativas } from '../api';
import { MODAL_BACKDROP_CLASS } from '../utils/modalBackdrop';
import { buildAlternativaFormData } from '../utils/media';
import AlternativaFormFields from './AlternativaFormFields';

function AlternativaEditModal({ alternativa, onClose, onSuccess }) {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    nombre: alternativa.nombre,
    apodo: alternativa.apodo || '',
    descripcion: alternativa.descripcion || '',
    referencia: alternativa.referencia || '',
    costo: alternativa.costo ?? '',
    foto: null,
    anexo: null,
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files[0] || null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = buildAlternativaFormData(formData);
      await alternativas.update(alternativa.id, payload);
      onSuccess();
    } catch (err) {
      console.error('Error actualizando alternativa:', err);
      alert('Error al actualizar la alternativa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={MODAL_BACKDROP_CLASS}>
      <div
        className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto`}
      >
        <div className="p-6">
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Editar Alternativa
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AlternativaFormFields
              formData={formData}
              onInputChange={handleInputChange}
              onFileChange={handleFileChange}
              isDark={isDark}
              existing={alternativa}
            />

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
                disabled={loading}
                className="px-6 py-2 bg-navy-600 hover:bg-navy-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AlternativaEditModal;

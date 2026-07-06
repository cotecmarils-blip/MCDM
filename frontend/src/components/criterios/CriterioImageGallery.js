import React, { useState, useRef } from 'react';
import { MEDIA_BASE_URL } from '../../api';

const DEFAULT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="18" fill="%239ca3af"%3ESin imagen%3C/text%3E%3C/svg%3E';

function resolveImageUrl(img) {
  if (!img) return DEFAULT_IMAGE;
  if (img.startsWith('http')) return img;
  return `${MEDIA_BASE_URL}${img}`;
}

function CriterioImageGallery({ image, onImageChange, readOnly = false }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageChange(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageChange(file);
    }
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar imagen?')) {
      onImageChange(null);
    }
  };

  const imageUrl = resolveImageUrl(image);
  const isDefault = imageUrl === DEFAULT_IMAGE;

  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Imagen</h4>
      
      <div className="flex gap-4 flex-col md:flex-row">
        {/* Vista previa */}
        <div className="w-full md:w-40 h-40 flex-shrink-0">
          <img
            src={imageUrl}
            alt="Previsualización"
            className={`w-full h-full object-cover rounded-lg border-2 ${
              isDefault
                ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          />
        </div>

        {/* Zona de drop */}
        {!readOnly && (
          <div className="flex-1 flex flex-col gap-2">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                dragActive
                  ? 'border-navy-500 bg-navy-50 dark:bg-navy-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {dragActive ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {image && !isDefault && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-sm text-red-600 border-red-200 dark:border-red-500/40 w-full"
              >
                🗑️ Eliminar imagen
              </button>
            )}
          </div>
        )}

        {/* Modo lectura */}
        {readOnly && image && !isDefault && (
          <div className="flex-1 flex flex-col justify-center text-sm text-gray-600 dark:text-gray-400">
            <p>Imagen cargada</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CriterioImageGallery;

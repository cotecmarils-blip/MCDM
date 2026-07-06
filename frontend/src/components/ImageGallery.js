import React, { useState, useRef } from 'react';
import { resolveMediaUrl } from '../utils/media';

const DEFAULT_IMAGE_SVG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="16" fill="%239ca3af"%3ESin imagen%3C/text%3E%3C/svg%3E';

function ImageGallery({
  currentImage,
  newImage,
  onImageChange,
  onImageRemove,
  isDark,
  readOnly = false,
  title = 'Imagen de la alternativa',
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const displayImage = newImage 
    ? URL.createObjectURL(newImage)
    : currentImage
    ? resolveMediaUrl(currentImage)
    : DEFAULT_IMAGE_SVG;

  const isDefault = displayImage === DEFAULT_IMAGE_SVG;

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
      onImageRemove();
    }
  };

  return (
    <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-navy-900/30">
      <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        {title}
      </h4>

      <div className={`flex gap-6 ${readOnly ? '' : 'flex-col md:flex-row'}`}>
        <div className={`${readOnly ? 'w-full max-w-md' : 'w-full md:w-48'} h-48 flex-shrink-0`}>
          <img
            src={displayImage}
            alt="Vista previa de la imagen"
            className={`w-full h-full object-cover rounded-lg border-2 transition-colors ${
              isDefault
                ? isDark
                  ? 'border-gray-600 bg-gray-800'
                  : 'border-gray-300 bg-gray-100'
                : isDark
                ? 'border-gray-700'
                : 'border-gray-200'
            }`}
          />
        </div>

        {!readOnly && (
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
              dragActive
                ? `border-navy-500 ${isDark ? 'bg-navy-900/40' : 'bg-navy-50'}`
                : isDark
                ? 'border-gray-600 hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {dragActive ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic'}
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              PNG, JPG, WebP (máx 5MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {(newImage || currentImage) && !isDefault && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className={`flex-1 btn-sm text-red-600 border-red-200 dark:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10`}
              >
                Eliminar imagen
              </button>
              {newImage && (
                <span className={`flex items-center px-3 py-2 text-xs rounded-lg ${isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'}`}>
                  Nueva imagen
                </span>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

export default ImageGallery;

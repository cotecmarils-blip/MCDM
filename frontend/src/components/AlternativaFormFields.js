import React from 'react';
import ImageGallery from './ImageGallery';
import { COSTO_ROM_LABEL, COSTO_UNIDAD_DEFAULT, COSTO_UNIDAD_OPTIONS } from '../constants/costoUnidades';
import { getAlternativaInputClass, getAlternativaLabelClass } from './alternativaFormStyles';

function AlternativaFormFields({ formData, onInputChange, onFileChange, isDark, existing }) {
  const inputClass = getAlternativaInputClass(isDark);
  const labelClass = getAlternativaLabelClass(isDark);

  return (
    <>
      <ImageGallery
        currentImage={existing?.foto}
        newImage={formData.foto}
        onImageChange={(file) => onFileChange({ target: { name: 'foto', files: [file] } })}
        onImageRemove={() => onFileChange({ target: { name: 'foto', files: [] } })}
        isDark={isDark}
      />

      <div>
        <label className={labelClass}>Nombre *</label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={onInputChange}
          required
          className={inputClass}
          placeholder="Nombre de la alternativa"
        />
      </div>

      <div>
        <label className={labelClass}>Nombre corto (gráficos)</label>
        <input
          type="text"
          name="apodo"
          value={formData.apodo ?? ''}
          onChange={onInputChange}
          maxLength={8}
          className={inputClass}
          placeholder="Opcional — máx. 8 caracteres"
        />
        <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Máximo 8 caracteres. Si lo dejas vacío, en los gráficos se muestra el nombre completo.
        </p>
      </div>

      <div>
        <label className={labelClass}>Descripción</label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={onInputChange}
          className={`${inputClass} resize-none`}
          rows="3"
          placeholder="Descripción de la alternativa"
        />
      </div>

      <div>
        <label className={labelClass}>Referencia</label>
        <textarea
          name="referencia"
          value={formData.referencia}
          onChange={onInputChange}
          className={`${inputClass} resize-none`}
          rows="2"
          placeholder="Referencia"
        />
      </div>

      <div>
        <label className={labelClass}>{COSTO_ROM_LABEL}</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            name="costo"
            value={formData.costo}
            onChange={onInputChange}
            min="0"
            step="0.01"
            className={`${inputClass} flex-1`}
            placeholder="0.00"
          />
          <select
            name="costo_unidad"
            value={formData.costo_unidad || COSTO_UNIDAD_DEFAULT}
            onChange={onInputChange}
            className={`${inputClass} sm:w-52`}
          >
            {COSTO_UNIDAD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export default AlternativaFormFields;

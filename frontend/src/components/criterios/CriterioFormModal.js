import React, { useState } from 'react';
import { dimensiones, atributos, subatributos } from '../../api';
import { MODAL_BACKDROP_CLASS } from '../../utils/modalBackdrop';
import { LEVEL_LABELS, CRITERIO_LEVELS } from './constants';
import MopCriterioFields from './MopCriterioFields';
import {
  defaultMopCriterioFields,
  normalizeMopCriterioFields,
} from './mopCriterioOptions';

const API_MAP = {
  dimension: dimensiones,
  atributo: atributos,
  subatributo: subatributos,
};

const PARENT_FIELD = {
  dimension: 'proyecto',
  atributo: 'dimension',
  subatributo: 'atributo',
};

function CriterioFormModal({
  level,
  parentId,
  item,
  siblings,
  onClose,
  onSuccess,
}) {
  const isEdit = Boolean(item);
  const api = API_MAP[level];

  const initialMop =
    level === CRITERIO_LEVELS.ATRIBUTO
      ? item?.tipo_criterio
        ? normalizeMopCriterioFields(
            item.tipo_criterio,
            item.familia_funciones,
            item.parametros_funcion
          )
        : defaultMopCriterioFields()
      : {};

  const [formData, setFormData] = useState({
    nombre: item?.nombre || '',
    referencia: item?.referencia || '',
    descripcion: item?.descripcion || '',
    ...initialMop,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      nombre: formData.nombre,
      referencia: formData.referencia,
      descripcion: formData.descripcion,
    };
    if (level === CRITERIO_LEVELS.ATRIBUTO) {
      payload.tipo_criterio = formData.tipo_criterio;
      payload.familia_funciones = formData.familia_funciones;
      payload.parametros_funcion = formData.parametros_funcion || {};
    }

    if (!isEdit) {
      payload[PARENT_FIELD[level]] = parentId;
    }

    try {
      setLoading(true);
      if (isEdit) {
        await api.update(item.id, payload);
      } else {
        await api.create(payload);
      }
      onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        Object.values(err.response?.data || {}).flat()?.[0] ||
        'Error al guardar';
      setError(typeof msg === 'string' ? msg : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-900/40 text-gray-800 dark:text-gray-100 input-focus';

  return (
    <div className={MODAL_BACKDROP_CLASS}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            {isEdit ? 'Editar' : 'Nueva'} {LEVEL_LABELS[level]}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Referencia
              </label>
              <textarea
                name="referencia"
                value={formData.referencia}
                onChange={handleChange}
                rows={2}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={3}
                className={inputClass}
              />
            </div>

            {level === CRITERIO_LEVELS.ATRIBUTO && (
              <MopCriterioFields
                tipoCriterio={formData.tipo_criterio}
                familiaFunciones={formData.familia_funciones}
                parametrosFuncion={formData.parametros_funcion}
                onChange={(fields) => setFormData((prev) => ({ ...prev, ...fields }))}
                disabled={false}
                inputClass={inputClass}
              />
            )}

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300 hover:border-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary disabled:opacity-50"
              >
                {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CriterioFormModal;

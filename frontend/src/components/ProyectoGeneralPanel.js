import React from 'react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl } from '../utils/media';
import {
  CARACTERISTICAS_GENERALES_FIELDS,
} from '../constants/proyectoCaracteristicas';

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-100 mt-0.5 whitespace-pre-line">{value}</dd>
    </div>
  );
}

function ProyectoGeneralPanel({ proyecto, proyectoId }) {
  const hasGeneral = CARACTERISTICAS_GENERALES_FIELDS.some((f) => proyecto[f.name]);
  const hasOtras = proyecto.otras_caracteristicas?.trim();
  const hasLabs = proyecto.laboratorios?.trim();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Características generales del buque
        </h2>
        <Link
          to={`/proyecto/${proyectoId}/editar`}
          className="btn-sm bg-navy-800 text-white hover:bg-navy-700"
        >
          Editar configuración
        </Link>
      </div>

      {proyecto.foto && (
        <img
          src={resolveMediaUrl(proyecto.foto)}
          alt={proyecto.nombre}
          className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700/60"
        />
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARACTERISTICAS_GENERALES_FIELDS.map((field) => (
          <Field key={field.name} label={field.label} value={proyecto[field.name]} />
        ))}
      </dl>

      {hasLabs && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">Laboratorios</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {proyecto.laboratorios}
          </p>
        </div>
      )}

      {hasOtras && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">Otras</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {proyecto.otras_caracteristicas}
          </p>
        </div>
      )}

      {!hasGeneral && !hasOtras && !hasLabs && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Sin características registradas.{' '}
          <Link to={`/proyecto/${proyectoId}/editar`} className="text-navy-700 dark:text-navy-400 hover:underline">
            Completar configuración
          </Link>
        </p>
      )}
    </div>
  );
}

export default ProyectoGeneralPanel;

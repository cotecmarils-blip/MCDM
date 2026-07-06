/** Opciones completas (incluye inferencia automática). */
export const RAMA_EVALUACION_OPTIONS = [
  { value: 'auto', label: 'Inferir automáticamente (por nombre)' },
  { value: 'omoe', label: 'OMOE — Efectividad / desempeño' },
  { value: 'omoc', label: 'OMOC — Costo' },
  { value: 'omor', label: 'OMOR — Riesgo' },
];

/** Select al crear una dimensión (sin «auto»). */
export const DIMENSION_RAMA_OPTIONS = [
  { value: 'omoe', label: 'OMOE — Efectividad / desempeño' },
  { value: 'omoc', label: 'OMOC — Costo' },
  { value: 'omor', label: 'OMOR — Riesgo' },
];

export const RAMA_EVALUACION_LABELS = Object.fromEntries(
  RAMA_EVALUACION_OPTIONS.map((o) => [o.value, o.label]),
);

export const ESCENARIO_RAMA_OPTIONS = DIMENSION_RAMA_OPTIONS;

export const RAMA_EVALUACION_SHORT = {
  auto: 'Auto',
  omoe: 'OMOE',
  omoc: 'OMOC',
  omor: 'OMOR',
};

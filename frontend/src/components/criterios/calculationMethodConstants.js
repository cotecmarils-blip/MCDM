/** Métodos principales de cálculo por dimensión (selección única). */
export const CALC_METHOD_MAVT = 'MAVT';
export const CALC_METHOD_MAUT = 'MAUT';
export const CALC_METHOD_UTA = 'UTA';
export const CALC_METHOD_WEIGHTED_SUM = 'WEIGHTED_SUM';

export const PRIMARY_CALCULATION_METHODS = [
  {
    id: CALC_METHOD_MAVT,
    name: 'MAVT jerárquico',
    description:
      'Evalúa la dimensión mediante árbol jerárquico de criterios, atributos, pesos globales y funciones de utilidad.',
    recommendedUse:
      'Evaluación determinística con criterios y atributos ponderados.',
    status: 'Recomendado',
    statusTone: 'recommended',
    default: true,
  },
  {
    id: CALC_METHOD_MAUT,
    name: 'MAUT por escenarios',
    description:
      'Evalúa la dimensión con utilidad esperada EU = Σ P(s)·V(a,s), usando los escenarios ya definidos en el proyecto.',
    recommendedUse:
      'Varios escenarios en Evaluación con valores distintos por alternativa.',
    status: 'Avanzado',
    statusTone: 'advanced',
  },
  {
    id: CALC_METHOD_UTA,
    name: 'UTA / calibración por preferencias',
    description:
      'Calibra pesos a partir del ranking de alternativas del proyecto definido por el decisor.',
    recommendedUse:
      'Cuando el experto puede ordenar las alternativas de mejor a peor.',
    status: 'Experimental',
    statusTone: 'experimental',
  },
  {
    id: CALC_METHOD_WEIGHTED_SUM,
    name: 'Promedio ponderado simple',
    description:
      'Suma ponderada directa de utilidades en hojas, usando los pesos ya definidos en el árbol.',
    recommendedUse:
      'Dimensiones planas o cuando no se necesita rollup jerárquico intermedio.',
    status: 'Básico',
    statusTone: 'basic',
  },
];

export const DEFAULT_CALCULATION_CONFIG = {
  [CALC_METHOD_MAVT]: {
    normalize_weights: true,
    aggregation: 'additive',
    default_utility_range: [0, 1],
  },
  [CALC_METHOD_MAUT]: {
    normalize_probabilities: true,
  },
  [CALC_METHOD_UTA]: {
    preference_source: 'expert_ranking',
    epsilon: 0.001,
    monotonicity: true,
    calibrate_weights: true,
    calibrate_utility_functions: false,
    preferences: {
      ranking: [],
      preferred_pairs: [],
      indifference_pairs: [],
    },
  },
  [CALC_METHOD_WEIGHTED_SUM]: {
    normalize_weights: true,
    fallback_to_arithmetic_mean_when_zero_weights: true,
  },
};

export function defaultCalculationFormState(item = null) {
  const method = item?.calculation_method || CALC_METHOD_MAVT;
  const baseConfig = DEFAULT_CALCULATION_CONFIG[method] || {};
  const saved = item?.calculation_config || {};
  const calculation_config = { ...baseConfig, ...saved };
  if (method === CALC_METHOD_MAUT) {
    delete calculation_config.scenarios;
    delete calculation_config.fallback_to_dimension_escenarios;
  }
  return {
    calculation_method: method,
    calculation_config,
  };
}

export function buildCalculationPayload(formState) {
  const method = formState.calculation_method || CALC_METHOD_MAVT;
  const base = DEFAULT_CALCULATION_CONFIG[method] || {};
  const merged = { ...base, ...(formState.calculation_config || {}) };
  if (method === CALC_METHOD_MAUT) {
    delete merged.scenarios;
    delete merged.fallback_to_dimension_escenarios;
  }
  if (method === CALC_METHOD_WEIGHTED_SUM) {
    merged.normalize_weights = true;
    merged.fallback_to_arithmetic_mean_when_zero_weights = true;
  }
  return {
    calculation_method: method,
    calculation_config: merged,
  };
}

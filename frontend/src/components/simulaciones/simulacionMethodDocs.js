/** Documentación visual de métodos MADM (normalización y pesos). */

export const NORMALIZATION_METHOD_DOCS = {
  directional_minmax: {
    title: 'Min-max direccional',
    intro: 'Escala cada columna al intervalo [0, 1] respetando si el criterio es de beneficio o costo.',
    equations: [
      {
        label: 'Beneficio (max)',
        text: 'rᵢⱼ = (xᵢⱼ − minⱼ) / (maxⱼ − minⱼ)',
      },
      {
        label: 'Costo (min)',
        text: 'rᵢⱼ = (maxⱼ − xᵢⱼ) / (maxⱼ − minⱼ)',
      },
    ],
    chart: 'directional_minmax',
  },
  vector: {
    title: 'Vectorial',
    intro: 'Divide cada valor por la norma euclídea de su columna (sin invertir costos).',
    equations: [
      {
        label: 'Fórmula',
        text: 'rᵢⱼ = xᵢⱼ / √(Σᵢ xᵢⱼ²)',
      },
    ],
    chart: 'vector',
  },
  directional_vector: {
    title: 'Vectorial direccional',
    intro: 'Normalización vectorial con orientación: en costos se complementa a 1.',
    equations: [
      {
        label: 'Beneficio (max)',
        text: 'rᵢⱼ = xᵢⱼ / √(Σᵢ xᵢⱼ²)',
      },
      {
        label: 'Costo (min)',
        text: 'rᵢⱼ = 1 − xᵢⱼ / √(Σᵢ xᵢⱼ²)',
      },
    ],
    chart: 'directional_vector',
  },
  sum: {
    title: 'Por suma',
    intro: 'Proporción respecto a la suma de la columna; en costos usa el inverso.',
    equations: [
      {
        label: 'Beneficio (max)',
        text: 'rᵢⱼ = xᵢⱼ / Σᵢ xᵢⱼ',
      },
      {
        label: 'Costo (min)',
        text: 'rᵢⱼ = (1/xᵢⱼ) / Σᵢ (1/xᵢⱼ)',
      },
    ],
    chart: 'sum',
  },
};

export const WEIGHT_METHOD_DOCS = {
  equal_weights: {
    title: 'Pesos iguales',
    intro: 'Cada dimensión recibe el mismo peso.',
    equations: [
      {
        label: 'Fórmula',
        text: 'wⱼ = 1 / m',
      },
    ],
    chart: 'equal_weights',
  },
  user_defined_weights: {
    title: 'Pesos definidos por el usuario',
    intro: 'Usted indica porcentajes pⱼ (%) que deben sumar 100; el sistema los convierte a pesos.',
    equations: [
      {
        label: 'Fórmula',
        text: 'wⱼ = pⱼ / Σₖ pₖ',
      },
      {
        label: 'Restricción',
        text: 'Σⱼ pⱼ = 100 %',
      },
    ],
    chart: 'user_defined_weights',
  },
  entropy: {
    title: 'Entropía',
    intro: 'Mayor peso a dimensiones con mayor diversidad de información en las alternativas.',
    equations: [
      {
        label: 'Proporción',
        text: 'pᵢⱼ = xᵢⱼ / Σᵢ xᵢⱼ',
      },
      {
        label: 'Entropía',
        text: 'eⱼ = −Σᵢ pᵢⱼ · ln(pᵢⱼ) / ln(n)',
      },
      {
        label: 'Peso',
        text: 'wⱼ = (1 − eⱼ) / Σₖ (1 − eₖ)',
      },
    ],
    chart: 'entropy',
  },
  critic: {
    title: 'CRITIC',
    intro: 'Combina la desviación estándar de cada criterio con el conflicto respecto a los demás.',
    equations: [
      {
        label: 'Desviación',
        text: 'σⱼ = std(Xⱼ)',
      },
      {
        label: 'Conflicto',
        text: 'Cⱼ = Σₖ (1 − corr(j, k))',
      },
      {
        label: 'Peso',
        text: 'wⱼ = (σⱼ · Cⱼ) / Σₖ (σₖ · Cₖ)',
      },
    ],
    chart: 'critic',
  },
};

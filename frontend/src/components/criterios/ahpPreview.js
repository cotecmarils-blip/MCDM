/** Cálculo AHP en cliente (vista previa CR y pesos al editar la matriz). */

import { getImportanceRowOverCol } from './ahpConstants';

const RI_TABLE = {
  1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
};

const CR_THRESHOLD = 0.1;

function buildMatrix(nodoIds, juicios) {
  const n = nodoIds.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      return getImportanceRowOverCol(juicios, nodoIds[i], nodoIds[j]);
    }),
  );
}

function principalEigenvector(matrix) {
  const n = matrix.length;
  if (n === 0) return { weights: [], lambdaMax: 1 };
  if (n === 1) return { weights: [1], lambdaMax: 1 };

  let w = Array(n).fill(1 / n);
  for (let iter = 0; iter < 100; iter += 1) {
    const next = Array(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        next[i] += matrix[i][j] * w[j];
      }
    }
    const sum = next.reduce((a, b) => a + b, 0) || 1;
    w = next.map((x) => x / sum);
  }

  let lambdaSum = 0;
  for (let i = 0; i < n; i += 1) {
    let aw = 0;
    for (let j = 0; j < n; j += 1) aw += matrix[i][j] * w[j];
    lambdaSum += w[i] > 0 ? aw / w[i] : aw;
  }
  const lambdaMax = lambdaSum / n;
  return { weights: w, lambdaMax };
}

function consistencyRatio(n, lambdaMax) {
  if (n < 2) return 0;
  const ci = (lambdaMax - n) / (n - 1);
  const ri = RI_TABLE[n] ?? 1.49;
  if (ri <= 0) return 0;
  return ci / ri;
}

export function computeAhpPreview(nodoIds, juicios, nombresById = {}) {
  const n = nodoIds?.length ?? 0;
  if (n === 0) {
    return {
      pesos_calculados: [],
      consistency_ratio: null,
      consistency_ok: true,
      lambda_max: null,
    };
  }
  if (n === 1) {
    return {
      pesos_calculados: [{
        nodo_id: nodoIds[0],
        nombre: nombresById[nodoIds[0]] || '',
        peso: 100,
      }],
      consistency_ratio: 0,
      consistency_ok: true,
      lambda_max: 1,
    };
  }

  const matrix = buildMatrix(nodoIds, juicios);
  const { weights, lambdaMax } = principalEigenvector(matrix);
  const cr = consistencyRatio(n, lambdaMax);

  return {
    pesos_calculados: nodoIds.map((id, i) => ({
      nodo_id: id,
      nombre: nombresById[id] || '',
      peso: Math.round(weights[i] * 10000) / 100,
    })),
    consistency_ratio: Math.round(cr * 10000) / 10000,
    consistency_ok: cr <= CR_THRESHOLD,
    lambda_max: Math.round(lambdaMax * 10000) / 10000,
  };
}

export function crStatusMessage(cr, ok) {
  if (cr == null) return null;
  const formatted = Number(cr).toFixed(3).replace('.', ',');
  if (ok) {
    return `Razón de consistencia CR = ${formatted}. Estado: Aceptable (≤ 0,10).`;
  }
  return (
    `La razón de consistencia calculada para esta matriz es ${formatted}, valor superior al umbral ` +
    'recomendado de 0,10. Esto indica que las comparaciones pareadas presentan contradicciones ' +
    'significativas. Revise los juicios ingresados antes de aplicar los pesos calculados.'
  );
}

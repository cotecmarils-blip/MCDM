import { PIPELINE_STEPS } from './simulacionPipelineMeta';

function roundMatrix(matrix, digits = 4) {
  if (!matrix?.length) return [];
  return matrix.map((row) =>
    row.map((v) => {
      const n = Number(v);
      return Number.isNaN(n) ? v : Number(n.toFixed(digits));
    }),
  );
}

/** Construye pasos del pipeline desde un resultado guardado (fallback si no hay `pasos`). */
export function buildPasosFromResultado(resultado) {
  if (resultado?.pasos?.length) return resultado.pasos;

  const pasos = [];
  const alts = resultado?.alternativas || [];
  const altNames = alts.map((a) => a.nombre);
  const dimNames = alts[0]?.dimensiones?.map((d) => d.omoe_nombre) || [];
  const opts = resultado?.opciones_calculo || {};
  const dirs =
    resultado?.normalizacion?.directions?.map((d) =>
      typeof d === 'string' ? d : d?.value || 'max',
    ) ||
    dimNames.map(() => 'max');

  if (resultado?.matriz_original?.length) {
    pasos.push({
      id: 'entrada',
      orden: 1,
      notebook: 'app',
      estado: 'completo',
      titulo: 'Matriz de utilidades',
      descripcion: 'Valores agregados por dimensión desde el árbol de criterios.',
      alternativas: altNames,
      dimensiones: dimNames,
      direcciones: dirs,
      matriz: roundMatrix(resultado.matriz_original),
    });
  }

  const pareto = resultado?.pareto;
  if (pareto) {
    const pIdx = pareto.pareto_indices || [];
    const filteredAlts = pIdx.map((i) => altNames[i]).filter(Boolean);
    const filteredMatrix = pIdx.map((i) => resultado.matriz_original[i]).filter(Boolean);
    pasos.push({
      id: 'pareto',
      orden: 2,
      notebook: '01',
      estado: 'completo',
      titulo: 'Filtro Pareto',
      activo: true,
      alternativas: filteredAlts,
      excluidas: pareto.dominated_alternatives || [],
      dimensiones: dimNames,
      direcciones: dirs,
      matriz: roundMatrix(filteredMatrix),
    });
  } else if (opts.aplicar_pareto === false) {
    pasos.push({
      id: 'pareto',
      orden: 2,
      notebook: '01',
      estado: 'omitido',
      titulo: 'Filtro Pareto',
      activo: false,
      descripcion: 'Desactivado: todas las alternativas continúan.',
    });
  }

  const norm = resultado?.normalizacion;
  if (norm?.normalized_matrix?.length) {
    pasos.push({
      id: 'normalizacion',
      orden: 3,
      notebook: '01',
      estado: 'completo',
      titulo: 'Matriz normalizada',
      descripcion: `Método: ${norm.method || opts.normalizacion_metodo || ''}`,
      alternativas: norm.pareto_alternatives || [],
      dimensiones: norm.dimensions || dimNames,
      direcciones: dirs,
      matriz: roundMatrix(norm.normalized_matrix),
    });
  }

  const pesos = resultado?.pesos;
  if (pesos?.weights_by_dimension) {
    const pct = {};
    Object.entries(pesos.weights_by_dimension).forEach(([dim, w]) => {
      pct[dim] = Math.round(Number(w) * 10000) / 100;
    });
    pasos.push({
      id: 'pesos',
      orden: 4,
      notebook: '02',
      estado: 'completo',
      titulo: 'Pesos por dimensión',
      descripcion: `Método: ${pesos.method || opts.metodo_pesos || ''}`,
      dimensiones: norm?.dimensions || dimNames,
      pesos: pesos.weights,
      pesos_porcentaje: pct,
    });
  }

  const madm = resultado?.madm;
  if (madm?.ranking_by_alternative) {
    const normAlts = norm?.pareto_alternatives || altNames;
    const scores = madm.scores_by_alternative || {};
    const ranking = madm.ranking_by_alternative || {};
    const filas = normAlts
      .map((nombre) => ({
        alternativa: nombre,
        puntuacion: Math.round(Number(scores[nombre] || 0) * 10000) / 10000,
        ranking: Number(ranking[nombre] || 0),
      }))
      .sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
    pasos.push({
      id: 'madm',
      orden: 5,
      notebook: '02',
      estado: 'completo',
      titulo: `Ranking ${(opts.metodo_madm || 'MADM').toUpperCase()}`,
      metodo: opts.metodo_madm,
      mejor_alternativa: madm.best_alternative || resultado?.best_alternative,
      filas,
    });
  }

  return pasos;
}

export function enrichPasosForDisplay(pasos) {
  const byId = Object.fromEntries((pasos || []).map((p) => [p.id, p]));
  return PIPELINE_STEPS.map((meta) => {
    const paso = byId[meta.id];
    if (!paso) return null;
    return {
      ...meta,
      ...paso,
      estado: paso.estado || (paso.error ? 'error' : 'completo'),
    };
  }).filter(Boolean);
}

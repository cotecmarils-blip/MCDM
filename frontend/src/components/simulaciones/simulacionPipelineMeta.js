import { validatePesosDimensionesPercent } from '../../utils/pesoUtils';

/** Definición fija del pipeline (app + notebooks 01/02). */
export const PIPELINE_STEPS = [
  {
    id: 'entrada',
    orden: 1,
    titulo: 'Matriz de utilidades',
    hint: 'Rollup desde el árbol de criterios',
    notebook: null,
  },
  {
    id: 'pareto',
    orden: 2,
    titulo: 'Filtro Pareto',
    hint: 'Alternativas no dominadas',
    notebook: '01',
  },
  {
    id: 'normalizacion',
    orden: 3,
    titulo: 'Normalización',
    hint: 'Escala por dimensión',
    notebook: '01',
  },
  {
    id: 'pesos',
    orden: 4,
    titulo: 'Pesos',
    hint: 'Ponderación por dimensión',
    notebook: '02',
  },
  {
    id: 'madm',
    orden: 5,
    titulo: 'Ranking MADM',
    hint: 'Orden final preliminar',
    notebook: '02',
  },
];

export function getUnlockedStepIds(config, dimCount = 0) {
  if (!config) return [];

  const unlocked = ['entrada'];

  if (config.aplicar_pareto !== null && config.aplicar_pareto !== undefined) {
    unlocked.push('pareto');
  }

  if (config.normalizacion_metodo && config.dimensiones_normalizar?.length) {
    unlocked.push('normalizacion');
  }

  if (unlocked.includes('normalizacion') && config.metodo_pesos) {
    if (config.metodo_pesos === 'user_defined_weights') {
      const check = validatePesosDimensionesPercent(config.pesos_usuario, dimCount);
      if (check.ok) unlocked.push('pesos');
    } else {
      unlocked.push('pesos');
    }
  }

  if (unlocked.includes('pesos') && config.metodo_madm) {
    unlocked.push('madm');
  }

  return unlocked;
}

export function getActiveProcessingStepId(unlockedIds, loading) {
  if (!loading || !unlockedIds.length) return null;
  return unlockedIds[unlockedIds.length - 1];
}

export function mergePipelineSteps(previewPasos, unlockedIds) {
  const byId = Object.fromEntries((previewPasos || []).map((p) => [p.id, p]));

  return PIPELINE_STEPS.map((meta) => {
    const paso = byId[meta.id];
    const unlocked = unlockedIds.includes(meta.id);
    let estado = 'bloqueado';

    if (!unlocked) {
      estado = 'bloqueado';
    } else if (paso?.error || paso?.estado === 'error') {
      estado = 'error';
    } else if (paso?.estado === 'bloqueado') {
      estado = 'bloqueado';
    } else if (paso?.id === 'pareto' && paso?.activo === false) {
      estado = 'omitido';
    } else if (paso && (paso.matriz || paso.pesos || paso.filas)) {
      estado = 'completo';
    } else if (unlocked) {
      estado = 'pendiente';
    }

    return {
      ...meta,
      ...paso,
      estado,
      unlocked,
    };
  }).filter((s) => s.unlocked || s.orden <= 1);
}

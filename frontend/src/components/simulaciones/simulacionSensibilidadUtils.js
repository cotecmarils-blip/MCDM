import { redistributeWeights, calculateOverall } from '../../utils/sensitivityCalculations';

const ALT_COLORS = [
  '#1f4ed8', '#e3342f', '#38a169', '#8b4513', '#d69e2e',
  '#7c3aed', '#0891b2', '#be185d', '#4b5563', '#ea580c',
];

export function abbreviateDim(name, max = 14) {
  const s = String(name || '').trim();
  if (s.length <= max) return s;
  const slice = s.slice(0, max - 1);
  const sp = slice.lastIndexOf(' ');
  if (sp > max * 0.4) return `${slice.slice(0, sp)}…`;
  return `${slice}…`;
}

export function coerceWeightsMap(weights, criteria) {
  if (!criteria?.length) return { ...(weights || {}) };

  const lookup = (dim) => {
    if (weights?.[dim] != null) return Number(weights[dim]);
    const trimmed = String(dim).trim();
    const key = Object.keys(weights || {}).find(
      (k) => String(k).trim() === trimmed,
    );
    if (key != null) return Number(weights[key]);
    return 0;
  };

  const raw = criteria.map((c) => lookup(c));
  let vals = [...raw];
  if (Math.max(...vals, 0) > 1.01) {
    vals = vals.map((v) => v / 100);
  }
  let total = vals.reduce((a, b) => a + b, 0);
  if (total <= 0.001) {
    const n = criteria.length || 1;
    vals = criteria.map(() => 1 / n);
    total = 1;
  }
  if (Math.abs(total - 1) > 0.01) {
    vals = vals.map((v) => v / total);
  }
  const out = {};
  criteria.forEach((c, i) => {
    out[c] = vals[i];
  });
  return out;
}

function resolveAlternativesFromResultado(resultado) {
  const norm = resultado?.normalizacion || {};
  const fromPareto = norm.pareto_alternatives || [];
  if (fromPareto.length) return fromPareto;
  return (resultado?.alternativas || [])
    .filter((a) => a?.nombre && !a.excluida_pareto)
    .map((a) => a.nombre);
}

function buildLocalPrioritiesFromResultado(resultado) {
  const norm = resultado?.normalizacion || {};
  const matrix = norm.normalized_matrix;
  const dimensions = norm.dimensions || [];
  const alternatives = resolveAlternativesFromResultado(resultado);
  if (!matrix?.length || !dimensions.length || matrix.length !== alternatives.length) {
    return {};
  }
  const out = {};
  alternatives.forEach((name, i) => {
    out[name] = {};
    dimensions.forEach((dim, j) => {
      out[name][dim] = matrix[i]?.[j] ?? 0;
    });
  });
  return out;
}

function extractWeightsMapFromResultado(resultado, dimensions) {
  if (!dimensions?.length) return {};
  const pesos = resultado?.pesos || {};
  const rawByDim = { ...(pesos.weights_by_dimension || {}) };

  const weightsMap = {};
  dimensions.forEach((dim, i) => {
    if (rawByDim[dim] != null) {
      weightsMap[dim] = rawByDim[dim];
      return;
    }
    const key = Object.keys(rawByDim).find((k) => String(k).trim() === String(dim).trim());
    if (key != null) {
      weightsMap[dim] = rawByDim[key];
      return;
    }
    if (Array.isArray(pesos.weights) && pesos.weights[i] != null) {
      weightsMap[dim] = pesos.weights[i];
      return;
    }
    const madmWeights = resultado?.madm?.weights;
    if (Array.isArray(madmWeights) && madmWeights[i] != null) {
      weightsMap[dim] = madmWeights[i];
    }
  });

  if (!Object.values(weightsMap).some((v) => Number(v) > 0)) {
    const n = dimensions.length;
    dimensions.forEach((dim) => {
      weightsMap[dim] = 1 / n;
    });
  }

  return coerceWeightsMap(weightsMap, dimensions);
}

export function resolveDisplayWeights(criteria, bootstrap, model, userWeights) {
  if (!criteria?.length) return {};
  if (userWeights) {
    return coerceWeightsMap(userWeights, criteria);
  }
  if (model?.ok && model.weights) {
    const fromModel = coerceWeightsMap(model.weights, criteria);
    const sum = Object.values(fromModel).reduce((a, b) => a + b, 0);
    if (sum > 0.001) return fromModel;
  }
  if (bootstrap?.weights) {
    return coerceWeightsMap(bootstrap.weights, criteria);
  }
  return coerceWeightsMap({}, criteria);
}

/**
 * Datos inmediatos del cálculo guardado (sin esperar al API de sensibilidad).
 */
export function buildSensibilidadBootstrap(resultado) {
  if (!resultado || resultado.ok === false) return null;

  const dimensions = resultado?.normalizacion?.dimensions || [];
  if (dimensions.length < 2) return null;

  const altNames = resolveAlternativesFromResultado(resultado);
  if (!altNames.length) return null;

  const weights = extractWeightsMapFromResultado(resultado, dimensions);
  const scores = resultado?.madm?.scores_by_alternative || {};
  const localPriorities = buildLocalPrioritiesFromResultado(resultado);
  const alternatives = altNames.map((name, idx) => ({
    name,
    color: ALT_COLORS[idx % ALT_COLORS.length],
  }));

  const metodoKey = resultado?.opciones_calculo?.metodo_madm
    || resultado?.madm?.method
    || 'madm';

  return {
    ok: true,
    dimensions,
    alternatives,
    weights,
    local_priorities: localPriorities,
    scores,
    metodo_madm: metodoKey,
    metodo_madm_label: metodoKey.toUpperCase(),
    pesos_metodo: resultado?.pesos?.method || resultado?.opciones_calculo?.metodo_pesos,
  };
}

export function buildPerformanceSeries(
  alternatives,
  criteria,
  weights,
  localPriorities,
  scoresByAlt,
) {
  const wmap = coerceWeightsMap(weights, criteria);
  const overallLabel = 'GLOBAL';
  const labels = [...criteria.map((c) => abbreviateDim(c)), overallLabel];
  const series = alternatives.map((alt) => {
    const values = criteria.map((c) => localPriorities[alt.name]?.[c] ?? 0);
    const overall = scoresByAlt?.[alt.name] ?? 0;
    return {
      name: alt.name,
      color: alt.color,
      values: [...values, overall],
    };
  });
  const bars = criteria.map((c) => ({
    criterion: c,
    weight: wmap[c] ?? 0,
  }));
  return { labels, series, bars, overallLabel, criteriaLabels: criteria.map((c) => abbreviateDim(c)) };
}

export function applyWeightChange(weights, dimension, newWeight) {
  return redistributeWeights(weights, dimension, newWeight);
}

export function rankingFromScores(alternatives, scoresByAlt, rankingList) {
  if (rankingList?.length) {
    return rankingList.map((row, idx) => ({
      id: row.name,
      name: row.name,
      color: row.color || alternatives[idx]?.color,
      overall: row.score ?? scoresByAlt?.[row.name] ?? 0,
      rank: row.rank,
    }));
  }
  return alternatives
    .map((alt) => ({
      id: alt.name,
      name: alt.name,
      color: alt.color,
      overall: scoresByAlt?.[alt.name] ?? 0,
    }))
    .sort((a, b) => b.overall - a.overall);
}

export function normalizeWeightsForApi(weights, criteria) {
  if (!criteria?.length) return weights;
  const raw = criteria.map((c) => Number(weights[c] ?? 0));
  const total = raw.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights;
  const out = {};
  criteria.forEach((c, i) => {
    out[c] = raw[i] / total;
  });
  return out;
}

export function sensibilidadRequestBody(resultado, extra = {}) {
  return {
    historial_id: resultado?.historial_id,
    resultado: resultado?.historial_id ? undefined : resultado,
    ...extra,
  };
}

/** Vista previa instantánea del tornado (actualiza en tiempo real al mover pesos). */
export function buildTornadoPreview(criteria, weights, localPriorities, alternativeName) {
  if (!criteria?.length || !alternativeName) return null;

  const wmap = coerceWeightsMap(weights, criteria);
  const baseline = calculateOverall(alternativeName, wmap, localPriorities);
  const bars = criteria.map((dim) => {
    const w0 = coerceWeightsMap(redistributeWeights(wmap, dim, 0), criteria);
    const w1 = coerceWeightsMap(redistributeWeights(wmap, dim, 1), criteria);
    const score0 = calculateOverall(alternativeName, w0, localPriorities);
    const score1 = calculateOverall(alternativeName, w1, localPriorities);
    const pessimistic = Math.min(score0, score1);
    const optimistic = Math.max(score0, score1);
    return {
      dimension: dim,
      score_at_weight_0: score0,
      score_at_weight_1: score1,
      pessimistic,
      optimistic,
      swing: optimistic - pessimistic,
    };
  });

  bars.sort((a, b) => b.swing - a.swing);

  return {
    alternative: alternativeName,
    baseline_score: baseline,
    bars,
    preview: true,
  };
}

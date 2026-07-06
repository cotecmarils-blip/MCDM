export const WEIGHT_TOLERANCE = 0.001;

export function calculateOverall(alternativeName, weights, localPriorities) {
  let total = 0;
  for (const criterion of Object.keys(weights)) {
    const local = localPriorities[alternativeName]?.[criterion] ?? 0;
    total += weights[criterion] * local;
  }
  return total;
}

export function calculateAllOveralls(alternatives, weights, localPriorities) {
  return alternatives
    .map((alt) => ({
      ...alt,
      overall: calculateOverall(alt.name, weights, localPriorities),
    }))
    .sort((a, b) => b.overall - a.overall);
}

export function redistributeWeights(weights, changedCriterion, newWeight) {
  const clamped = Math.max(0, Math.min(1, newWeight));
  const updatedWeights = {};
  const otherCriteria = Object.keys(weights).filter((c) => c !== changedCriterion);
  const oldOtherSum = otherCriteria.reduce((sum, c) => sum + weights[c], 0);

  updatedWeights[changedCriterion] = clamped;

  if (otherCriteria.length === 0) {
    return updatedWeights;
  }

  const newOtherSum = 1 - clamped;
  if (oldOtherSum <= WEIGHT_TOLERANCE) {
    const share = newOtherSum / otherCriteria.length;
    for (const criterion of otherCriteria) {
      updatedWeights[criterion] = share;
    }
  } else {
    for (const criterion of otherCriteria) {
      updatedWeights[criterion] = newOtherSum * (weights[criterion] / oldOtherSum);
    }
  }
  return updatedWeights;
}

export function buildChartSeries(alternatives, criteria, weights, localPriorities) {
  const labels = [...criteria, 'OVERALL'];
  const series = alternatives.map((alt) => {
    const values = criteria.map((c) => localPriorities[alt.name]?.[c] ?? 0);
    const overall = calculateOverall(alt.name, weights, localPriorities);
    return {
      name: alt.name,
      color: alt.color,
      values: [...values, overall],
    };
  });
  const bars = criteria.map((c) => ({
    criterion: c,
    weight: weights[c],
  }));
  return { labels, series, bars };
}

export function validateSensitivityModel(criteria, weights, localPriorities, alternatives) {
  const errors = [];
  if (!criteria?.length) errors.push('Debe existir al menos un criterio hijo.');
  if (!alternatives?.length) errors.push('Debe existir al menos una alternativa.');

  const weightSum = Object.values(weights || {}).reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1) > WEIGHT_TOLERANCE) {
    errors.push(`Los pesos deben sumar 1 (actual: ${weightSum.toFixed(3)}).`);
  }

  for (const crit of criteria || []) {
    const colSum = alternatives.reduce(
      (sum, alt) => sum + (localPriorities[alt.name]?.[crit] ?? 0),
      0,
    );
    if (Math.abs(colSum - 1) > 0.01) {
      errors.push(`La columna "${crit}" no suma ~1 (${colSum.toFixed(3)}).`);
    }
  }
  return errors;
}

export function buildOverallBreakdown(alternativeName, weights, localPriorities) {
  return Object.keys(weights).map((criterion) => {
    const local = localPriorities[alternativeName]?.[criterion] ?? 0;
    const weight = weights[criterion];
    return {
      criterion,
      weight,
      local,
      contribution: weight * local,
    };
  });
}

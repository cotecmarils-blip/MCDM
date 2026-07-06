import { getAlternativaChartLabel } from '../../utils/alternativaDisplay';

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function valorPorRama(dimensiones, rama) {
  const key = rama.toLowerCase();
  const dim = (dimensiones || []).find(
    (d) => (d.rama_evaluacion || 'omoe').toLowerCase() === key,
  );
  return dim?.valor ?? null;
}

function valoresPorDimensiones(dimensiones) {
  const dims = dimensiones || [];
  let omoe = valorPorRama(dims, 'omoe');
  let omoc = valorPorRama(dims, 'omoc');
  let omor = valorPorRama(dims, 'omor');

  if (omoe == null && omoc == null && omor == null && dims.length > 0) {
    const d = dims.length === 1 ? dims[0] : dims.find((x) => x.valor != null);
    if (d) {
      const rama = (d.rama_evaluacion || 'omoe').toLowerCase();
      if (rama === 'omoc') omoc = d.valor;
      else if (rama === 'omor') omor = d.valor;
      else omoe = d.valor;
    }
  }

  return { omoe, omoc, omor };
}

/** Catálogo de dimensiones del cálculo (rollup por alternativa). */
export function listDimensionesFromResultado(resultado) {
  const alternativas = resultado?.alternativas || [];
  const aplicarPareto = Boolean(resultado?.opciones_calculo?.aplicar_pareto);
  const filtered = aplicarPareto
    ? alternativas.filter((a) => !a.excluida_pareto)
    : alternativas;
  const source = filtered.length ? filtered : alternativas;
  const template = source[0]?.dimensiones || [];

  return template.map((d) => ({
    id: d.omoe_id,
    nombre: d.omoe_nombre || `Dimensión ${d.omoe_id}`,
    rama: (d.rama_evaluacion || 'omoe').toLowerCase(),
  }));
}

export function buildChartDimensions(dimensiones, selectedIds) {
  const byId = new Map(dimensiones.map((d) => [d.id, d]));
  return selectedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((d) => ({
      key: String(d.id),
      label: d.nombre,
      get: (p) => p.valores?.[d.id] ?? null,
    }));
}

/**
 * Construye puntos para gráficos de trade-off a partir del resultado guardado de un cálculo.
 * Usa las utilidades por dimensión del rollup y la puntuación MADM del pipeline.
 */
export function buildGraficosFromResultado(resultado, selectedDimIds = null) {
  const alternativas = resultado?.alternativas || [];
  const aplicarPareto = Boolean(resultado?.opciones_calculo?.aplicar_pareto);
  const dimensiones = listDimensionesFromResultado(resultado);
  const selectedSet = selectedDimIds?.length
    ? new Set(selectedDimIds)
    : new Set(dimensiones.map((d) => d.id));

  const puntos = alternativas.map((alt, idx) => {
    const dims = alt.dimensiones || [];
    const valores = {};
    dims.forEach((d) => {
      if (d.omoe_id != null && d.valor != null) {
        valores[d.omoe_id] = Number(d.valor);
      }
    });
    const filteredVals = {};
    dimensiones.forEach((meta) => {
      if (selectedSet.has(meta.id) && valores[meta.id] != null) {
        filteredVals[meta.id] = valores[meta.id];
      }
    });
    const { omoe, omoc, omor } = valoresPorDimensiones(
      dims.filter((d) => selectedSet.has(d.omoe_id)),
    );
    return {
      id: alt.id,
      nombre: alt.nombre,
      apodo: alt.apodo || '',
      chartLabel: getAlternativaChartLabel(alt),
      label: LABELS[idx] || String(idx + 1),
      valores: filteredVals,
      omoe,
      omoc,
      omor,
      overall: alt.score_madm ?? alt.valor_global ?? 0,
      ranking: alt.excluida_pareto ? null : alt.ranking,
      excluida_pareto: Boolean(alt.excluida_pareto),
    };
  });

  const paraGrafico = aplicarPareto
    ? puntos.filter((p) => !p.excluida_pareto)
    : puntos;

  const referencia = paraGrafico.length ? paraGrafico : puntos;

  return {
    puntos: referencia,
    todosLosPuntos: puntos,
    dimensiones,
    chartDimensions: buildChartDimensions(dimensiones, [...selectedSet]),
    showOmoe: referencia.some((p) => p.omoe != null),
    showOmoc: referencia.some((p) => p.omoc != null),
    showOmor: referencia.some((p) => p.omor != null),
    aplicarPareto,
    metodoMadm: resultado?.opciones_calculo?.metodo_madm,
  };
}

export function buildExportFilename(resultado, suffix) {
  const id = resultado?.historial_id || 'calculo';
  const nombre = (resultado?.titulo_historial || resultado?.opciones_calculo?.nombre_calculo || '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40);
  const base = nombre ? `${nombre}_${id}` : `calculo_${id}`;
  return `${base}_${suffix}.json`;
}

export function buildRankingExport(resultado) {
  const { puntos, metodoMadm, aplicarPareto } = buildGraficosFromResultado(resultado);
  return {
    historial_id: resultado?.historial_id ?? null,
    nombre: resultado?.titulo_historial || resultado?.opciones_calculo?.nombre_calculo || null,
    metodo_madm: metodoMadm,
    aplicar_pareto: aplicarPareto,
    opciones_calculo: resultado?.opciones_calculo ?? null,
    alternativas: puntos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apodo: p.apodo,
      chartLabel: p.chartLabel,
      label: p.label,
      ranking: p.ranking,
      score_madm: p.overall,
      omoe: p.omoe,
      omoc: p.omoc,
      omor: p.omor,
    })),
    madm: resultado?.madm ?? null,
    pareto: resultado?.pareto ?? null,
  };
}

export function buildMatrizNormalizadaExport(resultado) {
  const norm = resultado?.normalizacion;
  if (!norm?.normalized_matrix?.length) return null;
  return {
    historial_id: resultado?.historial_id ?? null,
    nombre: resultado?.titulo_historial || null,
    metodo: norm.method || resultado?.opciones_calculo?.normalizacion_metodo,
    dimensions: norm.dimensions || [],
    alternatives: norm.pareto_alternatives || [],
    normalized_matrix: norm.normalized_matrix,
  };
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

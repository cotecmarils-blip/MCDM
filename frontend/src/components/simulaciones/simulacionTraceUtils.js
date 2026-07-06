export function traceNodeKey(node, parentKey = 'root') {
  const id = node?.nodo_id ?? node?.nombre ?? 'x';
  return `${parentKey}/${node?.kind}-${id}`;
}

export function formatValor(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(4);
}

/** Lista plana para la pestaña Auditoría (de hoja hacia raíz por rama). */
export function flattenAuditLines(trace, path = [], out = []) {
  if (!trace) return out;

  const currentPath = [...path, trace.nombre || '—'];
  const depth = path.length;

  out.push({
    key: traceNodeKey(trace, path.join('/')),
    depth,
    path: currentPath.join(' → '),
    nombre: trace.nombre,
    levelLabel: trace.level_label || trace.kind,
    kind: trace.kind,
    valor: trace.valor,
    formula: trace.formula,
  });

  const hijos = trace.hijos || [];
  hijos.forEach((h) => {
    const childTrace = h.trace || h;
    if (childTrace?.kind) {
      flattenAuditLines(childTrace, currentPath, out);
    }
  });

  return out;
}

export function collectTreeRows(trace, depth = 0, rows = []) {
  if (!trace) return rows;

  rows.push({
    key: traceNodeKey(trace, String(depth)),
    node: trace,
    depth,
  });

  (trace.hijos || []).forEach((h) => {
    const child = h.trace || h;
    if (child?.kind) {
      collectTreeRows(child, depth + 1, rows);
    }
  });

  return rows;
}

export function paramEntries(parametros) {
  if (!parametros || typeof parametros !== 'object') return [];
  return Object.entries(parametros).filter(([, v]) => v != null && String(v).trim() !== '');
}

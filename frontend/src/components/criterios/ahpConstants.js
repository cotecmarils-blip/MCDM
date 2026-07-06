/** Utilidades para matriz AHP (entrada libre, estilo Expert Choice). */

export const SAATY_OPTIONS = [
  { value: 9, label: '9 — Extremo absoluto' },
  { value: 8, label: '8 — Absolutamente' },
  { value: 7, label: '7 — Extremadamente' },
  { value: 6, label: '6 — Muy fuertemente' },
  { value: 5, label: '5 — Fuertemente' },
  { value: 4, label: '4 — Bastante más' },
  { value: 3, label: '3 — Moderadamente' },
  { value: 2, label: '2 — Poco más' },
  { value: 1, label: '1 — Igual importancia' },
  { value: 1 / 2, label: '1/2 — Inverso poco' },
  { value: 1 / 3, label: '1/3 — Inverso moderado' },
  { value: 1 / 4, label: '1/4 — Inverso bastante' },
  { value: 1 / 5, label: '1/5 — Inverso fuerte' },
  { value: 1 / 6, label: '1/6 — Inverso muy fuerte' },
  { value: 1 / 7, label: '1/7 — Inverso extremo' },
  { value: 1 / 8, label: '1/8 — Inverso absoluto' },
  { value: 1 / 9, label: '1/9 — Inverso extremo absoluto' },
];

export function formatSaatyValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  for (const opt of SAATY_OPTIONS) {
    if (Math.abs(opt.value - n) < 1e-4) {
      return opt.label.split(' — ')[0];
    }
  }
  if (n >= 1) {
    const rounded = Math.round(n * 10000) / 10000;
    return String(rounded).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
  const inv = Math.round(1 / n);
  if (inv >= 1 && inv <= 9 && Math.abs(n - 1 / inv) < 1e-4) {
    return `1/${inv}`;
  }
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export function juicioStorageKey(a, b) {
  const i = Math.min(a, b);
  const j = Math.max(a, b);
  return `${i}_${j}`;
}

/** Importancia de idRow respecto a idCol (fila sobre columna). */
export function getImportanceRowOverCol(juicios, idRow, idCol) {
  if (idRow === idCol) return 1;
  const key = juicioStorageKey(idRow, idCol);
  const stored = juicios?.[key] ?? 1;
  return idRow < idCol ? Number(stored) : 1 / Number(stored);
}

export function setImportanceRowOverCol(juicios, idRow, idCol, value) {
  const key = juicioStorageKey(idRow, idCol);
  const n = normalizeJuicioValue(value);
  const stored = idRow < idCol ? n : 1 / n;
  return { ...juicios, [key]: stored };
}

export function normalizeJuicioValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.round(n * 1e6) / 1e6;
}

/** Parsea número, decimal o fracción (p. ej. 2.5, 12.34, 1/3). */
export function parseNumericOrFraction(raw) {
  const text = String(raw ?? '').trim().replace(/\s+/g, '');
  if (!text) return NaN;
  const frac = text.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  if (frac) {
    const num = Number(frac[1].replace(',', '.'));
    const den = Number(frac[2].replace(',', '.'));
    if (den > 0 && Number.isFinite(num)) return num / den;
    return NaN;
  }
  return Number(text.replace(',', '.'));
}

/** Entrada libre: conserva el valor tal cual (solo debe ser > 0). */
export function parseMatrixCellInput(raw, fallback = 1) {
  const n = parseNumericOrFraction(raw);
  if (!Number.isFinite(n) || n <= 0) return normalizeJuicioValue(fallback);
  return normalizeJuicioValue(n);
}

/** Borrador permitido mientras se escribe. */
export function sanitizeMatrixCellDraft(raw) {
  return String(raw ?? '')
    .replace(/[^\d.,/]/g, '')
    .slice(0, 16);
}

export function formatMatrixCellDisplay(value) {
  return formatSaatyValue(value);
}

export function juiciosAreEqual(a, b) {
  return Math.abs(normalizeJuicioValue(a) - normalizeJuicioValue(b)) < 1e-6;
}

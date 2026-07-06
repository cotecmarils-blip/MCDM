/** Etiqueta visible en gráficos: apodo si existe, si no el nombre completo. */
export function getAlternativaChartLabel({ apodo, nombre } = {}) {
  const nick = String(apodo ?? '').trim();
  if (nick) return nick;
  return String(nombre ?? '').trim() || '?';
}

/** Título en hover: muestra nombre completo si hay apodo distinto. */
export function getAlternativaHoverTitle({ apodo, nombre, chartLabel } = {}) {
  const nick = String(apodo ?? '').trim();
  const full = String(nombre ?? '').trim();
  if (nick && full && nick !== full) return `${nick} — ${full}`;
  return chartLabel || full || nick || '?';
}

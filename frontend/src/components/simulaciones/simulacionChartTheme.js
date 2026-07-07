/** Fondo por defecto de gráficas en el módulo de simulaciones (modo claro). */
export const SIMULACION_CHART_BG = '#f7f7ef';

export function getSimulacionChartBgColors(isDark) {
  if (isDark) {
    return {
      paper_bgcolor: 'rgba(15, 23, 42, 0)',
      plot_bgcolor: '#1e293b',
    };
  }
  return {
    paper_bgcolor: SIMULACION_CHART_BG,
    plot_bgcolor: SIMULACION_CHART_BG,
  };
}

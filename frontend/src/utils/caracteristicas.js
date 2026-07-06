/** Quita corchetes que el usuario ponga en la unidad ([m], [[Kn]], etc.). */
export function normalizeUnidad(raw) {
  let u = String(raw ?? '').trim();
  while (u.startsWith('[') && u.endsWith(']')) {
    u = u.slice(1, -1).trim();
  }
  return u;
}

/** Contenedor: hasta 4 tarjetas por fila y espacio distribuido entre ellas. */
export const CARACTERISTICAS_GRID_CLASS =
  'flex flex-wrap justify-between gap-y-3 w-full';

/** Ancho por tarjeta según breakpoint (máx. 4 por fila en pantallas anchas). */
export const CARACTERISTICA_ITEM_WIDTH_CLASS =
  'w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)] xl:w-[calc(25%-0.5625rem)] shrink-0';

export const caracteristicaCardClass = (activa, isDark) => {
  const base = `flex flex-col justify-between min-h-[5.25rem] p-3 rounded-lg border transition-colors ${CARACTERISTICA_ITEM_WIDTH_CLASS}`;
  if (activa === false) {
    return `${base} border-gray-200 dark:border-gray-700/60 opacity-60 ${
      isDark ? 'bg-navy-900/30' : 'bg-gray-50'
    }`;
  }
  return `${base} border-navy-300 dark:border-navy-600 ${
    isDark ? 'bg-navy-900/50' : 'bg-gray-50'
  }`;
};

/** Etiqueta visible: "Eslora [m]" o solo nombre si no hay unidad. */
export function formatPlantillaLabel(plantilla) {
  if (!plantilla) return '';
  const nombre = (plantilla.nombre || plantilla.plantilla_nombre || '').trim();
  const unidad = normalizeUnidad(plantilla.unidad || plantilla.plantilla_unidad || '');
  return unidad ? `${nombre} [${unidad}]` : nombre;
}

export function buildValoresFromPlantillas(plantillas, existingCaracteristicas = []) {
  const byPlantilla = new Map(
    (existingCaracteristicas || []).map((c) => [c.plantilla, c])
  );
  return (plantillas || []).map((p) => {
    const existing = byPlantilla.get(p.id);
    return {
      plantillaId: p.id,
      plantilla: p,
      id: existing?.id ?? null,
      dato: existing?.dato ?? '',
      activa: Boolean(existing),
    };
  });
}

export function buildValoresDefaultPlantillas(plantillas) {
  return (plantillas || []).map((p) => ({
    plantillaId: p.id,
    plantilla: p,
    id: null,
    dato: '',
    activa: Boolean(p.por_defecto),
  }));
}

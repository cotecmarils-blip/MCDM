import { CRITERIO_LEVELS } from './constants';

export const MAX_NIVELES_ARBOL = 9;
export const MIN_NIVELES_ARBOL = 1;

/** Mayor orden configurado (solo niveles activos si se filtran antes). */
export function getMaxNivelOrden(niveles) {
  const list = (niveles || []).filter((n) => n.activo !== false);
  if (!list.length) return 0;
  return Math.max(...list.map((n) => Number(n.orden)));
}

/** Orden del padre (0 = dimensión OMOE, sin restricción inferior fija). */
export function getParentOrden(parentLevel, parentNode) {
  if (parentLevel === CRITERIO_LEVELS.OMOE) {
    return 0;
  }
  if (parentLevel === CRITERIO_LEVELS.NODO_ARBOL && parentNode) {
    const orden = parentNode.tipo_nivel_orden ?? parentNode.tipo_nivel?.orden;
    if (orden == null) return null;
    return Number(orden);
  }
  return null;
}

export function canAddChildNode(parentLevel, parentNode, niveles = []) {
  const parentOrden = getParentOrden(parentLevel, parentNode);
  if (parentOrden == null) return false;
  const maxOrden = getMaxNivelOrden(niveles);
  if (!maxOrden) return false;
  return parentOrden < maxOrden;
}

/** Niveles permitidos como hijo: cualquier nivel estrictamente inferior al padre. */
export function filterNivelesForChild(niveles, parentLevel, parentNode) {
  const parentOrden = getParentOrden(parentLevel, parentNode);
  const maxOrden = getMaxNivelOrden(niveles);
  if (parentOrden == null || !maxOrden || parentOrden >= maxOrden) {
    return [];
  }
  return (niveles || [])
    .filter((n) => n.activo !== false && Number(n.orden) > parentOrden)
    .sort((a, b) => Number(a.orden) - Number(b.orden));
}

export function childLevelHint(parentLevel, parentNode, niveles) {
  const parentOrden = getParentOrden(parentLevel, parentNode);
  const maxOrden = getMaxNivelOrden(niveles);
  if (parentOrden == null) return null;
  if (!maxOrden || parentOrden >= maxOrden) {
    return 'Este nodo está en el último nivel y no admite hijos.';
  }
  const options = filterNivelesForChild(niveles, parentLevel, parentNode);
  if (options.length === 0) {
    return 'No hay niveles inferiores disponibles para este padre.';
  }
  if (parentOrden === 0) {
    return `Puedes crear cualquier nivel del árbol (1 a ${maxOrden}) bajo la dimensión.`;
  }
  const names = options.map((n) => `${n.nombre} (${n.orden})`).join(', ');
  return `Puedes crear niveles inferiores al padre (>${parentOrden}): ${names}.`;
}

/** @deprecated usar MAX_NIVELES_ARBOL */
export const MAX_NIVEL_ARBOL_ORDEN = MAX_NIVELES_ARBOL;

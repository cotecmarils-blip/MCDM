import { CRITERIO_LEVELS } from './constants';

/** Dimensión sin nodos en el árbol = nodo terminal evaluable. */
export function isTerminalCriterioNode(level, item) {
  if (!item) return false;
  if (level === CRITERIO_LEVELS.OMOE) {
    return !(item.nodos?.length);
  }
  if (level === CRITERIO_LEVELS.NODO_ARBOL) {
    return !(item.hijos?.length);
  }
  if (level === CRITERIO_LEVELS.DP) return true;
  if (level === CRITERIO_LEVELS.MOP) return !(item.dps?.length);
  if (level === CRITERIO_LEVELS.GRUPO_AFINIDAD) return !(item.mops?.length);
  return false;
}

/**
 * Muestra bloque de utilidad (tipo, familia, parámetros).
 * En nodos del árbol la utilidad vive por escenario (NodoArbolEscenario); el nodo
 * base puede quedar vacío. Por eso una hoja estructural siempre muestra el bloque,
 * y un padre con hijos solo si el form lo marca evaluable (p. ej. terminal efectivo
 * del escenario con hijos inactivos) o ya trae utilidad en formData/item.
 */
export function showUtilidadFields(level, item, formData = {}) {
  const hasFormUtil =
    Boolean(formData.es_nodo_evaluable)
    || Boolean(formData.tipo_criterio || formData.tipo_mop)
    || Boolean(formData.familia_funciones)
    || formData.modo_evaluacion === 'incertidumbre';
  const hasItemUtil =
    Boolean(item?.tipo_criterio || item?.tipo_mop)
    || Boolean(item?.familia_funciones)
    || item?.modo_evaluacion === 'incertidumbre';

  if (level === CRITERIO_LEVELS.OMOE) {
    if (item?.nodos?.length) return false;
    if (!item) return Boolean(formData.es_nodo_evaluable);
    return hasItemUtil || hasFormUtil || Boolean(formData.es_nodo_evaluable);
  }
  if (level === CRITERIO_LEVELS.NODO_ARBOL) {
    if (!item) return Boolean(formData.es_nodo_evaluable);
    if (item.hijos?.length) {
      // Padre: solo si es terminal efectivo / marcado evaluable o ya hay utilidad.
      return hasFormUtil || hasItemUtil;
    }
    // Hoja sin hijos: siempre configurable (la función se guarda por escenario).
    return true;
  }
  return isTerminalCriterioNode(level, item);
}

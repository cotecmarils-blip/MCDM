/** Niveles del árbol de criterios (sin VOP: el VOP es resultado por alternativa). */
export const CRITERIO_LEVELS = {
  OMOE: 'omoe',
  NODO_ARBOL: 'nodo_arbol',
  /** @deprecated legado */
  MISION: 'mision',
  GRUPO_AFINIDAD: 'grupo_afinidad',
  MOP: 'mop',
  DP: 'dp',
};

export const MODELO_LABEL = 'Dimensión';
export const MODELO_LABEL_PLURAL = 'Dimensiones';
export const OMOE_LABEL = MODELO_LABEL;
export const OMOE_LABEL_PLURAL = MODELO_LABEL_PLURAL;
export const NODO_ARBOL_LABEL = 'Nodo';
export const MISION_LABEL = 'Misión';
export const GRUPO_AFINIDAD_LABEL = 'Grupo de afinidad';
export const MOP_LABEL = 'MOP';
export const DP_LABEL = 'DP / atributo técnico';
export const VOP_LABEL = 'VOP';

export const LEVEL_LABELS = {
  [CRITERIO_LEVELS.OMOE]: MODELO_LABEL,
  [CRITERIO_LEVELS.NODO_ARBOL]: NODO_ARBOL_LABEL,
  [CRITERIO_LEVELS.MISION]: MISION_LABEL,
  [CRITERIO_LEVELS.GRUPO_AFINIDAD]: GRUPO_AFINIDAD_LABEL,
  [CRITERIO_LEVELS.MOP]: MOP_LABEL,
  [CRITERIO_LEVELS.DP]: DP_LABEL,
};

export const LEVEL_LABELS_SHORT = { ...LEVEL_LABELS };

/** Etiqueta visible de un nodo del árbol flexible. */
export function getNodoTipoLabel(node) {
  if (!node) return NODO_ARBOL_LABEL;
  return node.tipo_nivel_nombre || node.tipo_nivel?.nombre || NODO_ARBOL_LABEL;
}

export const CHILDREN_KEY = {
  [CRITERIO_LEVELS.OMOE]: 'nodos',
  [CRITERIO_LEVELS.NODO_ARBOL]: 'hijos',
  [CRITERIO_LEVELS.GRUPO_AFINIDAD]: 'mops',
  [CRITERIO_LEVELS.MOP]: 'dps',
};

export const CHILD_LEVEL = {
  [CRITERIO_LEVELS.OMOE]: CRITERIO_LEVELS.NODO_ARBOL,
  [CRITERIO_LEVELS.NODO_ARBOL]: CRITERIO_LEVELS.NODO_ARBOL,
  [CRITERIO_LEVELS.GRUPO_AFINIDAD]: CRITERIO_LEVELS.MOP,
  [CRITERIO_LEVELS.MOP]: CRITERIO_LEVELS.DP,
};

export const CHILD_LABEL = {
  [CRITERIO_LEVELS.OMOE]: 'nodo',
  [CRITERIO_LEVELS.NODO_ARBOL]: 'nodo hijo',
  [CRITERIO_LEVELS.GRUPO_AFINIDAD]: MOP_LABEL,
  [CRITERIO_LEVELS.MOP]: DP_LABEL,
};

export function getDeleteConfirmMessage(level, nombre) {
  const n = nombre || 'este elemento';
  const labels = {
    [CRITERIO_LEVELS.OMOE]: `¿Eliminar la dimensión «${n}» y todo su árbol?`,
    [CRITERIO_LEVELS.NODO_ARBOL]: `¿Eliminar el nodo «${n}» y sus descendientes?`,
    [CRITERIO_LEVELS.MISION]: `¿Eliminar la misión «${n}» y sus descendientes?`,
    [CRITERIO_LEVELS.GRUPO_AFINIDAD]: `¿Eliminar el grupo de afinidad «${n}» y sus MOPs y DPs?`,
    [CRITERIO_LEVELS.MOP]: `¿Eliminar el MOP «${n}» y sus DPs?`,
    [CRITERIO_LEVELS.DP]: `¿Eliminar el DP «${n}»?`,
  };
  return labels[level] || `¿Eliminar «${n}»?`;
}

export function getDeleteModalTitle(level) {
  const t = {
    [CRITERIO_LEVELS.OMOE]: `Eliminar ${MODELO_LABEL}`,
    [CRITERIO_LEVELS.NODO_ARBOL]: 'Eliminar nodo',
    [CRITERIO_LEVELS.MISION]: `Eliminar ${MISION_LABEL}`,
    [CRITERIO_LEVELS.GRUPO_AFINIDAD]: `Eliminar ${GRUPO_AFINIDAD_LABEL}`,
    [CRITERIO_LEVELS.MOP]: `Eliminar ${MOP_LABEL}`,
    [CRITERIO_LEVELS.DP]: `Eliminar ${DP_LABEL}`,
  };
  return t[level] || 'Eliminar';
}

export function usesFlexibleTree(omoe) {
  if (Array.isArray(omoe?.nodos)) return true;
  return false;
}

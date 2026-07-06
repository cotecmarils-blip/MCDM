import { CRITERIO_LEVELS, CHILDREN_KEY, CHILD_LEVEL } from './constants';
import { effectiveOmoeRama } from './ramaContext';

export function getNodeChildren(level, node) {
  const key = CHILDREN_KEY[level];
  return key ? node[key] || [] : [];
}

function walkNodos(nodos, targetLevel, targetId, parentMeta) {
  for (const node of nodos || []) {
    const nodeLevel = node.nivel || CRITERIO_LEVELS.NODO_ARBOL;
    if (nodeLevel === targetLevel && String(node.id) === String(targetId)) {
      return { node, ...parentMeta };
    }
    const children = node.hijos || [];
    const found = walkNodos(children, targetLevel, targetId, {
      parentId: node.id,
      siblings: children,
      parentLevel: CRITERIO_LEVELS.NODO_ARBOL,
      parentNode: node,
    });
    if (found) return found;
  }
  return null;
}

export function findNodeInForest(forest, level, id) {
  if (!forest?.length || !level || id == null) return null;

  const walkLegacy = (nodes, currentLevel, parentMeta = {}) => {
    for (const node of nodes) {
      const nodeLevel = node.nivel || currentLevel;
      if (nodeLevel === level && String(node.id) === String(id)) {
        return { node, ...parentMeta };
      }
      const childLevel = CHILD_LEVEL[currentLevel];
      if (!childLevel) continue;
      const children = getNodeChildren(currentLevel, node);
      const found = walkLegacy(children, childLevel, {
        parentId: node.id,
        siblings: children,
        parentLevel: currentLevel,
        parentNode: node,
      });
      if (found) return found;
    }
    return null;
  };

  for (const omoe of forest) {
    if (level === CRITERIO_LEVELS.OMOE && String(omoe.id) === String(id)) {
      return { node: omoe, siblings: forest, parentId: null };
    }

    if (omoe.nodos?.length) {
      const found = walkNodos(omoe.nodos, level, id, {
        parentId: omoe.id,
        siblings: omoe.nodos,
        parentLevel: CRITERIO_LEVELS.OMOE,
        parentNode: omoe,
      });
      if (found) return found;
      continue;
    }

    const found = walkLegacy(omoe.grupos || [], CRITERIO_LEVELS.GRUPO_AFINIDAD, {
      parentId: omoe.id,
      siblings: omoe.grupos || [],
      parentLevel: CRITERIO_LEVELS.OMOE,
      parentNode: omoe,
    });
    if (found) return found;
  }
  return null;
}

function findOmoeRoot(forest, level, id) {
  if (!forest?.length || id == null) return null;
  for (const omoe of forest) {
    if (level === CRITERIO_LEVELS.OMOE && String(omoe.id) === String(id)) {
      return omoe;
    }
    if (findNodeInForest([omoe], level, id)) {
      return omoe;
    }
  }
  return null;
}

export function resolveEditSelection(forest, level, id) {
  const hit = findNodeInForest(forest, level, id);
  if (!hit) return { mode: 'empty' };
  const omoeRoot = findOmoeRoot(forest, level, id);
  return {
    mode: 'edit',
    level,
    node: hit.node,
    siblings: hit.siblings,
    parentId: hit.parentId,
    parentLevel: hit.parentLevel,
    parentNode: hit.parentNode,
    dimensionRama: omoeRoot ? effectiveOmoeRama(omoeRoot) : undefined,
    tipoNivelId: hit.node?.tipo_nivel,
    tipoNivelNombre: hit.node?.tipo_nivel_nombre,
  };
}

export function getParentLabel(parentLevel, parentNode) {
  if (!parentNode) return null;
  const nombre =
    parentNode.nombre ||
    parentNode.nombre_display ||
    parentNode.nombre_modelo ||
    parentNode.nombre_mision;
  if (parentLevel === CRITERIO_LEVELS.NODO_ARBOL) {
    return `Nodo padre: ${nombre}`;
  }
  if (parentLevel === CRITERIO_LEVELS.OMOE) {
    return `Dimensión padre: ${nombre}`;
  }
  return `Padre: ${nombre}`;
}

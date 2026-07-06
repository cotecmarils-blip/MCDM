import { CRITERIO_LEVELS, getNodoTipoLabel, CHILDREN_KEY, CHILD_LEVEL } from './constants';
import { effectiveOmoeRama } from './ramaContext';
import { isTerminalCriterioNode } from './terminalUtils';
import { nodeName, paramsSummary } from './conceptMapUtils';

function familiaLabel(node) {
  const f = (node.familia_funciones || '').trim();
  if (!f) return null;
  return f.replace(/_/g, ' ');
}

function walkNodosArbol(nodos, omoe, path, depth, out) {
  (nodos || []).forEach((node) => {
    const level = node.nivel || CRITERIO_LEVELS.NODO_ARBOL;
    const nombre = nodeName(node);
    const hijos = node.hijos || [];
    const isLeaf = !hijos.length;
    out.push({
      level,
      node,
      depth,
      omoeId: omoe.id,
      omoeNombre: nodeName(omoe),
      path: [...path, nombre],
      nombre,
      peso: node.peso,
      isLeaf,
      isTerminal: isTerminalCriterioNode(level, node),
      familia: familiaLabel(node),
      constantes: paramsSummary(node),
      tipoLabel: getNodoTipoLabel(node),
    });
    if (hijos.length) {
      walkNodosArbol(hijos, omoe, [...path, nombre], depth + 1, out);
    }
  });
}

function walkLegacy(nodes, level, omoe, path, depth, out) {
  (nodes || []).forEach((node) => {
    const nodeLevel = node.nivel || level;
    const nombre = nodeName(node);
    const childLevel = CHILD_LEVEL[nodeLevel];
    const childKey = CHILDREN_KEY[nodeLevel];
    const children = childKey ? node[childKey] || [] : [];
    const isLeaf = isTerminalCriterioNode(nodeLevel, node);
    out.push({
      level: nodeLevel,
      node,
      depth,
      omoeId: omoe.id,
      omoeNombre: nodeName(omoe),
      path: [...path, nombre],
      nombre,
      peso: node.peso,
      isLeaf,
      isTerminal: isLeaf,
      familia: familiaLabel(node),
      constantes: paramsSummary(node),
      tipoLabel: nodeLevel,
    });
    if (children.length && childLevel) {
      walkLegacy(children, childLevel, omoe, [...path, nombre], depth + 1, out);
    }
  });
}

/** Lista plana de todos los nodos del bosque para la vista Desglose. */
export function buildDesgloseEntries(forest) {
  const entries = [];
  (forest || []).forEach((omoe) => {
    const omoeNombre = nodeName(omoe);
    const isOmoeTerminal = !(omoe.nodos?.length) && isTerminalCriterioNode(CRITERIO_LEVELS.OMOE, omoe);
    entries.push({
      level: CRITERIO_LEVELS.OMOE,
      node: omoe,
      depth: 0,
      omoeId: omoe.id,
      omoeNombre,
      path: [omoeNombre],
      nombre: omoeNombre,
      peso: null,
      isLeaf: isOmoeTerminal,
      isTerminal: isOmoeTerminal,
      familia: familiaLabel(omoe),
      constantes: paramsSummary(omoe),
      tipoLabel: effectiveOmoeRama(omoe)?.toUpperCase() || 'DIM',
    });
    if (omoe.nodos?.length) {
      walkNodosArbol(omoe.nodos, omoe, [omoeNombre], 1, entries);
    } else if (omoe.grupos?.length) {
      walkLegacy(omoe.grupos, CRITERIO_LEVELS.GRUPO_AFINIDAD, omoe, [omoeNombre], 1, entries);
    }
  });
  return entries;
}

/** Cantidad de hojas evaluables en el bosque (sin hijos en el árbol). */
export function countTerminalNodes(forest) {
  return buildDesgloseEntries(forest).filter((entry) => entry.isTerminal).length;
}

/** Nodos terminales de una sola dimensión (OMOE). */
export function terminalNodesForOmoe(omoe) {
  if (!omoe) return { count: 0, nodes: [] };

  const nodes = buildDesgloseEntries([omoe])
    .filter((entry) => entry.isTerminal)
    .map((entry) => ({
      id: entry.node.id,
      level: entry.level,
      nombre: entry.nombre,
      tipoLabel: entry.tipoLabel,
    }));

  return { count: nodes.length, nodes };
}

/** Nodos terminales agrupados por dimensión (OMOE). */
export function terminalNodesByDimension(forest) {
  const groups = new Map();

  buildDesgloseEntries(forest)
    .filter((entry) => entry.isTerminal)
    .forEach((entry) => {
      if (!groups.has(entry.omoeId)) {
        groups.set(entry.omoeId, {
          omoeId: entry.omoeId,
          omoeNombre: entry.omoeNombre,
          nodes: [],
        });
      }
      groups.get(entry.omoeId).nodes.push({
        id: entry.node.id,
        level: entry.level,
        nombre: entry.nombre,
        tipoLabel: entry.tipoLabel,
      });
    });

  return Array.from(groups.values())
    .map((group) => ({ ...group, count: group.nodes.length }))
    .sort((a, b) => a.omoeNombre.localeCompare(b.omoeNombre, 'es'));
}

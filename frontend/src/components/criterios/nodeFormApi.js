import {
  omoeApi,
  misionesApi,
  gruposAfinidadApi,
  mopsCriterioApi,
  dpsCriterioApi,
  nodoArbolApi,
} from '../../api';
import { CRITERIO_LEVELS } from './constants';

export const NODE_API = {
  [CRITERIO_LEVELS.OMOE]: omoeApi,
  [CRITERIO_LEVELS.NODO_ARBOL]: nodoArbolApi,
  [CRITERIO_LEVELS.MISION]: misionesApi,
  [CRITERIO_LEVELS.GRUPO_AFINIDAD]: gruposAfinidadApi,
  [CRITERIO_LEVELS.MOP]: mopsCriterioApi,
  [CRITERIO_LEVELS.DP]: dpsCriterioApi,
};

export function getNodeApi(level) {
  return NODE_API[level] || null;
}

export function buildCreateContext(
  level,
  { proyectoId, parentId, parentLevel, parentNode, tipoNivelId }
) {
  if (level === CRITERIO_LEVELS.OMOE) {
    return { proyecto: proyectoId };
  }
  if (level === CRITERIO_LEVELS.NODO_ARBOL) {
    const payload = { tipo_nivel: tipoNivelId };
    if (parentLevel === CRITERIO_LEVELS.OMOE) {
      payload.omoe = parentId;
      return payload;
    }
    payload.parent_id = parentId;
    payload.omoe = parentNode?.omoe ?? parentNode?.omoe_id;
    return payload;
  }
  if (parentId != null) {
    return { parent_id: parentId };
  }
  return {};
}

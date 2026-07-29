/** Aplica configuración por escenario (peso, activo) al árbol en memoria para visualización. */

export function buildConfigMapFromArbolPayload(payload) {
  const map = {};
  for (const n of payload?.nodos || []) {
    map[n.nodo_id] = {
      peso: n.peso,
      aplica: n.aplica !== false,
      tipo_criterio: n.tipo_criterio || '',
      familia_funciones: n.familia_funciones || '',
      parametros_funcion: n.parametros_funcion || {},
      es_terminal: Boolean(n.es_terminal),
    };
  }
  return map;
}

export function buildGruposPesoFromArbolPayload(payload) {
  return payload?.grupos_peso || {};
}

function applyEscenarioToNodo(node, configMap) {
  if (!node?.id || !configMap?.[node.id]) {
    return {
      ...node,
      aplica: node.aplica !== false,
    };
  }
  const c = configMap[node.id];
  return {
    ...node,
    peso: c.peso,
    aplica: c.aplica,
    // Utilidad efectiva del escenario (para formulario e indicadores).
    tipo_criterio: c.tipo_criterio || node.tipo_criterio || '',
    familia_funciones: c.familia_funciones || node.familia_funciones || '',
    parametros_funcion: (
      c.parametros_funcion
      && typeof c.parametros_funcion === 'object'
      && Object.keys(c.parametros_funcion).length
    )
      ? c.parametros_funcion
      : (node.parametros_funcion || {}),
    es_terminal_escenario: c.es_terminal,
  };
}

function walkNodos(nodos, configMap) {
  return (nodos || []).map((n) => ({
    ...applyEscenarioToNodo(n, configMap),
    hijos: walkNodos(n.hijos, configMap),
  }));
}

export function patchNodeInConfigByOmoe(configByOmoe, omoeId, nodoId, patch) {
  const prev = configByOmoe?.[omoeId] || {};
  const cur = prev[nodoId] || {};
  return {
    ...configByOmoe,
    [omoeId]: {
      ...prev,
      [nodoId]: {
        ...cur,
        peso: patch.peso ?? cur.peso ?? 0,
        aplica: patch.aplica !== undefined ? patch.aplica : cur.aplica !== false,
        tipo_criterio:
          patch.tipo_criterio !== undefined ? patch.tipo_criterio : (cur.tipo_criterio || ''),
        familia_funciones:
          patch.familia_funciones !== undefined
            ? patch.familia_funciones
            : (cur.familia_funciones || ''),
        parametros_funcion:
          patch.parametros_funcion !== undefined
            ? patch.parametros_funcion
            : (cur.parametros_funcion || {}),
        es_terminal:
          patch.es_terminal !== undefined ? patch.es_terminal : Boolean(cur.es_terminal),
      },
    },
  };
}

export function enrichForestWithEscenario(forest, configByOmoe) {
  if (!forest?.length || !configByOmoe) return forest || [];
  return forest.map((omoe) => {
    const configMap = configByOmoe[omoe.id];
    if (!configMap) return omoe;
    return {
      ...omoe,
      nodos: walkNodos(omoe.nodos, configMap),
    };
  });
}

/** Aplica configuración por escenario (peso, activo) al árbol en memoria para visualización. */

export function buildConfigMapFromArbolPayload(payload) {
  const map = {};
  for (const n of payload?.nodos || []) {
    map[n.nodo_id] = {
      peso: n.peso,
      aplica: n.aplica !== false,
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
  return {
    ...configByOmoe,
    [omoeId]: {
      ...prev,
      [nodoId]: {
        peso: patch.peso ?? prev[nodoId]?.peso ?? 0,
        aplica: patch.aplica !== undefined ? patch.aplica : prev[nodoId]?.aplica !== false,
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

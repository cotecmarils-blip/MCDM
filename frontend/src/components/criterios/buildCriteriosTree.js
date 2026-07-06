/** Normaliza la respuesta del API de dimensiones. */
export function normalizeOmoeForest(data) {
  return (Array.isArray(data) ? data : []).map((omoe) => {
    const nodos = omoe.nodos || [];
    if (nodos.length) {
      return { ...omoe, nodos };
    }
    const direct = omoe.grupos || [];
    const legacy = (omoe.misiones || []).flatMap((m) => m.grupos || []);
    return {
      ...omoe,
      grupos: direct.length ? direct : legacy,
    };
  });
}

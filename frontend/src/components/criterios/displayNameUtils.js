/** Nombre visible de un nodo del árbol de criterios. */
export function getCriterioDisplayName(node) {
  if (!node) return '';
  return (
    node.nombre
    || node.nombre_display
    || node.nombre_modelo
    || node.nombre_mision
    || node.nombre_grupo
    || node.nombre_mop
    || node.nombre_dp
    || ''
  );
}

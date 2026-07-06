export const REQUISITO_PRIORIDAD_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

export const REQUISITO_ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'revision', label: 'En revisión' },
  { value: 'validado', label: 'Validado' },
  { value: 'implantado', label: 'Implantado' },
];

export function emptyRequisitoFormState() {
  return {
    codigo: '',
    titulo: '',
    descripcion: '',
    categoria: '',
    prioridad: 'media',
    estado: 'pendiente',
    criterio_aceptacion: '',
    observaciones: '',
    orden: '',
  };
}

export function requisitoToFormState(requisito) {
  if (!requisito) return emptyRequisitoFormState();
  return {
    codigo: requisito.codigo || '',
    titulo: requisito.titulo || '',
    descripcion: requisito.descripcion || '',
    categoria: requisito.categoria || '',
    prioridad: requisito.prioridad || 'media',
    estado: requisito.estado || 'pendiente',
    criterio_aceptacion: requisito.criterio_aceptacion || '',
    observaciones: requisito.observaciones || '',
    orden: requisito.orden ?? '',
  };
}

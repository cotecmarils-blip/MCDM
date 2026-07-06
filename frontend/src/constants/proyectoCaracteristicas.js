/** Campos de características generales del buque (proyecto). */

export const CARACTERISTICAS_GENERALES_FIELDS = [

  { name: 'eslora_maxima', label: 'Eslora máxima (m)' },

  { name: 'desplazamiento', label: 'Desplazamiento (t)' },

  { name: 'velocidad_maxima', label: 'Velocidad máxima (Kn)' },

  { name: 'velocidad_crucero', label: 'Velocidad crucero (Kn)' },

  { name: 'tripulacion', label: 'Tripulación (tripulantes)' },

  { name: 'autonomia', label: 'Autonomía (días)' },

  { name: 'propulsion', label: 'Propulsión' },

  {

    name: 'posicionamiento_dinamico',

    label: 'Sistema de Posicionamiento Dinámico',

  },

];



export const OTRAS_CARACTERISTICAS_PLACEHOLDER = ``;



export function emptyProyectoFormState() {

  return {

    nombre: '',

    descripcion: '',

    foto: null,

    eslora_maxima: '',

    desplazamiento: '',

    velocidad_maxima: '',

    velocidad_crucero: '',

    tripulacion: '',

    autonomia: '',

    propulsion: '',

    posicionamiento_dinamico: '',

    laboratorios: '',

    otras_caracteristicas: '',

  };

}



export function proyectoToFormState(proyecto) {

  if (!proyecto) return emptyProyectoFormState();

  return {

    nombre: proyecto.nombre || '',

    descripcion: proyecto.descripcion || '',

    foto: null,

    eslora_maxima: proyecto.eslora_maxima || '',

    desplazamiento: proyecto.desplazamiento || '',

    velocidad_maxima: proyecto.velocidad_maxima || '',

    velocidad_crucero: proyecto.velocidad_crucero || '',

    tripulacion: proyecto.tripulacion || '',

    autonomia: proyecto.autonomia || '',

    propulsion: proyecto.propulsion || '',

    posicionamiento_dinamico: proyecto.posicionamiento_dinamico || '',

    laboratorios: proyecto.laboratorios || '',

    otras_caracteristicas: proyecto.otras_caracteristicas || '',

  };

}



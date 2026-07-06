import { validatePesosDimensionesPercent } from '../../utils/pesoUtils';

export const WIZARD_STEPS = [
  {
    id: 'nombre',
    title: 'Nombre',
    subtitle: 'Identifique este cálculo en el historial',
  },
  {
    id: 'direcciones',
    title: 'MIN / MAX',
    subtitle: 'Si en cada dimensión mayor o menor es mejor (requerido para Pareto)',
  },
  {
    id: 'pareto',
    title: 'Pareto',
    subtitle: '¿Filtrar alternativas dominadas?',
  },
  {
    id: 'normalizacion',
    title: 'Normalización',
    subtitle: 'Qué dimensiones escalar y con qué método',
  },
  {
    id: 'pesos',
    title: 'Pesos',
    subtitle: 'Ponderación entre dimensiones',
  },
  {
    id: 'madm',
    title: 'Ranking',
    subtitle: 'Método MADM final',
  },
  {
    id: 'resumen',
    title: 'Resumen',
    subtitle: 'Revise el proceso y ejecute',
  },
];

export const WIZARD_PIPELINE_FOCUS = {
  nombre: 'entrada',
  direcciones: 'entrada',
  pareto: 'pareto',
  normalizacion: 'normalizacion',
  pesos: 'pesos',
  madm: 'madm',
  resumen: null,
};

export function buildPreviewPayload(calcConfig, dimCount = 0) {
  if (!calcConfig) return null;

  const payload = {
    direcciones: calcConfig.direcciones || {},
    dimensiones_normalizar: calcConfig.dimensiones_normalizar || [],
  };

  if (calcConfig.aplicar_pareto !== null && calcConfig.aplicar_pareto !== undefined) {
    payload.aplicar_pareto = calcConfig.aplicar_pareto;
  }
  if (calcConfig.normalizacion_metodo) {
    payload.normalizacion_metodo = calcConfig.normalizacion_metodo;
  }
  if (calcConfig.metodo_pesos) {
    payload.metodo_pesos = calcConfig.metodo_pesos;
  }
  if (calcConfig.metodo_madm) {
    payload.metodo_madm = calcConfig.metodo_madm;
  }
  if (calcConfig.metodo_pesos === 'user_defined_weights') {
    payload.pesos_usuario = Array.from({ length: dimCount }, (_, idx) => {
      const raw = (calcConfig.pesos_usuario || [])[idx];
      if (raw === '' || raw == null) return 0;
      const n = Number(String(raw).replace(',', '.'));
      return Number.isNaN(n) ? 0 : n;
    });
  }

  return payload;
}

export function createEmptyCalcConfig(dimensiones = []) {
  const dirs = {};
  dimensiones.forEach((d) => {
    dirs[d.omoe_id] = d.direction || 'max';
  });
  return {
    nombre_calculo: '',
    solo_matriz: false,
    aplicar_pareto: null,
    normalizacion_metodo: '',
    dimensiones_normalizar: dimensiones.map((d) => d.nombre),
    direcciones: dirs,
    metodo_pesos: '',
    metodo_madm: '',
    pesos_usuario: dimensiones.map(() => ''),
  };
}

export function validateWizardStep(stepId, config, opcionesMeta) {
  const dimCount = opcionesMeta?.dimensiones?.length || 0;

  switch (stepId) {
    case 'nombre':
      if (!config?.nombre_calculo?.trim()) {
        return { ok: false, message: 'Escriba un nombre para el cálculo.' };
      }
      return { ok: true };

    case 'direcciones': {
      const dims = opcionesMeta?.dimensiones || [];
      for (const d of dims) {
        const dir = config.direcciones?.[d.omoe_id] ?? config.direcciones?.[String(d.omoe_id)];
        if (!dir) {
          return { ok: false, message: `Defina MIN/MAX para la dimensión «${d.nombre}».` };
        }
      }
      return { ok: true };
    }

    case 'pareto':
      if (config?.aplicar_pareto === null || config?.aplicar_pareto === undefined) {
        return { ok: false, message: 'Seleccione si desea aplicar el filtro Pareto.' };
      }
      return { ok: true };

    case 'normalizacion':
      if (!config?.dimensiones_normalizar?.length) {
        return { ok: false, message: 'Seleccione al menos una dimensión para normalizar.' };
      }
      if (!config?.normalizacion_metodo) {
        return { ok: false, message: 'Seleccione un método de normalización.' };
      }
      return { ok: true };

    case 'dimensiones':
      // legacy id — misma validación que normalización (dims)
      if (!config?.dimensiones_normalizar?.length) {
        return { ok: false, message: 'Seleccione al menos una dimensión para normalizar.' };
      }
      return { ok: true };

    case 'pesos':
      if (!config?.metodo_pesos) {
        return { ok: false, message: 'Seleccione un método de cálculo de pesos.' };
      }
      if (config.metodo_pesos === 'user_defined_weights') {
        const check = validatePesosDimensionesPercent(config.pesos_usuario, dimCount);
        if (!check.ok) {
          return { ok: false, message: check.message || 'Los pesos deben sumar 100 %.' };
        }
      }
      return { ok: true };

    case 'madm':
      if (!config?.metodo_madm) {
        return { ok: false, message: 'Seleccione un método MADM de ranking.' };
      }
      return { ok: true };

    case 'resumen':
      for (const step of WIZARD_STEPS.slice(0, -1)) {
        const v = validateWizardStep(step.id, config, opcionesMeta);
        if (!v.ok) return v;
      }
      return { ok: true };

    default:
      return { ok: true };
  }
}

export function buildConfigSummary(config, opcionesMeta) {
  const dimensiones = opcionesMeta?.dimensiones || [];
  const normLabel = opcionesMeta?.normalization_methods?.find(
    (m) => m.value === config.normalizacion_metodo,
  )?.label;
  const pesoLabel = opcionesMeta?.weight_methods?.find(
    (m) => m.value === config.metodo_pesos,
  )?.label;
  const madmLabel = opcionesMeta?.madm_methods?.find(
    (m) => m.value === config.metodo_madm,
  )?.label;

  return [
    { label: 'Nombre', value: config.nombre_calculo?.trim() || '—' },
    {
      label: 'Direcciones MIN/MAX',
      value:
        dimensiones.length > 0
          ? dimensiones
              .map((d) => {
                const dir =
                  config.direcciones?.[d.omoe_id] ??
                  config.direcciones?.[String(d.omoe_id)] ??
                  d.direction ??
                  'max';
                return `${d.nombre}: ${dir === 'min' ? 'MIN' : 'MAX'}`;
              })
              .join(' · ')
          : '—',
    },
    {
      label: 'Filtro Pareto',
      value:
        config.aplicar_pareto === null
          ? '—'
          : config.aplicar_pareto
            ? 'Sí — solo no dominadas'
            : 'No — todas las alternativas',
    },
    {
      label: 'Dimensiones a normalizar',
      value:
        config.dimensiones_normalizar?.length > 0
          ? config.dimensiones_normalizar.join(', ')
          : '—',
    },
    { label: 'Método normalización', value: normLabel || config.normalizacion_metodo || '—' },
    { label: 'Pesos', value: pesoLabel || config.metodo_pesos || '—' },
    { label: 'Ranking MADM', value: madmLabel || config.metodo_madm || '—' },
  ];
}

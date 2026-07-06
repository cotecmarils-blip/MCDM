const PASSWORD_MESSAGE_MAP = [
  { match: /too common/i, text: 'La contraseña es demasiado común. Elija una más segura y difícil de adivinar.' },
  { match: /too short/i, text: 'La contraseña es muy corta. Debe tener al menos 8 caracteres.' },
  { match: /entirely numeric/i, text: 'La contraseña no puede estar formada solo por números.' },
  { match: /too similar/i, text: 'La contraseña es muy parecida al nombre de usuario. Elija otra.' },
];

const FIELD_LABELS = {
  username: 'Usuario',
  email: 'Correo',
  password: 'Contraseña',
  rol: 'Rol',
  dias_acceso: 'Duración del acceso',
  horas_acceso: 'Duración del acceso',
  minutos_acceso: 'Duración del acceso',
};

function normalizeText(value) {
  if (Array.isArray(value)) return normalizeText(value[0]);
  if (value && typeof value === 'object') return normalizeText(value.detail || value.message);
  return typeof value === 'string' ? value : null;
}

function friendlyPasswordMessage(text) {
  if (!text) return null;
  const found = PASSWORD_MESSAGE_MAP.find(({ match }) => match.test(text));
  return found?.text || null;
}

function friendlyFieldMessage(field, text) {
  const passwordMsg = field === 'password' || field === 'non_field_errors'
    ? friendlyPasswordMessage(text)
    : null;
  if (passwordMsg) return passwordMsg;

  if (field === 'non_field_errors') {
    return friendlyPasswordMessage(text) || text;
  }

  const label = FIELD_LABELS[field] || field;
  return `${label}: ${text}`;
}

/**
 * Extrae un mensaje legible desde la respuesta de error de la API.
 */
export function getApiErrorMessage(data, fallback = 'Ocurrió un error. Intente de nuevo.') {
  if (!data) return fallback;
  if (typeof data === 'string') return data;

  const priorityFields = [
    'password',
    'email',
    'username',
    'rol',
    'dias_acceso',
    'detail',
    'non_field_errors',
  ];

  for (const field of priorityFields) {
    const text = normalizeText(data[field]);
    if (text) {
      if (field === 'password') {
        return friendlyPasswordMessage(text) || text;
      }
      if (field === 'detail') return text;
      if (field === 'non_field_errors') {
        return friendlyPasswordMessage(text) || text;
      }
      return friendlyFieldMessage(field, text);
    }
  }

  const entries = Object.entries(data);
  if (entries.length > 0) {
    const [field, value] = entries[0];
    const text = normalizeText(value);
    if (text) return friendlyFieldMessage(field, text);
  }

  return fallback;
}

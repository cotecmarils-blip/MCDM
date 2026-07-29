import React, { useEffect, useState } from 'react';

/**
 * Input de porcentaje que no rompe decimales a mitad de escritura.
 * Guarda texto mientras se edita; emite número (o '') al padre.
 */
export function sanitizePercentTyping(raw) {
  const s = String(raw ?? '').replace(',', '.');
  if (s === '') return '';
  // Solo dígitos y a lo sumo un punto.
  if (!/^\d*\.?\d*$/.test(s)) return null;
  return s;
}

export function parsePercentDraft(raw) {
  const s = sanitizePercentTyping(raw);
  if (s === null) return { ok: false };
  if (s === '' || s === '.') return { ok: true, draft: s === '.' ? '0.' : s, value: '' };
  if (s.endsWith('.')) return { ok: true, draft: s, value: s }; // mantener string parcial
  const n = Number(s);
  if (Number.isNaN(n)) return { ok: false };
  return { ok: true, draft: s, value: n };
}

function displayFromValue(value) {
  if (value === '' || value == null) return '';
  if (typeof value === 'string') return value.replace(',', '.');
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Evitar 20.3000000001; conservar enteros sin decimales forzados.
    return String(value);
  }
  return '';
}

export default function PercentInput({
  value,
  onChange,
  onBlur,
  disabled = false,
  className = '',
  min = 0,
  max = 100,
  placeholder = '',
  id,
  name,
  'aria-label': ariaLabel,
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => displayFromValue(value));

  useEffect(() => {
    if (!focused) {
      setDraft(displayFromValue(value));
    }
  }, [value, focused]);

  const emit = (nextValue) => {
    onChange?.(nextValue);
  };

  const handleChange = (e) => {
    const cleaned = sanitizePercentTyping(e.target.value);
    if (cleaned === null) return;
    setDraft(cleaned);

    if (cleaned === '' || cleaned === '.') {
      emit('');
      return;
    }
    if (cleaned.endsWith('.')) {
      // No convertir aún: el padre debe aceptar string (p.ej. "20.").
      emit(cleaned);
      return;
    }
    const n = Number(cleaned);
    if (Number.isNaN(n)) return;
    // Permitir tipear por encima temporalmente; clamp suave solo si claramente fuera
    // no bloqueamos >max durante escritura (validación al guardar).
    emit(n);
  };

  const handleBlur = (e) => {
    setFocused(false);
    const cleaned = sanitizePercentTyping(draft);
    if (cleaned === null || cleaned === '' || cleaned === '.') {
      setDraft('');
      emit('');
      onBlur?.(e);
      return;
    }
    let n = Number(cleaned.replace(/\.$/, ''));
    if (Number.isNaN(n)) {
      setDraft(displayFromValue(value));
      onBlur?.(e);
      return;
    }
    if (typeof min === 'number' && n < min) n = min;
    if (typeof max === 'number' && n > max) n = max;
    setDraft(String(n));
    emit(n);
    onBlur?.(e);
  };

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={focused ? draft : displayFromValue(value)}
      onFocus={() => {
        setFocused(true);
        setDraft(displayFromValue(value));
      }}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

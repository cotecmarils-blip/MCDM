export function parsePesoPercent(value) {
  if (value === '' || value == null) return NaN;
  const n = Number(String(value).replace(',', '.'));
  return Number.isNaN(n) ? NaN : n;
}

export function sumPesosPercent(values) {
  const cents = values.reduce((acc, v) => {
    const n = typeof v === 'number' ? v : parsePesoPercent(v);
    if (Number.isNaN(n)) return acc;
    return acc + Math.round(n * 100);
  }, 0);
  return cents / 100;
}

export function validatePesosDimensionesPercent(pesosUsuario, dimensionCount) {
  if (!dimensionCount) {
    return { ok: true, total: 0, values: [], message: null };
  }

  const raw = pesosUsuario || [];
  const values = [];
  let incomplete = false;

  for (let i = 0; i < dimensionCount; i += 1) {
    const entry = raw[i];
    if (entry === '' || entry == null) {
      incomplete = true;
      continue;
    }
    const n = parsePesoPercent(entry);
    if (Number.isNaN(n)) {
      return {
        ok: false,
        total: 0,
        values: [],
        message: 'Los pesos deben ser números válidos.',
      };
    }
    if (n < 0 || n > 100.0001) {
      return {
        ok: false,
        total: sumPesosPercent(values),
        values,
        message: 'Cada peso debe estar entre 0 y 100 %.',
      };
    }
    values.push(n);
  }

  if (incomplete || values.length < dimensionCount) {
    return {
      ok: false,
      total: sumPesosPercent(values),
      values,
      message: 'Indique el peso (%) de cada dimensión.',
    };
  }

  const total = sumPesosPercent(values);
  if (Math.abs(total - 100) > 0.05) {
    return {
      ok: false,
      total,
      values,
      message: `Los pesos deben sumar 100 % (actual: ${total.toFixed(2)} %).`,
    };
  }

  return { ok: true, total, values, message: null };
}

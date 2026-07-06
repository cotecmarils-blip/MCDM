import React from 'react';

function formatFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function calculoNombre(item) {
  return item.nombre || item.titulo || `Cálculo #${item.id}`;
}

function SimulacionHistorialSidebar({
  items,
  selectedId,
  loading,
  onSelect,
  onDelete,
  canDelete,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10 px-3">
        Sin cálculos guardados. Pulse <strong>Nuevo cálculo</strong> y asigne un nombre.
      </p>
    );
  }

  return (
    <ul className="p-1.5 space-y-1">
      {items.map((item) => {
        const isActive = selectedId === item.id;
        const nombre = calculoNombre(item);
        return (
          <li key={item.id}>
            <div
              className={`group flex items-stretch gap-1 rounded-lg border transition ${
                isActive
                  ? 'border-navy-500/50 bg-navy-500/10 dark:bg-navy-500/20'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-navy-800/40'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="flex-1 min-w-0 text-left px-2.5 py-2"
              >
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate" title={nombre}>
                  {nombre}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatFecha(item.fecha_creacion)}
                </p>
                {item.resumen_opciones && (
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate" title={item.resumen_opciones}>
                    {item.resumen_opciones}
                  </p>
                )}
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                  className="shrink-0 px-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition self-center"
                  title="Eliminar cálculo"
                  aria-label={`Eliminar ${nombre}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default SimulacionHistorialSidebar;

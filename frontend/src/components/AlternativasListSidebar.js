import React from 'react';
import { formatCosto } from '../utils/media';

function AlternativasListSidebar({
  items,
  selectedId,
  isNew,
  onSelect,
  onNew,
  loading,
  canCreate = true,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {canCreate && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700/60">
          <button
            type="button"
            onClick={onNew}
            className="btn w-full btn-primary text-sm"
          >
            + Nueva alternativa
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 px-2">
            No hay alternativas. Crea la primera.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = selectedId === item.id;
              const costo = formatCosto(item.costo, item.costo_unidad);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-navy-500/[0.12] dark:from-navy-500/[0.24] to-navy-500/[0.04] text-navy-600 dark:text-navy-400'
                        : 'text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-navy-800/40'
                    }`}
                  >
                    <span className="font-medium text-sm block truncate">{item.nombre}</span>
                    {costo && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{costo}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AlternativasListSidebar;

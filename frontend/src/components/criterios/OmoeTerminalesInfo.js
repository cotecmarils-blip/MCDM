import React, { useMemo } from 'react';
import { terminalNodesForOmoe } from './desgloseUtils';

function OmoeTerminalesInfo({ omoe, compact = false }) {
  const { count, nodes } = useMemo(() => terminalNodesForOmoe(omoe), [omoe]);

  return (
    <div
      className={`rounded-lg border border-gray-200/80 dark:border-navy-700/60 bg-gray-50/80 dark:bg-navy-900/40 border-t-2 border-t-navy-500/20 ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-medium text-gray-700 dark:text-gray-200 ${compact ? 'text-xs' : 'text-sm'}`}>
          Nodos terminales
        </span>
        <span className={`tabular-nums font-bold text-navy-600 dark:text-navy-300 ${compact ? 'text-sm' : 'text-base'}`}>
          {count}
        </span>
      </div>
      <p className={`text-gray-500 dark:text-gray-400 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        Hojas evaluables bajo esta dimensión (sin hijos en el árbol).
      </p>

      {count > 0 && (
        <ul className={`mt-2 space-y-0.5 max-h-48 overflow-y-auto ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {nodes.map((node) => (
            <li
              key={`${node.level}-${node.id}`}
              className="text-gray-600 dark:text-gray-400 flex items-baseline gap-1.5"
            >
              <span className="shrink-0 uppercase text-[9px] font-bold text-gray-400 dark:text-gray-500">
                {node.tipoLabel}
              </span>
              <span className="truncate" title={node.nombre}>
                {node.nombre}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OmoeTerminalesInfo;

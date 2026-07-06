import React, { useState } from 'react';
import { formatValor, traceNodeKey } from './simulacionTraceUtils';

function PiramideNode({ item, selectedKey, onSelect, defaultOpen = true }) {
  const node = item.trace || item;
  const key = traceNodeKey(node, item._parentKey);
  const hasChildren = (node.hijos || []).length > 0;
  const [open, setOpen] = useState(defaultOpen);
  const isSelected = selectedKey === key;
  const isLeaf = node.kind === 'leaf';
  const isDimension = node.kind === 'dimension';

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={() => onSelect(node, key)}
        className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
          isSelected
            ? 'bg-navy-500/15 ring-1 ring-navy-500/40'
            : 'hover:bg-gray-50 dark:hover:bg-navy-800/40'
        }`}
        style={{ paddingLeft: `${8 + item.depth * 14}px` }}
      >
        {hasChildren ? (
          <span
            role="presentation"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 text-[10px]"
          >
            {open ? '▼' : '▶'}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span
          className={`shrink-0 w-3 h-3 rounded-sm ${
            isLeaf
              ? 'bg-amber-400'
              : isDimension
                ? 'bg-navy-800 dark:bg-navy-500'
                : 'bg-blue-500'
          }`}
          title={node.level_label}
        />

        <span className="text-[10px] uppercase text-gray-400 shrink-0 w-20 truncate">
          {node.level_label || node.kind}
        </span>

        <span className="flex-1 min-w-0 text-sm font-medium truncate text-gray-800 dark:text-gray-100">
          {node.nombre}
        </span>

        <span className="shrink-0 text-sm font-bold font-mono text-navy-700 dark:text-navy-300">
          {formatValor(node.valor)}
        </span>
      </button>

      {open &&
        hasChildren &&
        node.hijos.map((h, i) => (
          <PiramideNode
            key={h.nodo_id ?? i}
            item={{
              trace: h.trace || h,
              depth: item.depth + 1,
              _parentKey: key,
            }}
            selectedKey={selectedKey}
            onSelect={onSelect}
            defaultOpen={item.depth < 1}
          />
        ))}
    </div>
  );
}

function SimulacionPiramideTree({ trace, selectedKey, onSelect }) {
  if (!trace) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
        Sin trace de cálculo para esta dimensión.
      </p>
    );
  }

  return (
    <div className="p-2 space-y-0.5">
      <PiramideNode
        item={{ trace, depth: 0, _parentKey: 'dim' }}
        selectedKey={selectedKey}
        onSelect={onSelect}
        defaultOpen
      />
    </div>
  );
}

export default SimulacionPiramideTree;

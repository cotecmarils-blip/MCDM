import React from 'react';

function TreeNode({ node, selectedKey, onSelect, depth = 0 }) {
  const isSelected = node.key === selectedKey;
  const hasChildren = node.children?.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.key)}
        className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition ${
          isSelected
            ? 'bg-navy-100 dark:bg-navy-800 text-navy-900 dark:text-white font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-navy-900 text-gray-700 dark:text-gray-300'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <span className="truncate block">
          {node.name}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            (L: {node.localWeight?.toFixed(3) ?? '—'})
          </span>
        </span>
      </button>
      {hasChildren && (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.key}
              node={child}
              selectedKey={selectedKey}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function SensitivityTree({ tree, selectedKey, onSelect }) {
  if (!tree) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 p-3">
        No hay árbol OMOE cargado.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5 overflow-y-auto max-h-full">
      <TreeNode node={tree} selectedKey={selectedKey} onSelect={onSelect} />
    </ul>
  );
}

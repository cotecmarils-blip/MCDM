import React, { useState } from 'react';
import { dimensiones, atributos, subatributos } from '../../api';
import CriterioDocumentos from './CriterioDocumentos';
import CriterioFormModal from './CriterioFormModal';
import {
  CRITERIO_LEVELS,
  LEVEL_LABELS_SHORT,
  CHILD_LEVEL,
  CHILD_LABEL,
} from './constants';

const DELETE_API = {
  dimension: dimensiones,
  atributo: atributos,
  subatributo: subatributos,
};

const LEVEL_STYLES = {
  dimension: 'border-navy-600/40 bg-navy-800/[0.06]',
  atributo: 'border-navy-500/35 bg-navy-700/[0.05]',
  subatributo: 'border-navy-400/30 bg-navy-600/[0.04]',
};

const INDENT = {
  dimension: 'pl-0',
  atributo: 'pl-4 sm:pl-6',
  subatributo: 'pl-8 sm:pl-12',
};

function CriterioTreeNode({
  level,
  node,
  siblings,
  parentId,
  children = [],
  renderChild,
  onRefresh,
}) {
  const [expanded, setExpanded] = useState(level === CRITERIO_LEVELS.DIMENSION);
  const [showDetails, setShowDetails] = useState(false);
  const [modal, setModal] = useState(null);

  const canAddChild = level !== CRITERIO_LEVELS.SUBATRIBUTO;
  const childLevel = CHILD_LEVEL[level];

  const handleDelete = async () => {
    const label = LEVEL_LABELS_SHORT[level].toLowerCase();
    if (!window.confirm(`¿Eliminar esta ${label} y todo su contenido?`)) return;
    try {
      await DELETE_API[level].delete(node.id);
      onRefresh();
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('No se pudo eliminar. Puede tener elementos dependientes.');
    }
  };

  return (
    <div className={`${INDENT[level]} mb-2`}>
      <div
        className={`border rounded-lg shadow-xs transition-colors ${LEVEL_STYLES[level]} ${
          showDetails ? 'ring-1 ring-navy-500/30' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 p-3">
          {canAddChild && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
              aria-expanded={expanded}
            >
              <svg
                className={`w-4 h-4 fill-current transition-transform ${expanded ? 'rotate-90' : ''}`}
                viewBox="0 0 12 12"
              >
                <path d="M4.7 2.3a1 1 0 0 1 1.4 0l3.3 3.3a1 1 0 0 1 0 1.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L7.39 6 4.7 3.3a1 1 0 0 1 0-1.4Z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
                {LEVEL_LABELS_SHORT[level]}
              </span>
              <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                {node.nombre}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {canAddChild && (
              <button
                type="button"
                onClick={() => setModal({ mode: 'create-child' })}
                className="btn-sm border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300 hover:border-navy-500 hover:text-navy-800"
                title={`Agregar ${CHILD_LABEL[level]}`}
              >
                + {CHILD_LABEL[level]}
              </button>
            )}
            <button
              type="button"
              onClick={() => setModal({ mode: 'edit' })}
              className="p-1.5 text-gray-500 hover:text-navy-800 rounded"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 text-gray-500 hover:text-red-500 rounded"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200/80 dark:border-gray-700/60 pt-3">
            {node.descripcion && (
              <p className="mb-2">
                <span className="font-medium text-gray-700 dark:text-gray-200">Descripción: </span>
                {node.descripcion}
              </p>
            )}
            {node.referencia && (
              <p className="mb-2">
                <span className="font-medium text-gray-700 dark:text-gray-200">Referencia: </span>
                {node.referencia}
              </p>
            )}
            <CriterioDocumentos level={level} entityId={node.id} onRefresh={onRefresh} />
          </div>
        )}
      </div>

      {canAddChild && expanded && (
        <div className="mt-2 space-y-2">
          {children.length > 0 ? (
            children.map((child) => renderChild(child))
          ) : (
            <p className={`text-xs text-gray-500 dark:text-gray-400 ${INDENT[childLevel]}`}>
              Sin {CHILD_LABEL[level].toLowerCase()}s. Agrega uno con el botón +.
            </p>
          )}
        </div>
      )}

      {modal?.mode === 'edit' && (
        <CriterioFormModal
          level={level}
          parentId={parentId}
          item={node}
          siblings={siblings}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            onRefresh();
          }}
        />
      )}

      {modal?.mode === 'create-child' && (
        <CriterioFormModal
          level={childLevel}
          parentId={node.id}
          siblings={children}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            setExpanded(true);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

export default CriterioTreeNode;

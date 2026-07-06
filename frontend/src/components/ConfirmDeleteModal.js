import React from 'react';
import { MODAL_BACKDROP_CLASS } from '../utils/modalBackdrop';

function ConfirmDeleteModal({
  open,
  title = 'Confirmar eliminación',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  error = null,
}) {
  if (!open) return null;

  return (
    <div
      className={MODAL_BACKDROP_CLASS}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full border border-gray-200 dark:border-navy-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2
            id="confirm-delete-title"
            className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2"
          >
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{message}</p>
          {error && <p className="text-sm text-red-500 dark:text-red-400 mt-3">{error}</p>}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="btn bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-50"
            >
              {loading ? 'Eliminando...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;

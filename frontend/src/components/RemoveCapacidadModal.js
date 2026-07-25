import React, { useEffect, useState } from 'react';
import { MODAL_BACKDROP_CLASS } from '../utils/modalBackdrop';

const CONFIRM_WORD = 'QUITAR';

function RemoveCapacidadModal({ capacidad, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toUpperCase() === CONFIRM_WORD;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (matches) onConfirm();
  };

  return (
    <div className={MODAL_BACKDROP_CLASS} role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700/60">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
            Quitar capacidad
          </h2>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
            Se quitará <strong>{capacidad?.nombre || 'esta capacidad'}</strong>.
            La eliminación se hará efectiva al guardar la alternativa.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <label className="block text-sm text-gray-700 dark:text-gray-200">
            Escribe <strong>{CONFIRM_WORD}</strong> para confirmar:
            <input
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoFocus
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 px-3 py-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="btn-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!matches}
              className="btn-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Quitar capacidad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RemoveCapacidadModal;

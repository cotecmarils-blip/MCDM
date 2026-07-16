import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function ChevronDown({ open }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const MENU_WIDTH = 264;

/**
 * Botón desplegable de exportables con posicionamiento inteligente:
 * el menú se ancla al botón vía portal y se recoloca para no salirse de
 * la pantalla (se abre hacia arriba/abajo y se ajusta a izquierda/derecha).
 */
function ExportablesDropdown({ label = 'Exportables', items = [], disabled = false }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(MENU_WIDTH, window.innerWidth - margin * 2);

    // Alinear al borde derecho del botón; si no cabe, correr a la izquierda.
    let left = rect.right - width;
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - width - margin;
    }
    left = Math.max(margin, left);

    const preferredMaxHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let top = rect.bottom + 6;
    let maxHeight = Math.min(preferredMaxHeight, spaceBelow - 6);

    // Si abajo no hay espacio suficiente y arriba hay más, abrir hacia arriba.
    if (maxHeight < 180 && spaceAbove > spaceBelow) {
      maxHeight = Math.min(preferredMaxHeight, spaceAbove - 6);
      top = Math.max(margin, rect.top - maxHeight - 6);
    } else {
      maxHeight = Math.max(140, maxHeight);
    }

    setMenuStyle({ top, left, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updatePosition();
    const onReflow = () => updatePosition();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const handleItemClick = (item) => {
    if (item.disabled) return;
    setOpen(false);
    item.onClick?.();
  };

  const menu =
    open && menuStyle
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-900 shadow-xl py-1"
            style={menuStyle}
            role="menu"
            aria-label={label}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                title={item.title || ''}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-navy-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {item.description}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="inline-flex shrink-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="btn btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
        <ChevronDown open={open} />
      </button>
      {menu}
    </div>
  );
}

export default ExportablesDropdown;

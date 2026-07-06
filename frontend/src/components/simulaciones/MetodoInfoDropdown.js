import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MethodDocChart from './MethodDocChart';

function InfoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  );
}

function MetodoInfoDropdown({ methods, docsMap, panelTitle, panelDescription, defaultMethod }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [panelStyle, setPanelStyle] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const available = (methods || []).filter((m) => docsMap[m.value]);
  const activeValue = selected || available[0]?.value || '';
  const doc = docsMap[activeValue];

  const updatePanelPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(360, window.innerWidth - margin * 2);
    let left = rect.left;
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - width - margin;
    }
    left = Math.max(margin, left);

    const preferredMaxHeight = 420;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let top = rect.bottom + 6;
    let maxHeight = Math.min(preferredMaxHeight, spaceBelow - 6);

    if (maxHeight < 160 && spaceAbove > spaceBelow) {
      maxHeight = Math.min(preferredMaxHeight, spaceAbove - 6);
      top = Math.max(margin, rect.top - maxHeight - 6);
    } else {
      maxHeight = Math.max(160, maxHeight);
    }

    setPanelStyle({
      top,
      left,
      width,
      maxHeight,
    });
  }, []);

  const toggleOpen = () => {
    if (!available.length) return;
    if (!open) {
      const initial =
        defaultMethod && docsMap[defaultMethod] ? defaultMethod : available[0]?.value;
      if (initial) setSelected(initial);
    }
    setOpen((v) => !v);
  };

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }
    updatePanelPosition();
    const onReflow = () => updatePanelPosition();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      const root = rootRef.current;
      const panel = panelRef.current;
      if (root?.contains(e.target) || panel?.contains(e.target)) return;
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

  if (!available.length) return null;

  const panel =
    open && doc && panelStyle
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[200] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-900 shadow-xl"
            style={panelStyle}
            role="dialog"
            aria-label={panelTitle}
          >
            <div className="sticky top-0 z-10 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700/60 bg-white/95 dark:bg-navy-900/95 backdrop-blur-sm">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{panelTitle}</p>
              {panelDescription && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{panelDescription}</p>
              )}
            </div>

            <div className="p-3 space-y-3">
              <div>
                <label htmlFor="metodo-info-select" className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  Método
                </label>
                <select
                  id="metodo-info-select"
                  value={activeValue}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-1 w-full text-sm px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-navy-950 text-gray-900 dark:text-gray-100"
                >
                  {available.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400">{doc.intro}</p>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Ecuaciones</p>
                {doc.equations.map((eq) => (
                  <div
                    key={`${eq.label}-${eq.text}`}
                    className="rounded-md bg-gray-50 dark:bg-navy-950/60 border border-gray-100 dark:border-gray-800/80 px-2.5 py-2"
                  >
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{eq.label}</p>
                    <p className="text-sm font-mono text-gray-800 dark:text-gray-100 leading-relaxed">{eq.text}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                  Vista gráfica (ejemplo)
                </p>
                <div className="rounded-md border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-navy-950/40 p-2 flex justify-center">
                  <MethodDocChart chartId={doc.chart} />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="inline-flex shrink-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="p-1 rounded-full text-navy-600 dark:text-navy-400 hover:bg-navy-500/10 dark:hover:bg-navy-500/20 transition-colors"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={panelTitle}
        title={panelTitle}
      >
        <InfoIcon />
      </button>
      {panel}
    </div>
  );
}

export default MetodoInfoDropdown;

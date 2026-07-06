import React, { useState } from 'react';

function CollapseIcon({ collapsed }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function SplitColumnLayout({
  title,
  description,
  headerAction,
  left,
  right,
  leftLabel = 'Selección',
  rightLabel = 'Detalle',
  leftWidthClass = 'lg:w-72 xl:w-80',
  leftCollapsedWidthClass = 'lg:w-11',
  rightPaddingClass = 'p-4 sm:p-5',
  leftCollapsible = false,
  leftCollapsed,
  defaultLeftCollapsed = false,
  onLeftCollapsedChange,
  leftCollapsedBadge,
  rightCollapsible = false,
  rightCollapsed,
  defaultRightCollapsed = false,
  onRightCollapsedChange,
  rightCollapsedWidthClass = 'lg:w-11',
  rightCollapsedBadge,
}) {
  const [internalLeftCollapsed, setInternalLeftCollapsed] = useState(defaultLeftCollapsed);
  const [internalRightCollapsed, setInternalRightCollapsed] = useState(defaultRightCollapsed);
  const leftIsCollapsed = leftCollapsed !== undefined ? leftCollapsed : internalLeftCollapsed;
  const rightIsCollapsed = rightCollapsed !== undefined ? rightCollapsed : internalRightCollapsed;

  const setLeftCollapsed = (value) => {
    if (onLeftCollapsedChange) onLeftCollapsedChange(value);
    else setInternalLeftCollapsed(value);
  };

  const setRightCollapsed = (value) => {
    if (onRightCollapsedChange) onRightCollapsedChange(value);
    else setInternalRightCollapsed(value);
  };

  const leftAsideWidthClass =
    leftCollapsible && leftIsCollapsed ? leftCollapsedWidthClass : leftWidthClass;

  const rightAsideWidthClass = rightCollapsible && rightIsCollapsed
    ? rightCollapsedWidthClass
    : 'flex-1 min-w-0';

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {(title || description || headerAction) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-lg md:text-xl text-gray-800 dark:text-gray-100 font-bold leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 sm:line-clamp-1">
                {description}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 gap-3 min-h-0 overflow-hidden">
        <aside
          className={`${leftAsideWidthClass} shrink-0 flex flex-col min-h-0 lg:h-full transition-[width] duration-200 ${
            leftCollapsible && leftIsCollapsed
              ? 'max-h-12 lg:max-h-none'
              : rightCollapsible && rightIsCollapsed
                ? 'flex-1 min-h-[55vh] max-h-none lg:max-h-none'
                : 'max-h-[38vh] lg:max-h-none'
          }`}
        >
          <div
            className={`flex items-center mb-1.5 px-1 shrink-0 gap-1 ${
              leftIsCollapsed && leftCollapsible ? 'justify-center' : 'justify-between'
            }`}
          >
            {!(leftIsCollapsed && leftCollapsible) && (
              <div className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 truncate">
                {leftLabel}
              </div>
            )}
            {leftCollapsible && (
              <button
                type="button"
                onClick={() => setLeftCollapsed(!leftIsCollapsed)}
                className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800/60 hover:text-navy-600 dark:hover:text-navy-300 transition-colors"
                aria-expanded={!leftIsCollapsed}
                aria-label={leftIsCollapsed ? `Expandir ${leftLabel}` : `Contraer ${leftLabel}`}
                title={leftIsCollapsed ? `Expandir ${leftLabel}` : `Contraer ${leftLabel}`}
              >
                <CollapseIcon collapsed={leftIsCollapsed} />
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-navy-900 shadow-xs rounded-xl border border-gray-200 dark:border-navy-800/80">
            {leftCollapsible && leftIsCollapsed ? (
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                className="h-full w-full flex flex-row lg:flex-col items-center justify-center lg:justify-start gap-2 py-2 lg:py-3 px-3 lg:px-1 text-gray-500 dark:text-gray-400 hover:bg-navy-500/5 transition-colors"
                title={`Expandir ${leftLabel}`}
              >
                <span className="lg:hidden text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {leftLabel}
                </span>
                <span
                  className="hidden lg:inline text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {leftLabel}
                </span>
                {leftCollapsedBadge != null && leftCollapsedBadge !== '' && (
                  <span className="text-[10px] font-bold min-w-[1.25rem] h-5 px-1 rounded-full bg-navy-500/15 text-navy-700 dark:text-navy-300 flex items-center justify-center">
                    {leftCollapsedBadge}
                  </span>
                )}
                <span className="lg:hidden text-[10px] text-gray-400">Pulsar para expandir</span>
              </button>
            ) : (
              <div className="h-full min-h-0 overflow-auto">{left}</div>
            )}
          </div>
        </aside>

        <section
          className={`${rightAsideWidthClass} flex flex-col min-h-0 min-w-0 transition-[width] duration-200 ${
            rightCollapsible && rightIsCollapsed
              ? 'max-h-12 lg:max-h-none shrink-0'
              : 'max-h-[42vh] lg:max-h-none'
          }`}
        >
          <div
            className={`flex items-center mb-1.5 px-1 shrink-0 gap-1 ${
              rightIsCollapsed && rightCollapsible ? 'justify-center' : 'justify-between'
            }`}
          >
            {rightCollapsible && (
              <button
                type="button"
                onClick={() => setRightCollapsed(!rightIsCollapsed)}
                className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-800/60 hover:text-navy-600 dark:hover:text-navy-300 transition-colors"
                aria-expanded={!rightIsCollapsed}
                aria-label={rightIsCollapsed ? `Expandir ${rightLabel}` : `Contraer ${rightLabel}`}
                title={rightIsCollapsed ? `Expandir ${rightLabel}` : `Contraer ${rightLabel}`}
              >
                <CollapseIcon collapsed={!rightIsCollapsed} />
              </button>
            )}
            {!(rightIsCollapsed && rightCollapsible) && (
              <div className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 truncate">
                {rightLabel}
              </div>
            )}
          </div>
          <div
            className={`flex-1 min-h-0 overflow-hidden bg-white dark:bg-navy-900 shadow-xs rounded-xl border border-gray-200 dark:border-navy-800/80 ${
              rightCollapsible && rightIsCollapsed ? '' : rightPaddingClass
            } ${rightCollapsible && rightIsCollapsed ? '' : 'overflow-y-auto'}`}
          >
            {rightCollapsible && rightIsCollapsed ? (
              <button
                type="button"
                onClick={() => setRightCollapsed(false)}
                className="h-full w-full flex flex-row lg:flex-col items-center justify-center lg:justify-start gap-2 py-2 lg:py-3 px-3 lg:px-1 text-gray-500 dark:text-gray-400 hover:bg-navy-500/5 transition-colors"
                title={`Expandir ${rightLabel}`}
              >
                <span className="lg:hidden text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {rightLabel}
                </span>
                <span
                  className="hidden lg:inline text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {rightLabel}
                </span>
                {rightCollapsedBadge != null && rightCollapsedBadge !== '' && (
                  <span className="text-[10px] font-bold min-w-[1.25rem] h-5 px-1 rounded-full bg-navy-500/15 text-navy-700 dark:text-navy-300 flex items-center justify-center">
                    {rightCollapsedBadge}
                  </span>
                )}
                <span className="lg:hidden text-[10px] text-gray-400">Pulsar para expandir</span>
              </button>
            ) : (
              right
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default SplitColumnLayout;

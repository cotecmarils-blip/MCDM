import React from 'react';
import {
  SimulacionPreviewMatrix,
  SimulacionPreviewPesos,
  SimulacionPreviewRanking,
} from './SimulacionPreviewTables';

export function NotebookBadge({ notebook }) {
  if (!notebook) {
    return (
      <span className="pipeline-badge pipeline-badge-app" title="Paso propio de la aplicación">
        App
      </span>
    );
  }
  return (
    <span className="pipeline-badge" title={`Notebook ${notebook}`}>
      Nb {notebook}
    </span>
  );
}

export function PasoContenido({ paso, animate }) {
  if (paso.estado === 'bloqueado') {
    return (
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic pipeline-fade-in">
        {paso.error || 'Complete la evaluación para desbloquear este paso.'}
      </p>
    );
  }

  if (paso.estado === 'pendiente') {
    return (
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic pipeline-fade-in">
        Configure las opciones del formulario para calcular este paso.
      </p>
    );
  }

  if (paso.error) {
    return (
      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 pipeline-fade-in">
        {paso.error}
      </p>
    );
  }

  const animClass = animate ? 'pipeline-content-reveal' : '';

  if (paso.id === 'pareto' && paso.activo === false) {
    return (
      <p className={`text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic ${animClass}`}>
        {paso.descripcion}
      </p>
    );
  }

  if (paso.id === 'pareto' && paso.activo) {
    return (
      <div className={animClass}>
        {paso.aviso && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 pipeline-fade-in">
            {paso.aviso}
          </p>
        )}
        {paso.excluidas?.length > 0 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">
            Excluidas: {paso.excluidas.join(', ')}
          </p>
        )}
        <SimulacionPreviewMatrix
          alternativas={paso.alternativas}
          dimensiones={paso.dimensiones}
          matriz={paso.matriz}
          direcciones={paso.direcciones}
          destacadas={paso.alternativas}
          atenuadas={paso.excluidas}
          animate
        />
      </div>
    );
  }

  if (paso.matriz) {
    return (
      <div className={animClass}>
        <SimulacionPreviewMatrix
          alternativas={paso.alternativas}
          dimensiones={paso.dimensiones}
          matriz={paso.matriz}
          direcciones={paso.direcciones}
          animate
        />
      </div>
    );
  }

  if (paso.id === 'pesos') {
    return (
      <div className={animClass}>
        <SimulacionPreviewPesos
          dimensiones={paso.dimensiones}
          pesosPorcentaje={paso.pesos_porcentaje}
          pesos={paso.pesos}
          animate
        />
      </div>
    );
  }

  if (paso.id === 'madm') {
    return (
      <div className={animClass}>
        {paso.mejor_alternativa && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-2 font-medium">
            Mejor: {paso.mejor_alternativa}
          </p>
        )}
        <SimulacionPreviewRanking filas={paso.filas} animate />
      </div>
    );
  }

  return null;
}

function ProcessingDots() {
  return (
    <span className="pipeline-dots inline-flex gap-0.5 ml-1" aria-hidden>
      <span className="pipeline-dot" />
      <span className="pipeline-dot" />
      <span className="pipeline-dot" />
    </span>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`pipeline-chevron-icon ${expanded ? 'pipeline-chevron-icon--open' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function PipelineStep({
  paso,
  isLast,
  processing,
  staggerIndex,
  expanded,
  onToggle,
  highlight,
}) {
  const estadoClass =
    paso.estado === 'completo'
      ? 'pipeline-step--done'
      : paso.estado === 'error'
        ? 'pipeline-step--error'
        : paso.estado === 'omitido'
          ? 'pipeline-step--skipped'
          : paso.estado === 'pendiente'
            ? 'pipeline-step--pending'
            : 'pipeline-step--locked';

  const canToggle =
    paso.estado === 'completo' ||
    paso.estado === 'error' ||
    paso.estado === 'omitido' ||
    paso.estado === 'pendiente';

  const hasContent =
    paso.matriz ||
    paso.pesos ||
    paso.filas ||
    paso.error ||
    paso.estado === 'pendiente' ||
    paso.estado === 'bloqueado' ||
    (paso.id === 'pareto' && paso.activo === false);

  return (
    <li
      className={`pipeline-step pipeline-accordion-item pipeline-step-enter ${estadoClass} ${
        processing ? 'pipeline-step--processing' : ''
      } ${highlight ? 'pipeline-step--focus' : ''} ${expanded ? 'pipeline-step--expanded' : ''}`}
      style={{ animationDelay: `${staggerIndex * 80}ms` }}
    >
      <button
        type="button"
        className={`pipeline-accordion-trigger ${canToggle && hasContent ? '' : 'pipeline-accordion-trigger--static'}`}
        onClick={() => canToggle && hasContent && onToggle?.(paso.id)}
        aria-expanded={expanded}
        disabled={!canToggle || !hasContent}
      >
        <span className="pipeline-step-num" aria-hidden>
          {paso.orden}
        </span>

        <div className="pipeline-accordion-main min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
              {paso.titulo}
            </p>
            <NotebookBadge notebook={paso.notebook} />
          </div>
          {paso.hint && !expanded && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{paso.hint}</p>
          )}
          {processing && (
            <span className="text-[10px] text-navy-500 dark:text-navy-300 font-medium pipeline-pulse-text mt-0.5 inline-flex items-center">
              Procesando
              <ProcessingDots />
            </span>
          )}
          {!expanded && paso.estado === 'completo' && canToggle && hasContent && (
            <p className="text-[10px] text-navy-600/80 dark:text-navy-400 mt-0.5">Ver detalles</p>
          )}
          {paso.descripcion && expanded && paso.estado === 'completo' && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{paso.descripcion}</p>
          )}
        </div>

        {canToggle && hasContent && (
          <span className="pipeline-chevron" aria-hidden>
            <ChevronIcon expanded={expanded} />
          </span>
        )}
      </button>

      {expanded && (
        <div className={`pipeline-accordion-panel ${processing ? 'pipeline-step--processing' : ''}`}>
          {processing && <div className="pipeline-shimmer-bar" aria-hidden />}
          <PasoContenido paso={paso} animate={!processing && paso.estado === 'completo'} />
        </div>
      )}
    </li>
  );
}

export function PipelineTimeline({
  steps,
  processingStepId,
  loading,
  expandedIds,
  onToggleStep,
  highlightStepId,
  className = '',
}) {
  const expandedSet = expandedIds instanceof Set ? expandedIds : new Set(expandedIds || []);

  return (
    <ol className={`pipeline-timeline ${className}`}>
      {steps.map((paso, idx) => (
        <PipelineStep
          key={paso.id}
          paso={paso}
          isLast={idx === steps.length - 1}
          processing={loading && paso.id === processingStepId}
          staggerIndex={idx}
          expanded={expandedSet.has(paso.id)}
          onToggle={onToggleStep}
          highlight={highlightStepId === paso.id}
        />
      ))}
    </ol>
  );
}

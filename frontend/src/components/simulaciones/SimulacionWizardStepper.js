import React from 'react';
import { WIZARD_STEPS } from './simulacionWizardSteps';

function SimulacionWizardStepper({ currentIndex, onStepClick, maxReachableIndex }) {
  return (
    <nav aria-label="Pasos del cálculo" className="mb-6">
      <ol className="flex flex-wrap gap-1 sm:gap-0 sm:justify-between">
        {WIZARD_STEPS.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isDone = idx < currentIndex;
          const isReachable = idx <= maxReachableIndex;
          const isClickable = isReachable && idx !== currentIndex;

          return (
            <li
              key={step.id}
              className="flex items-center flex-1 min-w-[4.5rem] sm:min-w-0"
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(idx)}
                className={`group flex flex-col items-center w-full px-1 py-1 rounded-lg transition-colors ${
                  isClickable ? 'cursor-pointer hover:bg-navy-500/5' : 'cursor-default'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-all duration-300 ${
                    isActive
                      ? 'bg-navy-600 border-navy-600 text-white scale-110 shadow-md shadow-navy-500/25'
                      : isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isReachable
                          ? 'bg-white dark:bg-navy-900 border-navy-400 text-navy-600 dark:text-navy-300'
                          : 'bg-gray-50 dark:bg-navy-950 border-gray-200 dark:border-navy-800 text-gray-400'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </span>
                <span
                  className={`mt-1.5 text-[10px] sm:text-xs font-medium text-center leading-tight ${
                    isActive
                      ? 'text-navy-700 dark:text-navy-300'
                      : isDone
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
              </button>
              {idx < WIZARD_STEPS.length - 1 && (
                <span
                  className={`hidden sm:block h-0.5 flex-1 mx-1 rounded-full transition-colors ${
                    idx < currentIndex ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-navy-800'
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default SimulacionWizardStepper;

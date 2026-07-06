import React from 'react';

const TABS = [
  { id: 'resultados', label: 'Resultados' },
  { id: 'graficos', label: 'Gráficos' },
  { id: 'sensibilidad', label: 'Sensibilidad' },
];

function SimulacionResultadoTabs({ activeTab, onChange, tabs = null }) {
  const visibleTabs = tabs ? TABS.filter((t) => tabs.includes(t.id)) : TABS;
  return (
    <div
      className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-navy-900/80 border border-gray-200 dark:border-gray-700/60 w-fit"
      role="tablist"
      aria-label="Vistas del cálculo"
    >
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default SimulacionResultadoTabs;

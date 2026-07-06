import React from 'react';
import { buildOverallBreakdown } from '../../utils/sensitivityCalculations';

export default function SensitivityRanking({
  ranking,
  weights,
  localPriorities,
  selectedAlt,
  onSelectAlt,
}) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Ranking (OVERALL)
        </h3>
        <ul className="space-y-1">
          {ranking.map((item, idx) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectAlt(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  selectedAlt?.id === item.id
                    ? 'bg-navy-50 dark:bg-navy-800/60'
                    : 'hover:bg-gray-50 dark:hover:bg-navy-900'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="tabular-nums font-medium shrink-0 ml-2">
                  {item.overall.toFixed(3)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedAlt && (
        <div className="rounded-lg border border-gray-200 dark:border-navy-700 p-3 text-xs">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {selectedAlt.name} — OVERALL {selectedAlt.overall.toFixed(4)}
          </h4>
          <dl className="space-y-1">
            {buildOverallBreakdown(selectedAlt.name, weights, localPriorities).map((row) => (
              <div key={row.criterion} className="flex justify-between gap-2">
                <dt className="text-gray-500 truncate" title={row.criterion}>
                  {row.criterion}
                </dt>
                <dd className="tabular-nums shrink-0">
                  {row.weight.toFixed(3)} × {row.local.toFixed(3)} = {row.contribution.toFixed(4)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

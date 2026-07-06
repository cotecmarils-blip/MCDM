import React from 'react';
import { formatValor, paramEntries } from './simulacionTraceUtils';

const RAMA_LABELS = { omoe: 'OMOE', omoc: 'OMOC', omor: 'OMOR' };

function RollupTable({ hijos }) {
  if (!hijos?.length) return null;
  const sumPesos = hijos.reduce((s, h) => s + Number(h.peso || 0), 0);
  const sumContrib = hijos.reduce((s, h) => s + Number(h.contribucion ?? (h.valor * h.peso)) || 0, 0);
  const result = sumPesos > 0 ? sumContrib / sumPesos : hijos[0]?.valor;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700/60">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-navy-900/60">
          <tr>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Hijo</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Nivel</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-500">uᵢ</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-500">Peso %</th>
            <th className="px-2 py-1.5 text-right font-semibold text-gray-500">uᵢ·peso</th>
          </tr>
        </thead>
        <tbody>
          {hijos.map((h, i) => (
            <tr key={h.nodo_id ?? i} className="border-t border-gray-100 dark:border-gray-800/80">
              <td className="px-2 py-1.5 font-medium">{h.nombre}</td>
              <td className="px-2 py-1.5 text-gray-500">{h.level_label || '—'}</td>
              <td className="px-2 py-1.5 text-right font-mono">{formatValor(h.valor)}</td>
              <td className="px-2 py-1.5 text-right font-mono">{formatValor(h.peso)}</td>
              <td className="px-2 py-1.5 text-right font-mono">
                {formatValor(h.contribucion ?? Number(h.valor) * Number(h.peso))}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-navy-50/50 dark:bg-navy-900/40">
            <td colSpan={2} className="px-2 py-1.5 font-semibold text-gray-700 dark:text-gray-200">
              Σ(uᵢ·pesoᵢ) / Σ(pesoᵢ)
            </td>
            <td colSpan={3} className="px-2 py-1.5 text-right font-bold font-mono text-navy-700 dark:text-navy-300">
              {formatValor(result)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SimulacionRecibo({ node, globalTrace }) {
  if (!node && globalTrace) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Valor global</p>
          <p className="text-2xl font-bold text-navy-700 dark:text-navy-300 font-mono">
            {formatValor(globalTrace.valor)}
          </p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{globalTrace.formula}</p>
        <RollupTable hijos={globalTrace.hijos} />
      </div>
    );
  }

  if (!node) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12 px-4">
        Seleccione un nodo en la pirámide o en la auditoría para ver el desglose del cálculo.
      </p>
    );
  }

  const isLeaf = node.kind === 'leaf';
  const isDimension = node.kind === 'dimension';
  const params = paramEntries(node.parametros);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {node.level_label || node.kind}
          {node.rama && (
            <span className="ml-2 normal-case text-navy-600 dark:text-navy-400">
              {RAMA_LABELS[node.rama] || node.rama}
            </span>
          )}
        </p>
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{node.nombre}</h3>
        <p className="text-2xl font-bold text-navy-700 dark:text-navy-300 font-mono mt-1">
          {formatValor(node.valor)}
        </p>
      </div>

      {node.formula && (
        <p className="text-sm text-gray-600 dark:text-gray-300 rounded-lg bg-gray-50 dark:bg-navy-950/50 px-3 py-2">
          {node.formula}
        </p>
      )}

      {isLeaf && (
        <>
          {node.escenarios?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                {node.formula_escenarios || 'Evaluación por escenario'}
              </h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700/60">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-navy-900/60">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-500">Escenario</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-gray-500">x</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-gray-500">u(x)</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-gray-500">Peso %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {node.escenarios.map((esc, i) => (
                      <tr key={esc.escenario_id ?? i} className="border-t border-gray-100 dark:border-gray-800/80">
                        <td className="px-2 py-1.5">{esc.nombre}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{esc.x}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{formatValor(esc.u)}</td>
                        <td className="px-2 py-1.5 text-right font-mono">
                          {esc.peso != null ? formatValor(esc.peso) : '—'}
                        </td>
                      </tr>
                    ))}
                    {node.escenarios.length > 1 && (
                      <tr className="border-t-2 border-gray-200 dark:border-gray-600 font-semibold">
                        <td colSpan={2} className="px-2 py-1.5">Agregado</td>
                        <td colSpan={2} className="px-2 py-1.5 text-right font-mono">
                          {formatValor(node.valor)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="font-semibold">Familia:</span> {node.familia_label || '—'}
            </p>
            {node.utilidad_tipo && (
              <p>
                <span className="font-semibold">Tipo:</span> {node.utilidad_tipo}
              </p>
            )}
            {params.length > 0 && (
              <p>
                <span className="font-semibold">Constantes:</span>{' '}
                {params.map(([k, v]) => `${k}=${v}`).join(', ')}
              </p>
            )}
          </div>
        </>
      )}

      {!isLeaf && node.hijos?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Agregación de hijos</h4>
          <RollupTable hijos={node.hijos} />
        </div>
      )}

      {isDimension && !node.hijos?.length && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Esta dimensión no tiene hijos en el árbol o faltan datos para calcular.
        </p>
      )}
    </div>
  );
}

export default SimulacionRecibo;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { proyectos } from '../../api';
import { ModalOverlay } from '../../utils/modalBackdrop';

function toggleId(set, id) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function SectionHeader({ title, count, selectedCount, onSelectAll, onClear, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">
        {title}{' '}
        <span className="font-normal text-gray-500">
          ({selectedCount}/{count})
        </span>
      </h4>
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          disabled={disabled || count === 0}
          onClick={onSelectAll}
          className="text-navy-700 dark:text-navy-300 hover:underline disabled:opacity-40"
        >
          Todas
        </button>
        <button
          type="button"
          disabled={disabled || selectedCount === 0}
          onClick={onClear}
          className="text-gray-500 hover:underline disabled:opacity-40"
        >
          Ninguna
        </button>
      </div>
    </div>
  );
}

function ImportarConfigProyectoModal({
  open,
  proyectoId,
  canWrite = true,
  onClose,
  onImported,
}) {
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [fuenteId, setFuenteId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [omoeIds, setOmoeIds] = useState(() => new Set());
  const [escenarioIds, setEscenarioIds] = useState(() => new Set());
  const [alternativaIds, setAlternativaIds] = useState(() => new Set());
  const [incluirValores, setIncluirValores] = useState(false);
  const [expandedAlt, setExpandedAlt] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const reset = useCallback(() => {
    setStep(1);
    setFiltro('');
    setFuenteId(null);
    setPreview(null);
    setOmoeIds(new Set());
    setEscenarioIds(new Set());
    setAlternativaIds(new Set());
    setIncluirValores(false);
    setExpandedAlt(null);
    setError(null);
    setResult(null);
  }, []);

  useEffect(() => {
    if (!open || !proyectoId) return undefined;
    reset();
    let cancelled = false;
    setLoadingCatalog(true);
    proyectos
      .catalogoConfigProyecto(proyectoId)
      .then((res) => {
        if (!cancelled) setCatalog(res.data?.items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'No se pudo cargar el catálogo.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, proyectoId, reset]);

  const filteredCatalog = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((p) => {
      const blob = `${p.nombre || ''} ${p.descripcion || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [catalog, filtro]);

  const escenariosVisibles = useMemo(() => {
    if (!preview) return [];
    if (omoeIds.size === 0) return [];
    return (preview.escenarios || []).filter((e) => e.omoe_id && omoeIds.has(e.omoe_id));
  }, [preview, omoeIds]);

  const loadPreview = async (id) => {
    setFuenteId(id);
    setLoadingPreview(true);
    setError(null);
    setPreview(null);
    try {
      const res = await proyectos.configPreview(proyectoId, id);
      const data = res.data;
      setPreview(data);
      setOmoeIds(new Set((data.dimensiones || []).map((d) => d.omoe_id)));
      setEscenarioIds(new Set((data.escenarios || []).map((e) => e.escenario_id)));
      setAlternativaIds(new Set((data.alternativas || []).map((a) => a.alternativa_id)));
      setIncluirValores(false);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo cargar la configuración origen.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Si desmarca una dimensión, quita sus escenarios
  useEffect(() => {
    if (!preview) return;
    setEscenarioIds((prev) => {
      const allowed = new Set(
        (preview.escenarios || [])
          .filter((e) => e.omoe_id && omoeIds.has(e.omoe_id))
          .map((e) => e.escenario_id),
      );
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      return next;
    });
  }, [omoeIds, preview]);

  const canImport =
    canWrite
    && !importing
    && fuenteId
    && (omoeIds.size > 0 || alternativaIds.size > 0);

  const handleImport = async () => {
    if (!canImport) return;
    if (incluirValores && (alternativaIds.size === 0 || omoeIds.size === 0)) {
      setError('Para copiar valores de evaluación seleccione dimensiones y alternativas.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const res = await proyectos.importarConfig(proyectoId, {
        fuente_proyecto_id: fuenteId,
        omoe_ids: [...omoeIds],
        escenario_ids: [...escenarioIds],
        alternativa_ids: [...alternativaIds],
        incluir_valores: incluirValores,
      });
      setResult(res.data);
      setStep(3);
      onImported?.(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : detail
            ? JSON.stringify(detail)
            : 'No se pudo importar la configuración.',
      );
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <ModalOverlay onClose={importing ? undefined : onClose}>
      <div className="bg-white dark:bg-navy-900 rounded-xl shadow-xl max-w-3xl w-full p-5 space-y-4 max-h-[92vh] flex flex-col">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Importar configuración de otro proyecto
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Elija dimensiones, escenarios y alternativas. Puede revisar la ficha de cada
            alternativa antes de copiar. Las fotos/anexos no se duplican.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar proyecto…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-navy-950 px-3 py-2 text-sm"
              disabled={loadingCatalog || loadingPreview}
            />
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 border border-gray-100 dark:border-gray-800 rounded-lg p-2">
              {loadingCatalog || loadingPreview ? (
                <p className="text-sm text-gray-500 py-8 text-center">Cargando…</p>
              ) : filteredCatalog.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No hay otros proyectos accesibles para importar.
                </p>
              ) : (
                filteredCatalog.map((p) => (
                  <button
                    key={p.proyecto_id}
                    type="button"
                    onClick={() => loadPreview(p.proyecto_id)}
                    className="w-full text-left px-3 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-navy-500 hover:bg-navy-500/5 transition-colors"
                  >
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {p.nombre}
                    </div>
                    {p.descripcion && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.descripcion}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5">
                      {p.dimensiones_count} dim. · {p.escenarios_count} esc. ·{' '}
                      {p.alternativas_count} alt. · {p.valores_count} valores
                    </p>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {step === 2 && preview && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
            <div className="rounded-lg bg-gray-50 dark:bg-navy-950/50 px-3 py-2 text-sm">
              <span className="text-gray-500">Origen:</span>{' '}
              <strong className="text-gray-900 dark:text-gray-100">{preview.nombre}</strong>
              <button
                type="button"
                className="ml-3 text-xs text-navy-700 dark:text-navy-300 hover:underline"
                onClick={() => {
                  setStep(1);
                  setPreview(null);
                  setFuenteId(null);
                }}
                disabled={importing}
              >
                Cambiar
              </button>
            </div>

            <section className="space-y-2">
              <SectionHeader
                title="Dimensiones"
                count={(preview.dimensiones || []).length}
                selectedCount={omoeIds.size}
                disabled={importing}
                onSelectAll={() =>
                  setOmoeIds(new Set((preview.dimensiones || []).map((d) => d.omoe_id)))
                }
                onClear={() => setOmoeIds(new Set())}
              />
              <div className="space-y-1.5">
                {(preview.dimensiones || []).map((d) => (
                  <label
                    key={d.omoe_id}
                    className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={omoeIds.has(d.omoe_id)}
                      disabled={importing}
                      onChange={() => setOmoeIds((s) => toggleId(s, d.omoe_id))}
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900 dark:text-gray-100 block">
                        {d.nombre_modelo}
                      </span>
                      <span className="text-xs text-gray-500">
                        {d.rama_evaluacion || '—'} · {d.nodos_count} nodos ·{' '}
                        {d.escenarios_count} escenarios
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <SectionHeader
                title="Escenarios"
                count={escenariosVisibles.length}
                selectedCount={escenarioIds.size}
                disabled={importing || omoeIds.size === 0}
                onSelectAll={() =>
                  setEscenarioIds(new Set(escenariosVisibles.map((e) => e.escenario_id)))
                }
                onClear={() => setEscenarioIds(new Set())}
              />
              {omoeIds.size === 0 ? (
                <p className="text-xs text-gray-500">
                  Seleccione al menos una dimensión para ver sus escenarios.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {escenariosVisibles.map((e) => (
                    <label
                      key={e.escenario_id}
                      className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={escenarioIds.has(e.escenario_id)}
                        disabled={importing}
                        onChange={() => setEscenarioIds((s) => toggleId(s, e.escenario_id))}
                      />
                      <span className="min-w-0">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {e.nombre}
                          {e.es_estandar ? ' (Estandar)' : ''}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {e.omoe_nombre} · peso {e.peso}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <SectionHeader
                title="Alternativas"
                count={(preview.alternativas || []).length}
                selectedCount={alternativaIds.size}
                disabled={importing}
                onSelectAll={() =>
                  setAlternativaIds(
                    new Set((preview.alternativas || []).map((a) => a.alternativa_id)),
                  )
                }
                onClear={() => setAlternativaIds(new Set())}
              />
              <div className="space-y-1.5">
                {(preview.alternativas || []).map((a) => {
                  const openDetail = expandedAlt === a.alternativa_id;
                  return (
                    <div
                      key={a.alternativa_id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-2 px-3 py-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={alternativaIds.has(a.alternativa_id)}
                          disabled={importing}
                          onChange={() =>
                            setAlternativaIds((s) => toggleId(s, a.alternativa_id))
                          }
                        />
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          onClick={() =>
                            setExpandedAlt(openDetail ? null : a.alternativa_id)
                          }
                        >
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100 block">
                            {a.nombre}
                            {a.apodo ? ` (${a.apodo})` : ''}
                          </span>
                          <span className="text-xs text-gray-500">
                            {a.valores_count} valores · {a.caracteristicas?.length || 0}{' '}
                            características · {a.capacidades?.length || 0} capacidades
                            {a.costo != null ? ` · ${a.costo} ${a.costo_unidad}` : ''}
                          </span>
                        </button>
                        <span className="text-xs text-navy-600 dark:text-navy-300 shrink-0 mt-1">
                          {openDetail ? 'Ocultar' : 'Ver'}
                        </span>
                      </div>
                      {openDetail && (
                        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 space-y-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50/80 dark:bg-navy-950/40">
                          {a.descripcion && <p>{a.descripcion}</p>}
                          {(a.caracteristicas || []).length > 0 && (
                            <div>
                              <p className="font-semibold mb-1">Características</p>
                              <ul className="space-y-0.5">
                                {a.caracteristicas.map((c, i) => (
                                  <li key={`${c.nombre}-${i}`}>
                                    {c.nombre}
                                    {c.unidad ? ` [${c.unidad}]` : ''}: {c.dato || '—'}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(a.capacidades || []).length > 0 && (
                            <div>
                              <p className="font-semibold mb-1">Capacidades</p>
                              <ul className="space-y-0.5">
                                {a.capacidades.map((c, i) => (
                                  <li key={`${c.nombre}-${i}`}>
                                    {c.nombre}
                                    {c.descripcion ? ` — ${c.descripcion}` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(a.tiene_foto || a.tiene_anexo) && (
                            <p className="text-amber-700 dark:text-amber-400">
                              Tiene foto/anexo en origen; no se copiarán los archivos.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <label className="flex items-start gap-2 text-sm cursor-pointer rounded-lg border border-dashed border-navy-300 dark:border-navy-700 px-3 py-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={incluirValores}
                disabled={importing || alternativaIds.size === 0 || omoeIds.size === 0}
                onChange={(e) => setIncluirValores(e.target.checked)}
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-gray-100 block">
                  Incluir valores de evaluación
                </span>
                <span className="text-xs text-gray-500">
                  Copia la matriz x por alternativa/escenario/nodo. Requiere dimensiones y
                  alternativas seleccionadas.
                </span>
              </span>
            </label>
          </div>
        )}

        {step === 3 && result && (
          <div className="flex-1 space-y-3 text-sm text-gray-700 dark:text-gray-200">
            <p className="font-semibold text-green-700 dark:text-green-400">
              Configuración importada correctamente.
            </p>
            <ul className="space-y-1 list-disc pl-5">
              <li>{(result.dimensiones || []).length} dimensión(es)</li>
              <li>{result.nodos_copiados || 0} nodo(s)</li>
              <li>{result.escenarios_copiados || 0} escenario(s)</li>
              <li>{result.alternativas_copiadas || 0} alternativa(s)</li>
              <li>{result.valores_copiados || 0} valor(es) de evaluación</li>
            </ul>
            {(result.dimensiones || []).length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
                  Dimensiones creadas
                </p>
                <ul className="text-sm space-y-0.5">
                  {result.dimensiones.map((d) => (
                    <li key={d.omoe_id}>
                      {d.nombre_modelo}{' '}
                      <span className="text-gray-500">({d.nodos_copiados} nodos)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          {step === 3 ? (
            <button type="button" onClick={onClose} className="btn btn-primary text-sm">
              Cerrar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={importing}
                className="btn border border-gray-200 dark:border-gray-700 text-sm"
              >
                Cancelar
              </button>
              {step === 2 && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!canImport}
                  className="btn btn-primary text-sm disabled:opacity-50"
                >
                  {importing ? 'Importando…' : 'Importar selección'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

export default ImportarConfigProyectoModal;

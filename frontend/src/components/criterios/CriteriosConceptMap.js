import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { CRITERIO_LEVELS } from './constants';
import { RAMA_META, effectiveOmoeRama } from './ramaContext';
import { canAddChildNode } from './nivelArbolRules';
import {
  DEPTH_STYLES,
  PENDING_STYLE,
  INACTIVE_STYLE,
  MAP_LABEL_COL_W,
  buildConceptMapRoots,
  layoutConceptTree,
  getTreeBounds,
  getDepthRowPositions,
  collectLinks,
  collectRowSiblingGroups,
  findSiblingGroupForMeta,
  computeReorderedIds,
  nodeBoxWidth,
  nodeBoxHeight,
} from './conceptMapUtils';
import { downloadDrawioDiagram, diagramFilename, openDrawioDiagramInNewTab } from './drawioExportApi';
import { resolveEditSelection } from './treeUtils';

function IconMoreVertical({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="8" cy="3" r="1.35" />
      <circle cx="8" cy="8" r="1.35" />
      <circle cx="8" cy="13" r="1.35" />
    </svg>
  );
}

function ExportOptionsMenu({
  items,
  disabled = false,
  label = 'Opciones de exportación',
  align = 'right',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-navy-800 transition disabled:opacity-40"
      >
        <IconMoreVertical />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-1 min-w-[16rem] py-1 rounded-lg border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className="w-full text-left text-[11px] px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-navy-800 disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function buildExportMenuItems({
  onDownloadStructure,
  onOpenStructure,
  onDownloadEscenarios,
  onOpenEscenarios,
  disabled,
}) {
  return [
    {
      key: 'download-structure',
      label: 'Árbol completo (sin pesos) — Descargar',
      disabled,
      onClick: onDownloadStructure,
    },
    {
      key: 'open-structure',
      label: 'Árbol completo (sin pesos) — Abrir',
      disabled,
      onClick: onOpenStructure,
    },
    {
      key: 'download-escenarios',
      label: 'Por escenario (pesos activos) — Descargar',
      disabled,
      onClick: onDownloadEscenarios,
    },
    {
      key: 'open-escenarios',
      label: 'Por escenario (pesos activos) — Abrir',
      disabled,
      onClick: onOpenEscenarios,
    },
  ];
}

function depthStyle(depth) {
  return DEPTH_STYLES[Math.min(depth, DEPTH_STYLES.length - 1)];
}

function nodeStyle(meta) {
  if (meta.hasPending) return PENDING_STYLE;
  if (meta.level === CRITERIO_LEVELS.NODO_ARBOL && meta.aplica === false) {
    return INACTIVE_STYLE;
  }
  return depthStyle(meta.depth);
}

function isNodeSelected(selection, meta) {
  return (
    selection?.mode === 'edit' &&
    selection.level === meta.level &&
    String(selection.node?.id) === String(meta.node.id)
  );
}

function showPesoOnNode(meta) {
  return (
    meta.aplica !== false
    && meta.peso != null
    && meta.peso !== ''
    && meta.level !== CRITERIO_LEVELS.OMOE
  );
}

function canAddChildFromMeta(meta, niveles = []) {
  if (meta.level === CRITERIO_LEVELS.OMOE) {
    return canAddChildNode(CRITERIO_LEVELS.OMOE, meta.node, niveles);
  }
  if (meta.level === CRITERIO_LEVELS.NODO_ARBOL) {
    return canAddChildNode(CRITERIO_LEVELS.NODO_ARBOL, meta.node, niveles);
  }
  return false;
}

function LevelLabelsColumn({ rows, height }) {
  return (
    <div
      className="relative shrink-0 pr-2 border-r border-gray-200/80 dark:border-navy-700/60"
      style={{ width: MAP_LABEL_COL_W, height }}
    >
      {rows.map(({ depth, label, y }) => (
        <span
          key={depth}
          className="absolute left-0 right-2 text-[8px] font-bold uppercase leading-tight text-gray-500 dark:text-gray-400 text-right"
          style={{ top: y - 7 }}
          title={label}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function ConceptMapSvg({
  layoutRoot,
  forest,
  selection,
  onSelect,
  markerId,
  editMode,
  siblingGroups,
  onAddChild,
  onReorder,
  searchMatchKeys,
  focusedKey,
  searchActive,
  niveles = [],
}) {
  const bounds = useMemo(() => getTreeBounds(layoutRoot), [layoutRoot]);
  const links = useMemo(() => collectLinks(layoutRoot), [layoutRoot]);
  const [dragState, setDragState] = useState(null);
  const reorderingRef = useRef(false);

  const nodes = [];
  function walk(n) {
    nodes.push(n);
    (n.children || []).forEach(walk);
  }
  walk(layoutRoot);

  const handleSelect = (meta) => {
    onSelect(resolveEditSelection(forest, meta.level, meta.node.id));
  };

  const finishDrag = useCallback(async (state, clientX) => {
    if (!state || reorderingRef.current) return;
    const offsetX = clientX - state.startClientX;
    setDragState(null);
    if (Math.abs(offsetX) < 6) {
      onSelect(resolveEditSelection(forest, state.meta.level, state.meta.node.id));
      return;
    }

    const ids = computeReorderedIds(state.group.siblings, state.meta, offsetX);
    if (!ids?.length || !onReorder) return;

    try {
      reorderingRef.current = true;
      await onReorder(ids);
    } finally {
      reorderingRef.current = false;
    }
  }, [onReorder, onSelect, forest]);

  const handlePointerDown = (e, meta) => {
    if (!editMode || meta.level !== CRITERIO_LEVELS.NODO_ARBOL) {
      handleSelect(meta);
      return;
    }
    const group = findSiblingGroupForMeta(siblingGroups, meta);
    if (!group) {
      handleSelect(meta);
      return;
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({ meta, group, startClientX: e.clientX });
  };

  const handlePointerMove = (e) => {
    if (!dragState) return;
    setDragState((s) => ({ ...s, currentClientX: e.clientX }));
  };

  const handlePointerUp = (e) => {
    if (!dragState) return;
    finishDrag(dragState, e.clientX);
  };

  const dragOffsetX = dragState
    ? (dragState.currentClientX ?? dragState.startClientX) - dragState.startClientX
    : 0;

  return (
    <svg
      width={bounds.width}
      height={bounds.height}
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      className="block shrink-0"
      role="img"
      aria-label="Mapa conceptual de criterios"
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="4"
          markerHeight="4"
          refX="3.5"
          refY="2"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L4,2 L0,4 Z" fill="#94a3b8" />
        </marker>
      </defs>

      {links.map((link) => (
        <path
          key={link.key}
          d={link.path}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.25"
          markerEnd={link.arrow ? `url(#${markerId})` : undefined}
        />
      ))}

      {nodes.map((meta) => {
        const nodeKey = `${meta.level}-${meta.node.id}`;
        const style = nodeStyle(meta);
        const selected = isNodeSelected(selection, meta);
        const isMatch = searchActive && searchMatchKeys?.has(nodeKey);
        const isFocused = searchActive && focusedKey === nodeKey;
        const dimmed = searchActive && !isMatch;
        const w = nodeBoxWidth(meta);
        const h = nodeBoxHeight(meta);
        const cx = meta.x + w / 2;
        const cy = meta.y + h / 2;
        const isOmoe = meta.level === CRITERIO_LEVELS.OMOE;
        const ramaLabel = meta.rama ? (RAMA_META[meta.rama]?.label || meta.rama.toUpperCase()) : '';
        const isDragging =
          dragState
          && dragState.meta.level === meta.level
          && String(dragState.meta.node.id) === String(meta.node.id);
        const translateX = isDragging ? dragOffsetX : 0;
        const canAdd = editMode && canAddChildFromMeta(meta, niveles);
        const isDraggable =
          editMode
          && meta.level === CRITERIO_LEVELS.NODO_ARBOL
          && Boolean(findSiblingGroupForMeta(siblingGroups, meta));

        let stroke = style.stroke;
        let strokeWidth = 1.5;
        if (isFocused) {
          stroke = '#f59e0b';
          strokeWidth = 3;
        } else if (isMatch) {
          stroke = '#10b981';
          strokeWidth = 2.5;
        } else if (selected) {
          stroke = '#fbbf24';
          strokeWidth = 2.5;
        }

        return (
          <g
            key={nodeKey}
            transform={translateX ? `translate(${translateX}, 0)` : undefined}
            opacity={dimmed ? 0.22 : 1}
            onPointerDown={(e) => handlePointerDown(e, meta)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(meta);
              }
            }}
          >
            {!isOmoe && <title>{meta.nombre}</title>}
            <rect
              x={meta.x}
              y={meta.y}
              width={w}
              height={h}
              rx={4}
              fill={style.fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={
                meta.aplica === false && meta.level === CRITERIO_LEVELS.NODO_ARBOL ? '3 2' : undefined
              }
            />
            {isOmoe ? (
              <>
                <title>{`${meta.nombre} · ${ramaLabel}`}</title>
                <foreignObject x={meta.x} y={meta.y} width={w} height={h}>
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    className="w-full h-full flex flex-col justify-center px-2 py-1 pointer-events-none overflow-hidden"
                  >
                    <span
                      className="text-[10px] font-semibold leading-tight truncate"
                      style={{ color: style.text }}
                      title={meta.nombre}
                    >
                      {meta.nombre}
                    </span>
                    <span
                      className="text-[8px] font-bold uppercase tracking-wide mt-0.5 opacity-90"
                      style={{ color: style.text }}
                    >
                      {ramaLabel}
                    </span>
                  </div>
                </foreignObject>
              </>
            ) : (
              showPesoOnNode(meta) && (
                <text
                  x={cx}
                  y={cy + 3.5}
                  textAnchor="middle"
                  fill={style.text}
                  style={{ fontFamily: 'inherit', fontSize: 8, fontWeight: 700, pointerEvents: 'none' }}
                >
                  {Number(meta.peso).toFixed(meta.peso % 1 === 0 ? 0 : 2)}
                </text>
              )
            )}
            {canAdd && (
              <g
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(meta.level, meta.node);
                }}
                className="cursor-pointer"
                role="button"
                aria-label="Agregar hijo"
              >
                <circle
                  cx={cx}
                  cy={meta.y + h + 9}
                  r={7}
                  fill="#ffffff"
                  stroke="#1d4ed8"
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={meta.y + h + 12}
                  textAnchor="middle"
                  fill="#1d4ed8"
                  style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}
                >
                  +
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ConceptMapRow({
  map,
  forest,
  selection,
  onSelect,
  niveles,
  editMode,
  onAddChild,
  onReorder,
  rowRef,
  searchMatchKeys,
  focusedKey,
  searchActive,
  showDimensionHeader = false,
  onExport,
  exportBusy = false,
}) {
  const omoe = forest.find((o) => o.id === map.omoeId);
  const rama = omoe ? effectiveOmoeRama(omoe) : 'omoe';
  const ramaBadge = RAMA_META[rama];
  const bounds = useMemo(() => getTreeBounds(map.layout), [map.layout]);
  const depthRows = useMemo(
    () => getDepthRowPositions(map.layout, niveles),
    [map.layout, niveles],
  );
  const siblingGroups = useMemo(
    () => collectRowSiblingGroups(map.layout),
    [map.layout],
  );
  const markerId = `map-arrow-${map.omoeId}`;

  return (
    <div ref={rowRef} className="mb-8 last:mb-2 w-max min-w-full">
      {showDimensionHeader && (
        <div className="flex items-center gap-2 mb-2 px-1 max-w-full">
          <div className="min-w-0 flex items-center gap-2">
            <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
              {map.omoeNombre}
            </h3>
            {ramaBadge && (
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${ramaBadge.badgeClass}`}>
                {ramaBadge.label}
              </span>
            )}
            <ExportOptionsMenu
              align="left"
              disabled={exportBusy}
              label={`Exportar diagrama de ${map.omoeNombre}`}
              items={buildExportMenuItems({
                disabled: exportBusy,
                onDownloadStructure: () => onExport?.('download', map.omoeId, { escenarios: false }),
                onOpenStructure: () => onExport?.('open', map.omoeId, { escenarios: false }),
                onDownloadEscenarios: () => onExport?.('download', map.omoeId, { escenarios: true }),
                onOpenEscenarios: () => onExport?.('open', map.omoeId, { escenarios: true }),
              })}
            />
          </div>
        </div>
      )}
      <div className="flex w-max min-w-full">
      <LevelLabelsColumn rows={depthRows} height={bounds.height} />
      <ConceptMapSvg
        layoutRoot={map.layout}
        forest={forest}
        selection={selection}
        onSelect={onSelect}
        markerId={markerId}
        editMode={editMode}
        siblingGroups={siblingGroups}
        onAddChild={onAddChild}
        onReorder={onReorder}
        searchMatchKeys={searchMatchKeys}
        focusedKey={focusedKey}
        searchActive={searchActive}
        niveles={niveles}
      />
      </div>
    </div>
  );
}

function collectLayoutNodes(maps) {
  const out = [];
  maps.forEach((map) => {
    function walk(n) {
      out.push({
        key: `${n.level}-${n.node.id}`,
        omoeId: map.omoeId,
        omoeNombre: map.omoeNombre,
        level: n.level,
        nodeId: n.node.id,
        nombre: n.nombre,
        meta: n,
      });
      (n.children || []).forEach(walk);
    }
    walk(map.layout);
  });
  return out;
}

function ConceptMapSearchBar({
  searchQuery,
  onSearchChange,
  matchCount,
  focusIndex,
  onPrev,
  onNext,
  onClear,
  onSelectFocused,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else if (matchCount > 0) onSelectFocused?.();
      else onNext();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNext();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onPrev();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 w-full max-w-xl">
      <div className="relative flex-1 min-w-[10rem]">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar nodo por nombre o código…"
          className="w-full text-xs pl-8 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-navy-900 text-gray-800 dark:text-gray-100 input-focus"
          aria-label="Buscar nodo en el mapa"
        />
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm"
          aria-hidden
        >
          ⌕
        </span>
        {searchQuery && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>
      {searchQuery.trim() && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums min-w-[4.5rem] text-center">
            {matchCount === 0
              ? 'Sin resultados'
              : `${focusIndex + 1} / ${matchCount}`}
          </span>
          <button
            type="button"
            onClick={onPrev}
            disabled={matchCount <= 1}
            className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700/60 disabled:opacity-40"
            aria-label="Resultado anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={matchCount <= 1}
            className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700/60 disabled:opacity-40"
            aria-label="Siguiente resultado"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

function CriteriosConceptMap({
  proyectoId,
  forest,
  selection,
  onSelect,
  loading,
  nivelesByRama = {},
  editMode = false,
  onEditModeChange,
  onAddChild,
  onReorder,
}) {
  const maps = useMemo(() => {
    return buildConceptMapRoots(forest).map((item) => ({
      ...item,
      layout: layoutConceptTree(item.root),
    }));
  }, [forest]);

  const [searchQuery, setSearchQuery] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportScope, setExportScope] = useState('all');
  const scrollRef = useRef(null);
  const rowRefs = useRef({});

  const allLayoutNodes = useMemo(() => collectLayoutNodes(maps), [maps]);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allLayoutNodes.filter((n) => {
      const nombre = (n.nombre || '').toLowerCase();
      const codigo = (n.meta.node?.codigo || '').toLowerCase();
      return nombre.includes(q) || codigo.includes(q);
    });
  }, [allLayoutNodes, searchQuery]);

  const searchMatchKeys = useMemo(
    () => new Set(matches.map((m) => m.key)),
    [matches],
  );

  const searchActive = searchQuery.trim().length > 0;
  const focusedKey = matches[focusIndex]?.key ?? null;

  useEffect(() => {
    setFocusIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const match = matches[focusIndex];
    if (!match || !scrollRef.current) return;

    const scrollEl = scrollRef.current;
    const rowEl = rowRefs.current[match.omoeId];
    if (!rowEl) return;

    const w = nodeBoxWidth(match.meta);
    const h = nodeBoxHeight(match.meta);
    const nodeCenterX = MAP_LABEL_COL_W + match.meta.x + w / 2;
    const nodeCenterY = match.meta.y + h / 2;

    const targetLeft = rowEl.offsetLeft + nodeCenterX - scrollEl.clientWidth * 0.4;
    const targetTop = rowEl.offsetTop + nodeCenterY - scrollEl.clientHeight * 0.35;

    scrollEl.scrollTo({
      left: Math.max(0, targetLeft),
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [matches, focusIndex]);

  const goNextMatch = useCallback(() => {
    if (matches.length <= 1) return;
    setFocusIndex((i) => (i + 1) % matches.length);
  }, [matches.length]);

  const goPrevMatch = useCallback(() => {
    if (matches.length <= 1) return;
    setFocusIndex((i) => (i - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFocusIndex(0);
  }, []);

  const selectFocusedMatch = useCallback(() => {
    const match = matches[focusIndex];
    if (!match) return;
    onSelect(resolveEditSelection(forest, match.level, match.nodeId));
  }, [matches, focusIndex, forest, onSelect]);

  const multipleDimensions = maps.length > 1;

  useEffect(() => {
    if (!multipleDimensions) {
      setExportScope(maps[0]?.omoeId ? String(maps[0].omoeId) : 'all');
      return;
    }
    setExportScope((prev) => {
      if (prev === 'all') return prev;
      return maps.some((m) => String(m.omoeId) === prev) ? prev : 'all';
    });
  }, [maps, multipleDimensions]);

  const runExport = useCallback(async (mode, omoeIdOverride = null, { escenarios = false } = {}) => {
    if (!proyectoId || exportBusy) return;
    setExportBusy(true);
    setExportError('');
    try {
      let omoeId = omoeIdOverride;
      if (omoeId == null) {
        omoeId = exportScope === 'all' ? null : Number(exportScope);
      }
      const map = omoeId != null ? maps.find((m) => m.omoeId === omoeId) : null;
      const filename = diagramFilename(map?.omoeNombre, { all: omoeId == null, escenarios });
      const opts = { omoeId, filename, escenarios };
      if (mode === 'download') {
        await downloadDrawioDiagram(proyectoId, opts);
      } else {
        await openDrawioDiagramInNewTab(proyectoId, opts);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail
        || err?.message
        || 'No se pudo exportar el diagrama.';
      setExportError(typeof msg === 'string' ? msg : 'No se pudo exportar el diagrama.');
    } finally {
      setExportBusy(false);
    }
  }, [proyectoId, exportScope, maps, exportBusy]);

  const scopedMap = exportScope === 'all'
    ? null
    : maps.find((m) => String(m.omoeId) === exportScope);
  const toolbarExportItems = buildExportMenuItems({
    disabled: exportBusy || !proyectoId,
    onDownloadStructure: () => runExport('download', null, { escenarios: false }),
    onOpenStructure: () => runExport('open', null, { escenarios: false }),
    onDownloadEscenarios: () => runExport('download', null, { escenarios: true }),
    onOpenEscenarios: () => runExport('open', null, { escenarios: true }),
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500" />
      </div>
    );
  }

  if (!maps.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 px-2">
        No hay dimensiones. Cree una en la vista Árbol.
      </p>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-navy-950 dark:to-navy-900">
      <div className="shrink-0 px-3 pt-2 pb-2 flex flex-col gap-2">
        <ConceptMapSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          matchCount={matches.length}
          focusIndex={focusIndex}
          onPrev={goPrevMatch}
          onNext={goNextMatch}
          onClear={clearSearch}
          onSelectFocused={selectFocusedMatch}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {multipleDimensions && (
              <label className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-300">
                <span className="shrink-0">Dimensión:</span>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="text-[10px] max-w-[11rem] py-1 px-2 rounded-md border border-gray-200 dark:border-navy-700 bg-white dark:bg-navy-900 truncate"
                  aria-label="Dimensión a exportar"
                >
                  <option value="all">Todas las dimensiones</option>
                  {maps.map((map) => (
                    <option key={map.omoeId} value={String(map.omoeId)}>
                      {map.omoeNombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="text-[10px] text-gray-400">
              Mapa · verde = coincidencia · ámbar = foco · gris atenuado = no coincide
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEditModeChange && (
              <button
                type="button"
                onClick={() => onEditModeChange(!editMode)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition ${
                  editMode
                    ? 'bg-navy-600 text-white border-navy-600'
                    : 'bg-white dark:bg-navy-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-navy-700'
                }`}
              >
                {editMode ? 'Salir edición' : 'Modo edición'}
              </button>
            )}
            <ExportOptionsMenu
              disabled={exportBusy || !proyectoId}
              label={scopedMap
                ? `Exportar diagrama de ${scopedMap.omoeNombre}`
                : 'Exportar diagramas'}
              items={toolbarExportItems}
            />
          </div>
        </div>
        {exportError && (
          <p className="text-[10px] text-red-600 dark:text-red-400 text-center px-2">
            {exportError}
          </p>
        )}
      </div>
      {editMode && (
        <p className="text-[10px] text-navy-600 dark:text-navy-400 text-center px-3 pb-2 shrink-0">
          Arrastra nodos en la misma fila para reordenar · pulsa + en un padre para crear hijo
        </p>
      )}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto px-3 pb-3">
        {maps.map((map) => {
          const omoe = forest.find((o) => o.id === map.omoeId);
          const rama = omoe ? effectiveOmoeRama(omoe) : 'omoe';
          const niveles = nivelesByRama[rama] || [];
          return (
          <ConceptMapRow
            key={map.omoeId}
            map={map}
            forest={forest}
            selection={selection}
            onSelect={onSelect}
            niveles={niveles}
            editMode={editMode}
            onAddChild={onAddChild}
            onReorder={onReorder}
            showDimensionHeader={multipleDimensions}
            onExport={runExport}
            exportBusy={exportBusy}
            rowRef={(el) => {
              if (el) rowRefs.current[map.omoeId] = el;
              else delete rowRefs.current[map.omoeId];
            }}
            searchMatchKeys={searchMatchKeys}
            focusedKey={focusedKey}
            searchActive={searchActive}
          />
          );
        })}
      </div>
    </div>
  );
}

export default CriteriosConceptMap;

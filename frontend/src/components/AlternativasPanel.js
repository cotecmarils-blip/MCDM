import React, { useState, useEffect, useCallback } from 'react';
import { alternativas } from '../api';
import SplitColumnLayout from '../layout/SplitColumnLayout';
import AlternativasListSidebar from './AlternativasListSidebar';
import AlternativaDetailPanel from './AlternativaDetailPanel';
import CaracteristicasPlantillaModal from './CaracteristicasPlantillaModal';
import RequisitosPanel from './RequisitosPanel';
import ExportablesDropdown from './evaluacion/ExportablesDropdown';
import { downloadJson } from './simulaciones/simulacionGraficosUtils';
import { useProjectPermissions } from '../hooks/useProjectPermissions';

const VIEWS = {
  ALTERNATIVAS: 'alternativas',
  REQUISITOS: 'requisitos',
};

function AlternativasPanel({ proyectoId }) {
  const { isProveedor, canCreateAlternativa, canWrite } =
    useProjectPermissions(proyectoId);
  const canViewAlternativas = !isProveedor;

  const defaultView = isProveedor ? VIEWS.REQUISITOS : VIEWS.ALTERNATIVAS;
  const [activeView, setActiveView] = useState(defaultView);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [configPlantillasOpen, setConfigPlantillasOpen] = useState(false);
  const [plantillasVersion, setPlantillasVersion] = useState(0);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    if (isProveedor) {
      setActiveView(VIEWS.REQUISITOS);
    }
  }, [isProveedor]);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!canViewAlternativas) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const response = await alternativas.getByProyecto(proyectoId);
      setItems(response.data);
    } catch (err) {
      console.error('Error cargando alternativas:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [proyectoId, canViewAlternativas]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleNew = () => {
    setIsNew(true);
    setSelectedId(null);
  };

  const handleSelect = (id) => {
    setIsNew(false);
    setSelectedId(id);
  };

  const handleSaved = (id) => {
    setIsNew(false);
    setSelectedId(id);
    loadList({ silent: true });
  };

  const handleDeleted = () => {
    setSelectedId(null);
    setIsNew(false);
    loadList({ silent: true });
  };

  const handleExportJson = () => {
    const payload = {
      proyecto_id: proyectoId,
      total: items.length,
      exportado_en: new Date().toISOString(),
      alternativas: items,
    };
    downloadJson(payload, `alternativas-proyecto-${proyectoId}.json`);
  };

  const handleExportWord = async () => {
    try {
      setExporting('word');
      const res = await alternativas.exportWord(proyectoId);
      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      if (blob.type && blob.type.includes('json')) {
        const text = await blob.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed.detail || 'No se pudo generar el informe de alternativas.');
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alternativas-proyecto-${proyectoId}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando alternativas a Word:', err);
      window.alert(err.message || 'No se pudo generar el informe de alternativas.');
    } finally {
      setExporting(null);
    }
  };

  const exportItems = [
    {
      key: 'word',
      label: exporting === 'word' ? 'Generando Word…' : 'Exportar Word (con fotos)',
      description: 'Documento .docx con una ficha por alternativa: datos, capacidades, características y fotos.',
      onClick: handleExportWord,
      disabled: Boolean(exporting) || items.length === 0,
    },
    {
      key: 'json',
      label: 'Exportar JSON',
      description: 'Datos completos de las alternativas del proyecto en formato JSON.',
      onClick: handleExportJson,
      disabled: items.length === 0,
    },
  ];

  const tabClass = (view) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeView === view
        ? 'bg-navy-800 text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-900/50'
    }`;

  if (isProveedor) {
    return (
      <div className="flex-1 min-h-0 flex flex-col h-full">
        <RequisitosPanel proyectoId={proyectoId} embedded canWrite={canWrite} />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col h-full">
        <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
          {canViewAlternativas && (
            <button
              type="button"
              className={tabClass(VIEWS.ALTERNATIVAS)}
              onClick={() => setActiveView(VIEWS.ALTERNATIVAS)}
            >
              Alternativas
            </button>
          )}
          <button
            type="button"
            className={tabClass(VIEWS.REQUISITOS)}
            onClick={() => setActiveView(VIEWS.REQUISITOS)}
          >
            Requisitos
          </button>
          {canViewAlternativas && activeView === VIEWS.ALTERNATIVAS && (
            <div className="ml-auto">
              <ExportablesDropdown
                label={exporting ? 'Exportando…' : 'Exportables'}
                items={exportItems}
                disabled={Boolean(exporting)}
              />
            </div>
          )}
        </div>

        {activeView === VIEWS.REQUISITOS ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <RequisitosPanel proyectoId={proyectoId} embedded canWrite={canWrite} />
          </div>
        ) : (
          <SplitColumnLayout
            title="Alternativas"
            description="En cada alternativa eliges qué características del catálogo aplican y cargas el dato."
            left={
              <AlternativasListSidebar
                items={items}
                selectedId={selectedId}
                isNew={isNew}
                onSelect={handleSelect}
                onNew={handleNew}
                loading={loading}
                canCreate={canCreateAlternativa}
              />
            }
            right={
              <AlternativaDetailPanel
                proyectoId={proyectoId}
                alternativaId={selectedId}
                isNew={isNew}
                plantillasVersion={plantillasVersion}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
                onCancelNew={() => setIsNew(false)}
                onOpenConfigPlantillas={() => setConfigPlantillasOpen(true)}
                canCreate={canCreateAlternativa}
                canWrite={canWrite}
              />
            }
          />
        )}
      </div>

      {configPlantillasOpen && (
        <CaracteristicasPlantillaModal
          proyectoId={proyectoId}
          onClose={() => setConfigPlantillasOpen(false)}
          onSaved={() => setPlantillasVersion((v) => v + 1)}
        />
      )}
    </>
  );
}

export default AlternativasPanel;

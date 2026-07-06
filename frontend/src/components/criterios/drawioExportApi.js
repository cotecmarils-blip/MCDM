import { proyectos, API_BASE_URL } from '../../api';

function slugify(text, fallback = 'mapa') {
  const slug = String(text || fallback).replace(/\s+/g, '_').slice(0, 40);
  return slug || fallback;
}

async function fetchDiagramXml(proyectoId, omoeId = null, { escenarios = false } = {}) {
  const fetcher = escenarios ? proyectos.exportDiagramEscenarios : proyectos.exportDiagram;
  const res = await fetcher(proyectoId, omoeId);
  const xml = res.data;
  if (!xml || !String(xml).includes('<mxfile')) {
    throw new Error('La respuesta del servidor no es un diagrama draw.io válido.');
  }
  return xml;
}

export async function fetchDrawioDraftXml(token, proyectoId) {
  const params = new URLSearchParams({ proyecto: String(proyectoId) });
  const res = await fetch(`${API_BASE_URL}/diagram-draft/${encodeURIComponent(token)}/?${params}`);
  if (!res.ok) {
    let detail = 'El borrador del diagrama no existe o ya expiró.';
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const xml = await res.text();
  if (!xml.includes('<mxfile')) {
    throw new Error('La respuesta del servidor no es un diagrama draw.io válido.');
  }
  return xml;
}

export async function downloadDrawioDiagram(
  proyectoId,
  { omoeId = null, filename, escenarios = false } = {},
) {
  const xml = await fetchDiagramXml(proyectoId, omoeId, { escenarios });
  const blob = new Blob([xml], { type: 'application/vnd.jgraph.mxfile+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${slugify('mapa_criterios')}.drawio`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function openDrawioDiagramInNewTab(
  proyectoId,
  { omoeId = null, escenarios = false } = {},
) {
  const { data } = await proyectos.createDiagramDraft(proyectoId, omoeId, { escenarios });
  const token = data?.token;
  if (!token) {
    throw new Error('No se pudo preparar el diagrama para abrir en draw.io.');
  }

  const params = new URLSearchParams({ token });
  const url = `${window.location.origin}/proyecto/${proyectoId}/diagrama-drawio?${params.toString()}`;
  const opened = window.open(url, '_blank');
  if (!opened) {
    throw new Error('El navegador bloqueó la ventana emergente. Permita ventanas emergentes para este sitio.');
  }
}

export function diagramFilename(omoeNombre, { all = false, escenarios = false } = {}) {
  if (all) return escenarios ? 'mapa_escenarios.drawio' : 'mapa_criterios.drawio';
  const base = slugify(omoeNombre, 'dimension');
  return escenarios ? `${base}_escenarios.drawio` : `${base}.drawio`;
}

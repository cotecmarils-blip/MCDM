import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../ThemeContext';
import { alternativas } from '../api';
import AlternativaCard from './AlternativaCard';

function AlternativasList({ proyectoId, onRefresh, refreshTrigger }) {
  const { isDark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const loadAlternativas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await alternativas.getByProyecto(proyectoId);
      setItems(response.data);
    } catch (err) {
      console.error('Error cargando alternativas:', err);
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    loadAlternativas();
  }, [loadAlternativas, refreshTrigger]);

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta alternativa?')) {
      try {
        await alternativas.delete(id);
        onRefresh();
      } catch (err) {
        console.error('Error eliminando:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-500"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <p className="text-lg">No hay alternativas aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <AlternativaCard
          key={item.id}
          alternativa={item}
          isSelected={selectedId === item.id}
          onSelect={() => setSelectedId(item.id === selectedId ? null : item.id)}
          onDelete={() => handleDelete(item.id)}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

export default AlternativasList;

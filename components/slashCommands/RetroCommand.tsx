'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface RetroSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  items: { text: string; userId: string; userName: string }[];
}

interface RetroCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  sections: RetroSection[];
  type: 'rose-bud-thorn' | 'sailboat' | 'start-stop-continue' | 'swot' | 'soar' | 'six-hats' | 'crazy-8s' | 'affinity-map' | 'scamper' | 'starbursting' | 'reverse-brainstorm' | 'worst-idea' | 'empathy-map' | 'moscow' | '4ls' | 'pre-mortem' | 'starfish' | 'mad-sad-glad' | 'how-might-we';
  createdBy: string;
  closed: boolean;
  icon: React.ReactNode;
  gradient: string;
  border: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function RetroCommand({
  projectId,
  messageId,
  channelId,
  title,
  sections: initialSections,
  type,
  createdBy,
  closed: initialClosed,
  icon,
  gradient,
  border,
  onClose,
  onUpdate
}: RetroCommandProps) {
  const { data: session } = useSession();
  const [sections, setSections] = useState(initialSections);
  const [closed, setClosed] = useState(initialClosed);
  const [newItems, setNewItems] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado cuando llegan actualizaciones de Pusher
  useEffect(() => {
    setSections(initialSections);
    setClosed(initialClosed);
  }, [initialSections, initialClosed]);

  const handleAddItem = async (sectionId: string) => {
    const text = newItems[sectionId]?.trim();
    if (!text || !session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/retro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, text })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setSections(data.commandData.sections);
      setNewItems({ ...newItems, [sectionId]: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error al agregar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (sectionId: string, itemIndex: number) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/retro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, itemIndex })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al eliminar');
        return;
      }

      const data = await response.json();
      setSections(data.commandData.sections);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error al eliminar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'retro',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/retro`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al cerrar');
        return;
      }

      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error closing:', error);
      alert('Error al cerrar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={cardRef} className={`bg-gradient-to-br ${gradient} rounded-lg border-2 ${border} p-6 my-2 shadow-lg`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${border.replace('border-', 'from-').replace('-400', '-500').replace('dark:border-', 'to-').replace('-600', '-600')}`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Retrospectiva {closed ? '• Cerrada' : '• Activa'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Sections Grid */}
      <div className={`grid gap-4 mb-4 ${sections.length === 4 ? 'grid-cols-1 lg:grid-cols-2' : sections.length === 6 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : sections.length === 8 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-white dark:bg-gray-700 rounded-lg p-4 border-l-4"
            style={{ borderLeftColor: section.color }}
          >
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span style={{ fontSize: '1.5em' }}>{section.icon}</span>
              {section.title}
            </h4>

            {/* Items */}
            <div className="space-y-2 mb-3">
              {section.items.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-600 rounded p-2 text-sm group relative"
                >
                  <p className="text-gray-800 dark:text-gray-100 pr-6">{item.text}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    — {item.userName}
                  </p>
                  {!closed && item.userId === session?.user?.id && (
                    <button
                      onClick={() => handleDeleteItem(section.id, index)}
                      disabled={submitting}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Item */}
            {!closed && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItems[section.id] || ''}
                  onChange={(e) => setNewItems({ ...newItems, [section.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddItem(section.id);
                    }
                  }}
                  placeholder="Agregar..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                />
                <button
                  onClick={() => handleAddItem(section.id)}
                  disabled={!newItems[section.id]?.trim() || submitting}
                  className="p-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Retrospectiva cerrada
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Retrospectiva
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/{type}</code>
      </div>
    </div>
  );
}

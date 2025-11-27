'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Lightbulb, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface MatrixItem {
  id: string;
  text: string;
  quadrant: 'incremental' | 'adjacent' | 'disruptive' | 'radical';
  userId: string;
  userName: string;
}

interface InnovationMatrixCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  items: MatrixItem[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const QUADRANTS = {
  incremental: {
    title: 'Incremental',
    description: 'Mejoras pequeñas a productos existentes',
    color: 'bg-green-100 dark:bg-green-900/30 border-green-400',
    position: 'Bajo riesgo, bajo retorno',
    icon: '📈'
  },
  adjacent: {
    title: 'Adjacent',
    description: 'Expansión a nuevos mercados o productos',
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-400',
    position: 'Riesgo moderado',
    icon: '🔄'
  },
  disruptive: {
    title: 'Disruptive',
    description: 'Nuevas tecnologías para mercados existentes',
    color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-400',
    position: 'Riesgo alto, alto retorno',
    icon: '⚡'
  },
  radical: {
    title: 'Radical',
    description: 'Nuevas tecnologías + nuevos mercados',
    color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-400',
    position: 'Máximo riesgo y potencial',
    icon: '🚀'
  }
};

export default function InnovationMatrixCommand({
  projectId,
  messageId,
  channelId,
  title,
  items: initialItems,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: InnovationMatrixCommandProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<MatrixItem[]>(initialItems || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newItems, setNewItems] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setItems(initialItems || []);
  }, [JSON.stringify(initialItems)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddItem = async (quadrant: keyof typeof QUADRANTS) => {
    const text = newItems[quadrant]?.trim();
    if (!session?.user || !text || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/innovation-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quadrant, text })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setItems(data.commandData.items || []);
      setNewItems({ ...newItems, [quadrant]: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/innovation-matrix`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(data.commandData.items || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'innovation-matrix',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/innovation-matrix`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getItemsByQuadrant = (quadrant: string) => items.filter(i => i.quadrant === quadrant);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <Lightbulb className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Innovation Matrix {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Axis Labels */}
      <div className="text-center mb-2">
        <span className="text-xs text-gray-500 uppercase">→ Novedad Tecnológica →</span>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Row 1: High Market Novelty */}
        <div className="text-right text-xs text-gray-500 pr-2 self-center col-span-2">
          ↑ Novedad de Mercado
        </div>

        {(Object.entries(QUADRANTS) as [keyof typeof QUADRANTS, typeof QUADRANTS.incremental][]).map(([key, config]) => {
          const quadrantItems = getItemsByQuadrant(key);
          return (
            <div key={key} className={`${config.color} rounded-lg p-3 border-2 min-h-[150px]`}>
              <div className="flex items-center gap-2 mb-2">
                <span>{config.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{config.title}</h4>
                  <p className="text-xs text-gray-500">{config.position}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{config.description}</p>

              <div className="space-y-1 mb-2">
                {quadrantItems.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded p-2 relative group shadow-sm">
                    <p className="text-xs text-gray-800 dark:text-gray-100 pr-5">{item.text}</p>
                    <p className="text-xs text-gray-500">— {item.userName}</p>
                    {!closed && item.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={submitting}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!closed && (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newItems[key] || ''}
                    onChange={(e) => setNewItems({ ...newItems, [key]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem(key)}
                    placeholder="Agregar idea..."
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    disabled={submitting}
                  />
                  <button
                    onClick={() => handleAddItem(key)}
                    disabled={!newItems[key]?.trim() || submitting}
                    className="p-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white rounded"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        {items.length} ideas mapeadas
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && items.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Matriz
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Matriz cerrada
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/innovation-matrix</code>
      </div>
    </div>
  );
}

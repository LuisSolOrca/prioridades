'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Target, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface MatrixItem {
  id: string;
  text: string;
  quadrant: 'quick-wins' | 'big-bets' | 'fill-ins' | 'time-sinks';
  userId: string;
  userName: string;
}

interface ImpactEffortCommandProps {
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
  'quick-wins': { label: 'Quick Wins', sublabel: 'Alto Impacto / Bajo Esfuerzo', color: 'bg-green-100 dark:bg-green-900/30 border-green-400', icon: '🚀' },
  'big-bets': { label: 'Big Bets', sublabel: 'Alto Impacto / Alto Esfuerzo', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-400', icon: '🎯' },
  'fill-ins': { label: 'Fill-Ins', sublabel: 'Bajo Impacto / Bajo Esfuerzo', color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400', icon: '📝' },
  'time-sinks': { label: 'Time Sinks', sublabel: 'Bajo Impacto / Alto Esfuerzo', color: 'bg-red-100 dark:bg-red-900/30 border-red-400', icon: '⚠️' }
};

export default function ImpactEffortCommand({
  projectId,
  messageId,
  channelId,
  title,
  items: initialItems,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: ImpactEffortCommandProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<MatrixItem[]>(initialItems || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newItem, setNewItem] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<MatrixItem['quadrant']>('quick-wins');
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems || []);
    setClosed(initialClosed);
  }, [initialItems, initialClosed]);

  const handleAddItem = async () => {
    if (!session?.user || !newItem.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/impact-effort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newItem.trim(), quadrant: selectedQuadrant })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setItems(data.commandData.items || []);
      setNewItem('');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/impact-effort`, {
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
        commandType: 'impact-effort',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/impact-effort`, {
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

  const getItemsByQuadrant = (quadrant: MatrixItem['quadrant']) =>
    items.filter(item => item.quadrant === quadrant);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <Target className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Matriz Impacto/Esfuerzo {closed ? '• Cerrada' : '• Activa'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(Object.keys(QUADRANTS) as Array<keyof typeof QUADRANTS>).map((quadrant) => {
          const config = QUADRANTS[quadrant];
          const quadrantItems = getItemsByQuadrant(quadrant);

          return (
            <div
              key={quadrant}
              className={`${config.color} rounded-lg p-3 border-2 min-h-[150px]`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{config.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{config.label}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{config.sublabel}</p>
                </div>
              </div>
              <div className="space-y-1">
                {quadrantItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-700 rounded p-2 text-sm group relative"
                  >
                    <p className="text-gray-800 dark:text-gray-100 pr-6">{item.text}</p>
                    <p className="text-xs text-gray-500 mt-1">— {item.userName}</p>
                    {!closed && item.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={submitting}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {quadrantItems.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-4">
                    Sin items
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Axis Labels */}
      <div className="flex justify-center mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>← Bajo Esfuerzo | Alto Esfuerzo →</p>
          <p className="mt-1">↑ Alto Impacto | Bajo Impacto ↓</p>
        </div>
      </div>

      {/* Add Item */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Nueva idea o tarea..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
          </div>
          <div className="flex gap-2 flex-wrap mb-2">
            {(Object.keys(QUADRANTS) as Array<keyof typeof QUADRANTS>).map((quadrant) => (
              <button
                key={quadrant}
                onClick={() => setSelectedQuadrant(quadrant)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  selectedQuadrant === quadrant
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {QUADRANTS[quadrant].icon} {QUADRANTS[quadrant].label}
              </button>
            ))}
          </div>
          <button
            onClick={handleAddItem}
            disabled={!newItem.trim() || submitting}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Agregar a {QUADRANTS[selectedQuadrant].label}
          </button>
        </div>
      )}

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
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/impact-effort</code>
      </div>
    </div>
  );
}

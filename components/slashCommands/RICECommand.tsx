'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Calculator, ArrowUpDown } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface RICEItem {
  id: string;
  name: string;
  reach: number;      // 1-10: personas alcanzadas
  impact: number;     // 0.25, 0.5, 1, 2, 3 (Mínimo, Bajo, Medio, Alto, Masivo)
  confidence: number; // 0.5, 0.8, 1 (Bajo, Medio, Alto)
  effort: number;     // 1-10: persona-semanas
  userId: string;
  userName: string;
}

interface RICECommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  items: RICEItem[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const IMPACT_OPTIONS = [
  { value: 0.25, label: 'Mínimo (0.25x)' },
  { value: 0.5, label: 'Bajo (0.5x)' },
  { value: 1, label: 'Medio (1x)' },
  { value: 2, label: 'Alto (2x)' },
  { value: 3, label: 'Masivo (3x)' }
];

const CONFIDENCE_OPTIONS = [
  { value: 0.5, label: 'Bajo (50%)' },
  { value: 0.8, label: 'Medio (80%)' },
  { value: 1, label: 'Alto (100%)' }
];

const calculateRICE = (item: RICEItem): number => {
  return (item.reach * item.impact * item.confidence) / item.effort;
};

export default function RICECommand({
  projectId,
  messageId,
  channelId,
  title,
  items: initialItems,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: RICECommandProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<RICEItem[]>(initialItems || []);
  const [closed, setClosed] = useState(initialClosed);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RICEItem | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    reach: 5,
    impact: 1,
    confidence: 0.8,
    effort: 3
  });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems || []);
    setClosed(initialClosed);
  }, [initialItems, initialClosed]);

  const handleAddItem = async () => {
    if (!session?.user || !newItem.name.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/rice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(data.commandData.items || []);
      setShowAddModal(false);
      setNewItem({ name: '', reach: 5, impact: 1, confidence: 0.8, effort: 3 });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateItem = async (item: RICEItem) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/rice`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', item })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(data.commandData.items || []);
      setEditingItem(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/rice`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', itemId })
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

  const handleCloseRICE = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'rice',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/rice`, {
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

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'score') {
      return calculateRICE(b) - calculateRICE(a);
    }
    return a.name.localeCompare(b.name);
  });

  const getScoreColor = (score: number) => {
    if (score >= 10) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    if (score >= 2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-400 dark:border-blue-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Calculator className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              RICE Scoring {closed ? '• Cerrado' : '• Activo'} • {items.length} items
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Formula explanation */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-mono font-bold">RICE = (Reach × Impact × Confidence) ÷ Effort</span>
        </p>
      </div>

      {/* Sort toggle */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setSortBy(sortBy === 'score' ? 'name' : 'score')}
          className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600"
        >
          <ArrowUpDown size={12} />
          Ordenar por: {sortBy === 'score' ? 'Puntuación' : 'Nombre'}
        </button>
      </div>

      {/* Items Table */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                <th className="p-2 text-left">Iniciativa</th>
                <th className="p-2 text-center w-16">R</th>
                <th className="p-2 text-center w-16">I</th>
                <th className="p-2 text-center w-16">C</th>
                <th className="p-2 text-center w-16">E</th>
                <th className="p-2 text-center w-20">Score</th>
                {!closed && <th className="p-2 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, index) => {
                const score = calculateRICE(item);
                return (
                  <tr key={item.id} className={`border-t border-gray-200 dark:border-gray-600 ${index === 0 ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                    <td className="p-2">
                      <div className="font-medium text-gray-800 dark:text-gray-100">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.userName}</div>
                    </td>
                    <td className="p-2 text-center text-gray-700 dark:text-gray-300">{item.reach}</td>
                    <td className="p-2 text-center text-gray-700 dark:text-gray-300">{item.impact}x</td>
                    <td className="p-2 text-center text-gray-700 dark:text-gray-300">{Math.round(item.confidence * 100)}%</td>
                    <td className="p-2 text-center text-gray-700 dark:text-gray-300">{item.effort}</td>
                    <td className="p-2 text-center">
                      <span className={`${getScoreColor(score)} text-white px-2 py-1 rounded font-bold`}>
                        {score.toFixed(1)}
                      </span>
                    </td>
                    {!closed && (
                      <td className="p-2">
                        {item.userId === session?.user?.id && (
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Button */}
      {!closed && (
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full mb-4 py-2 border-2 border-dashed border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Agregar Iniciativa
        </button>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Nueva Iniciativa</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Nombre de la iniciativa</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="¿Qué quieres priorizar?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Reach (Alcance)
                    <span className="text-xs text-gray-400 ml-1">personas/trimestre</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newItem.reach}
                    onChange={(e) => setNewItem({ ...newItem, reach: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Impact (Impacto)
                  </label>
                  <select
                    value={newItem.impact}
                    onChange={(e) => setNewItem({ ...newItem, impact: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  >
                    {IMPACT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Confidence (Confianza)
                  </label>
                  <select
                    value={newItem.confidence}
                    onChange={(e) => setNewItem({ ...newItem, confidence: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  >
                    {CONFIDENCE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Effort (Esfuerzo)
                    <span className="text-xs text-gray-400 ml-1">persona-semanas</span>
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={newItem.effort}
                    onChange={(e) => setNewItem({ ...newItem, effort: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Preview Score */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Score Preview</p>
                <span className={`${getScoreColor((newItem.reach * newItem.impact * newItem.confidence) / newItem.effort)} text-white px-4 py-2 rounded-lg font-bold text-xl`}>
                  {((newItem.reach * newItem.impact * newItem.confidence) / newItem.effort).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300">
                Cancelar
              </button>
              <button onClick={handleAddItem} disabled={!newItem.name.trim() || submitting} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && items.length > 0 && (
        <button onClick={handleCloseRICE} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar RICE Scoring
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          RICE Scoring cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/rice</code>
      </div>
    </div>
  );
}

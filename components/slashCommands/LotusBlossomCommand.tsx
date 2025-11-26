'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Flower2, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface PetalItem {
  text: string;
  userId: string;
  userName: string;
}

interface Petal {
  id: string;
  title: string;
  items: PetalItem[];
}

interface LotusBlossomCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  centerIdea: string;
  petals: Petal[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const PETAL_COLORS = [
  'bg-red-100 dark:bg-red-900/30 border-red-300',
  'bg-orange-100 dark:bg-orange-900/30 border-orange-300',
  'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300',
  'bg-green-100 dark:bg-green-900/30 border-green-300',
  'bg-teal-100 dark:bg-teal-900/30 border-teal-300',
  'bg-blue-100 dark:bg-blue-900/30 border-blue-300',
  'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300',
  'bg-purple-100 dark:bg-purple-900/30 border-purple-300',
];

export default function LotusBlossomCommand({
  projectId,
  messageId,
  channelId,
  title,
  centerIdea,
  petals: initialPetals,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: LotusBlossomCommandProps) {
  const { data: session } = useSession();
  const [petals, setPetals] = useState<Petal[]>(initialPetals || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newItems, setNewItems] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPetals(initialPetals || []);
    setClosed(initialClosed);
  }, [initialPetals, initialClosed]);

  const handleAddItem = async (petalId: string) => {
    const text = newItems[petalId]?.trim();
    if (!session?.user || !text || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lotus-blossom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petalId, text })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setPetals(data.commandData.petals || []);
      setNewItems({ ...newItems, [petalId]: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (petalId: string, itemIndex: number) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lotus-blossom`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petalId, itemIndex })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setPetals(data.commandData.petals || []);
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
        commandType: 'lotus-blossom',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lotus-blossom`, {
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

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-pink-400 dark:border-pink-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
            <Flower2 className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Lotus Blossom {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Center Idea */}
      <div className="flex justify-center mb-6">
        <div className="bg-pink-500 text-white rounded-full w-32 h-32 flex items-center justify-center p-4 shadow-lg">
          <p className="text-center text-sm font-semibold">{centerIdea || title}</p>
        </div>
      </div>

      {/* Petals Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {petals.map((petal, index) => (
          <div
            key={petal.id}
            className={`${PETAL_COLORS[index % PETAL_COLORS.length]} rounded-lg p-3 border-2`}
          >
            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-2 text-center">
              {petal.title}
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {petal.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="bg-white dark:bg-gray-700 rounded p-2 text-xs group relative"
                >
                  <p className="text-gray-800 dark:text-gray-100 pr-4">{item.text}</p>
                  <p className="text-gray-500 text-[10px] mt-1">— {item.userName}</p>
                  {!closed && item.userId === session?.user?.id && (
                    <button
                      onClick={() => handleDeleteItem(petal.id, itemIndex)}
                      disabled={submitting}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Item */}
            {!closed && (
              <div className="mt-2 flex gap-1">
                <input
                  type="text"
                  value={newItems[petal.id] || ''}
                  onChange={(e) => setNewItems({ ...newItems, [petal.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem(petal.id)}
                  placeholder="Agregar..."
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  disabled={submitting}
                />
                <button
                  onClick={() => handleAddItem(petal.id)}
                  disabled={!newItems[petal.id]?.trim() || submitting}
                  className="p-1 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 text-white rounded"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        {petals.reduce((sum, p) => sum + p.items.length, 0)} ideas en {petals.length} pétalos
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && petals.some(p => p.items.length > 0) && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Lotus Blossom
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Lotus Blossom cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/lotus-blossom</code>
      </div>
    </div>
  );
}

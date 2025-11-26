'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Fish } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Cause {
  id: string;
  text: string;
  userId: string;
  userName: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  causes: Cause[];
}

interface FishboneCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  problem: string;
  categories: Category[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  people: '#ef4444',
  process: '#f59e0b',
  technology: '#3b82f6',
  materials: '#10b981',
  environment: '#8b5cf6',
  measurement: '#ec4899'
};

export default function FishboneCommand({
  projectId,
  messageId,
  channelId,
  title,
  problem,
  categories: initialCategories,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: FishboneCommandProps) {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newCause, setNewCause] = useState<{ categoryId: string; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategories(initialCategories || []);
    setClosed(initialClosed);
  }, [initialCategories, initialClosed]);

  const handleAddCause = async () => {
    if (!session?.user || !newCause?.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/fishbone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: newCause.categoryId, text: newCause.text.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setCategories(data.commandData.categories || []);
      setNewCause(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCause = async (categoryId: string, causeId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/fishbone`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, causeId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setCategories(data.commandData.categories || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseFishbone = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'fishbone',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/fishbone`, {
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

  const topCategories = categories.slice(0, 3);
  const bottomCategories = categories.slice(3, 6);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-cyan-400 dark:border-cyan-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
            <Fish className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Diagrama de Ishikawa {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Fish Diagram */}
      <div className="relative bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 min-h-[400px]">
        {/* Fish Head - Problem */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            {/* Fish head shape */}
            <svg width="120" height="100" viewBox="0 0 120 100" className="transform">
              <path
                d="M0,50 Q30,20 60,10 Q90,0 110,25 Q120,50 110,75 Q90,100 60,90 Q30,80 0,50"
                fill="#ef4444"
                className="dark:fill-red-600"
              />
              {/* Eye */}
              <circle cx="85" cy="40" r="8" fill="white" />
              <circle cx="87" cy="38" r="4" fill="black" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pr-4">
              <p className="text-white text-xs font-bold text-center max-w-[80px] leading-tight">
                {problem || 'Problema'}
              </p>
            </div>
          </div>
        </div>

        {/* Spine */}
        <div className="absolute left-4 right-[140px] top-1/2 h-2 bg-gray-400 dark:bg-gray-500 -translate-y-1/2" />

        {/* Top bones (3 categories) */}
        <div className="absolute left-8 right-[160px] top-4 flex justify-around">
          {topCategories.map((category, index) => (
            <div key={category.id} className="flex flex-col items-center" style={{ width: '30%' }}>
              {/* Category label */}
              <div
                className="px-3 py-1 rounded-full text-white text-xs font-semibold mb-2 flex items-center gap-1"
                style={{ backgroundColor: CATEGORY_COLORS[category.id] || '#6b7280' }}
              >
                <span>{category.icon}</span>
                <span>{category.title}</span>
              </div>
              {/* Bone line going down to spine */}
              <div
                className="w-1 bg-gray-400 dark:bg-gray-500"
                style={{ height: `${60 + index * 20}px` }}
              />
              {/* Causes */}
              <div className="absolute top-12 space-y-1 max-w-[120px]">
                {category.causes.map((cause) => (
                  <div
                    key={cause.id}
                    className="bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-1 text-xs group relative shadow-sm"
                  >
                    <p className="text-gray-800 dark:text-gray-100 pr-4">{cause.text}</p>
                    {!closed && cause.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDeleteCause(category.id, cause.id)}
                        disabled={submitting}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
                {!closed && (
                  <button
                    onClick={() => setNewCause({ categoryId: category.id, text: '' })}
                    className="w-full text-xs text-gray-500 hover:text-cyan-600 flex items-center justify-center gap-1 py-1 border border-dashed border-gray-300 rounded hover:border-cyan-400"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bones (3 categories) */}
        <div className="absolute left-8 right-[160px] bottom-4 flex justify-around">
          {bottomCategories.map((category, index) => (
            <div key={category.id} className="flex flex-col items-center" style={{ width: '30%' }}>
              {/* Bone line going up to spine */}
              <div
                className="w-1 bg-gray-400 dark:bg-gray-500"
                style={{ height: `${60 + index * 20}px` }}
              />
              {/* Category label */}
              <div
                className="px-3 py-1 rounded-full text-white text-xs font-semibold mt-2 flex items-center gap-1"
                style={{ backgroundColor: CATEGORY_COLORS[category.id] || '#6b7280' }}
              >
                <span>{category.icon}</span>
                <span>{category.title}</span>
              </div>
              {/* Causes */}
              <div className="absolute bottom-12 space-y-1 max-w-[120px]">
                {category.causes.map((cause) => (
                  <div
                    key={cause.id}
                    className="bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-1 text-xs group relative shadow-sm"
                  >
                    <p className="text-gray-800 dark:text-gray-100 pr-4">{cause.text}</p>
                    {!closed && cause.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDeleteCause(category.id, cause.id)}
                        disabled={submitting}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
                {!closed && (
                  <button
                    onClick={() => setNewCause({ categoryId: category.id, text: '' })}
                    className="w-full text-xs text-gray-500 hover:text-cyan-600 flex items-center justify-center gap-1 py-1 border border-dashed border-gray-300 rounded hover:border-cyan-400"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Fish Tail */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <svg width="40" height="60" viewBox="0 0 40 60">
            <path
              d="M40,30 L10,5 Q0,30 10,55 L40,30"
              fill="#6b7280"
              className="dark:fill-gray-500"
            />
          </svg>
        </div>
      </div>

      {/* Add Cause Modal */}
      {newCause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Agregar Causa - {categories.find(c => c.id === newCause.categoryId)?.title}
            </h4>
            <input
              type="text"
              value={newCause.text}
              onChange={(e) => setNewCause({ ...newCause, text: e.target.value })}
              placeholder="¿Cuál es la causa?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddCause()}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setNewCause(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCause}
                disabled={!newCause.text.trim() || submitting}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-400"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleCloseFishbone}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Diagrama
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Diagrama cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/fishbone</code>
      </div>
    </div>
  );
}

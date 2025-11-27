'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BarChart3, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface KanoFeature {
  id: string;
  text: string;
  category: 'must-be' | 'one-dimensional' | 'attractive' | 'indifferent' | 'reverse';
  userId: string;
  userName: string;
}

interface KanoModelCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  features: KanoFeature[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const CATEGORIES = {
  'must-be': {
    title: 'Must-Be (Básicas)',
    description: 'Esperadas. Sin ellas, insatisfacción',
    color: 'bg-red-100 dark:bg-red-900/30 border-red-400',
    icon: '⚠️'
  },
  'one-dimensional': {
    title: 'One-Dimensional (Rendimiento)',
    description: 'Más es mejor. Satisfacción lineal',
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-400',
    icon: '📈'
  },
  'attractive': {
    title: 'Attractive (Deleite)',
    description: 'Inesperadas. Generan wow',
    color: 'bg-green-100 dark:bg-green-900/30 border-green-400',
    icon: '✨'
  },
  'indifferent': {
    title: 'Indifferent',
    description: 'No impactan satisfacción',
    color: 'bg-gray-100 dark:bg-gray-700 border-gray-400',
    icon: '😐'
  },
  'reverse': {
    title: 'Reverse',
    description: 'Causan insatisfacción si están',
    color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-400',
    icon: '🔄'
  }
};

export default function KanoModelCommand({
  projectId,
  messageId,
  channelId,
  title,
  features: initialFeatures,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: KanoModelCommandProps) {
  const { data: session } = useSession();
  const [features, setFeatures] = useState<KanoFeature[]>(initialFeatures || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newItems, setNewItems] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setFeatures(initialFeatures || []);
  }, [JSON.stringify(initialFeatures)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddFeature = async (category: keyof typeof CATEGORIES) => {
    const text = newItems[category]?.trim();
    if (!session?.user || !text || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/kano-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, text })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setFeatures(data.commandData.features || []);
      setNewItems({ ...newItems, [category]: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (featureId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/kano-model`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setFeatures(data.commandData.features || []);
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
        commandType: 'kano-model',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/kano-model`, {
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

  const getFeaturesByCategory = (category: string) => features.filter(f => f.category === category);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-cyan-400 dark:border-cyan-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
            <BarChart3 className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Kano Model {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Kano Diagram Hint */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4 text-center text-sm text-gray-600 dark:text-gray-300">
        <p>Clasifica features según su impacto en la satisfacción del cliente</p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {(Object.entries(CATEGORIES) as [keyof typeof CATEGORIES, typeof CATEGORIES['must-be']][]).map(([key, config]) => {
          const categoryFeatures = getFeaturesByCategory(key);
          return (
            <div key={key} className={`${config.color} rounded-lg p-3 border-2`}>
              <div className="flex items-center gap-2 mb-2">
                <span>{config.icon}</span>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{config.title}</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{config.description}</p>

              <div className="space-y-1 mb-2">
                {categoryFeatures.map((feature) => (
                  <div key={feature.id} className="bg-white dark:bg-gray-800 rounded p-2 relative group shadow-sm">
                    <p className="text-xs text-gray-800 dark:text-gray-100 pr-5">{feature.text}</p>
                    <p className="text-xs text-gray-500">— {feature.userName}</p>
                    {!closed && feature.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDelete(feature.id)}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFeature(key)}
                    placeholder="Agregar feature..."
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    disabled={submitting}
                  />
                  <button
                    onClick={() => handleAddFeature(key)}
                    disabled={!newItems[key]?.trim() || submitting}
                    className="p-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white rounded"
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
        {features.length} features clasificadas
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && features.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Kano Model
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Kano Model cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/kano-model</code>
      </div>
    </div>
  );
}

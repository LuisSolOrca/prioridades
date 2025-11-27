'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Box, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface CanvasItem {
  id: string;
  text: string;
  userId: string;
  userName: string;
}

interface VPCSection {
  key: string;
  title: string;
  side: 'customer' | 'value';
  items: CanvasItem[];
}

interface VPCCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  sections: VPCSection[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const CUSTOMER_SECTIONS = [
  { key: 'jobs', title: 'Customer Jobs', description: 'Tareas que el cliente intenta realizar', icon: '👷' },
  { key: 'pains', title: 'Pains', description: 'Frustraciones y obstáculos', icon: '😫' },
  { key: 'gains', title: 'Gains', description: 'Beneficios y deseos', icon: '🎯' },
];

const VALUE_SECTIONS = [
  { key: 'products', title: 'Products & Services', description: 'Lo que ofrecemos', icon: '📦' },
  { key: 'pain-relievers', title: 'Pain Relievers', description: 'Cómo aliviamos dolores', icon: '💊' },
  { key: 'gain-creators', title: 'Gain Creators', description: 'Cómo creamos ganancias', icon: '✨' },
];

export default function VPCCommand({
  projectId,
  messageId,
  channelId,
  title,
  sections: initialSections,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: VPCCommandProps) {
  const { data: session } = useSession();
  const [sections, setSections] = useState<VPCSection[]>(initialSections || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newItems, setNewItems] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSections(initialSections || []);
    setClosed(initialClosed);
  }, [initialSections, initialClosed]);

  const handleAddItem = async (sectionKey: string) => {
    const text = newItems[sectionKey]?.trim();
    if (!session?.user || !text || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey, text })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setSections(data.commandData.sections || []);
      setNewItems({ ...newItems, [sectionKey]: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sectionKey: string, itemId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vpc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey, itemId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setSections(data.commandData.sections || []);
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
        commandType: 'vpc',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vpc`, {
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

  const getSection = (key: string) => sections.find(s => s.key === key) || { key, items: [] };
  const totalItems = sections.reduce((sum, s) => sum + (s.items?.length || 0), 0);

  const renderSection = (config: typeof CUSTOMER_SECTIONS[0], colorClass: string) => {
    const section = getSection(config.key);
    return (
      <div key={config.key} className={`${colorClass} rounded-lg p-3 border-2`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{config.title}</h4>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>

        <div className="space-y-2 mb-2">
          {section.items?.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded p-2 relative group shadow-sm">
              <p className="text-sm text-gray-800 dark:text-gray-100 pr-6">{item.text}</p>
              <p className="text-xs text-gray-500 mt-1">— {item.userName}</p>
              {!closed && item.userId === session?.user?.id && (
                <button
                  onClick={() => handleDelete(config.key, item.id)}
                  disabled={submitting}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {!closed && (
          <div className="flex gap-1">
            <input
              type="text"
              value={newItems[config.key] || ''}
              onChange={(e) => setNewItems({ ...newItems, [config.key]: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem(config.key)}
              placeholder="Agregar..."
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              disabled={submitting}
            />
            <button
              onClick={() => handleAddItem(config.key)}
              disabled={!newItems[config.key]?.trim() || submitting}
              className="p-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-sky-400 dark:border-sky-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
            <Box className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Value Proposition Canvas {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Customer Profile (Circle) */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border-2 border-orange-300">
          <h4 className="text-center font-bold text-orange-700 dark:text-orange-400 mb-4 text-lg">
            🎯 Customer Profile
          </h4>
          <div className="space-y-3">
            {CUSTOMER_SECTIONS.map((config) =>
              renderSection(config, 'bg-orange-100 dark:bg-orange-900/30 border-orange-200')
            )}
          </div>
        </div>

        {/* Value Proposition (Square) */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-300">
          <h4 className="text-center font-bold text-blue-700 dark:text-blue-400 mb-4 text-lg">
            📦 Value Proposition
          </h4>
          <div className="space-y-3">
            {VALUE_SECTIONS.map((config) =>
              renderSection(config, 'bg-blue-100 dark:bg-blue-900/30 border-blue-200')
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        {totalItems} elementos agregados
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && totalItems > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Canvas
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Canvas cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/vpc</code>
      </div>
    </div>
  );
}

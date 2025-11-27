'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Target, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface CanvasItem {
  id: string;
  text: string;
  userId: string;
  userName: string;
}

interface JTBDSection {
  key: string;
  title: string;
  description: string;
  color: string;
  items: CanvasItem[];
}

interface JTBDCanvasCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  sections: JTBDSection[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const DEFAULT_SECTIONS = [
  { key: 'situation', title: 'Cuando...', description: 'Situación o contexto', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300' },
  { key: 'motivation', title: 'Quiero...', description: 'Motivación/Job funcional', color: 'bg-green-100 dark:bg-green-900/30 border-green-300' },
  { key: 'outcome', title: 'Para poder...', description: 'Resultado esperado', color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300' },
  { key: 'emotional', title: 'Y sentirme...', description: 'Job emocional', color: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300' },
  { key: 'social', title: 'Y ser visto como...', description: 'Job social', color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300' },
  { key: 'constraints', title: 'Pero enfrento...', description: 'Restricciones/Barreras', color: 'bg-red-100 dark:bg-red-900/30 border-red-300' },
];

export default function JTBDCanvasCommand({
  projectId,
  messageId,
  channelId,
  title,
  sections: initialSections,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: JTBDCanvasCommandProps) {
  const { data: session } = useSession();
  const [sections, setSections] = useState<JTBDSection[]>(initialSections || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newItems, setNewItems] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setSections(initialSections || []);
  }, [JSON.stringify(initialSections)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddItem = async (sectionKey: string) => {
    const text = newItems[sectionKey]?.trim();
    if (!session?.user || !text || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/jtbd-canvas`, {
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
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/jtbd-canvas`, {
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
        commandType: 'jtbd-canvas',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/jtbd-canvas`, {
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

  const totalItems = sections.reduce((sum, s) => sum + (s.items?.length || 0), 0);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <Target className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              JTBD Canvas {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Job Statement Formula */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300 italic">
          "Cuando [situación], quiero [motivación], para poder [resultado]"
        </p>
      </div>

      {/* Canvas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {DEFAULT_SECTIONS.map((defaultSection) => {
          const section = sections.find(s => s.key === defaultSection.key) || { ...defaultSection, items: [] };
          return (
            <div key={defaultSection.key} className={`${defaultSection.color} rounded-lg p-4 border-2`}>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{defaultSection.title}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{defaultSection.description}</p>

              <div className="space-y-2 mb-3">
                {section.items?.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded p-2 relative group shadow-sm">
                    <p className="text-sm text-gray-800 dark:text-gray-100 pr-6">{item.text}</p>
                    <p className="text-xs text-gray-500 mt-1">— {item.userName}</p>
                    {!closed && item.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDelete(defaultSection.key, item.id)}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItems[defaultSection.key] || ''}
                    onChange={(e) => setNewItems({ ...newItems, [defaultSection.key]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem(defaultSection.key)}
                    placeholder="Agregar..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    disabled={submitting}
                  />
                  <button
                    onClick={() => handleAddItem(defaultSection.key)}
                    disabled={!newItems[defaultSection.key]?.trim() || submitting}
                    className="p-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/jtbd-canvas</code>
      </div>
    </div>
  );
}

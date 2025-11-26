'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Users, Target, Heart, FileText, Zap, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface CanvasItem {
  id: string;
  text: string;
  userId: string;
  userName: string;
}

interface TeamCanvasCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  blocks: {
    people: { items: CanvasItem[] };
    goals: { items: CanvasItem[] };
    values: { items: CanvasItem[] };
    rules: { items: CanvasItem[] };
    activities: { items: CanvasItem[] };
    strengths: { items: CanvasItem[] };
    weaknesses: { items: CanvasItem[] };
    needs: { items: CanvasItem[] };
  };
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const BLOCK_CONFIG = {
  people: { title: 'Personas y Roles', icon: Users, color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300' },
  goals: { title: 'Metas del Equipo', icon: Target, color: 'bg-green-100 dark:bg-green-900/30 border-green-300' },
  values: { title: 'Valores', icon: Heart, color: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300' },
  rules: { title: 'Reglas y Actividades', icon: FileText, color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300' },
  activities: { title: 'Actividades', icon: Zap, color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300' },
  strengths: { title: 'Fortalezas', icon: ThumbsUp, color: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300' },
  weaknesses: { title: 'Debilidades', icon: ThumbsDown, color: 'bg-red-100 dark:bg-red-900/30 border-red-300' },
  needs: { title: 'Necesidades', icon: HelpCircle, color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300' }
};

export default function TeamCanvasCommand({
  projectId,
  messageId,
  channelId,
  title,
  blocks: initialBlocks,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: TeamCanvasCommandProps) {
  const { data: session } = useSession();
  const [blocks, setBlocks] = useState(initialBlocks || {
    people: { items: [] },
    goals: { items: [] },
    values: { items: [] },
    rules: { items: [] },
    activities: { items: [] },
    strengths: { items: [] },
    weaknesses: { items: [] },
    needs: { items: [] }
  });
  const [closed, setClosed] = useState(initialClosed);
  const [newItem, setNewItem] = useState<{ blockId: string; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBlocks(initialBlocks || {
      people: { items: [] },
      goals: { items: [] },
      values: { items: [] },
      rules: { items: [] },
      activities: { items: [] },
      strengths: { items: [] },
      weaknesses: { items: [] },
      needs: { items: [] }
    });
    setClosed(initialClosed);
  }, [initialBlocks, initialClosed]);

  const handleAddItem = async () => {
    if (!session?.user || !newItem?.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/team-canvas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId: newItem.blockId, text: newItem.text.trim() })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setBlocks(data.commandData.blocks);
      setNewItem(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (blockId: string, itemId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/team-canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, itemId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setBlocks(data.commandData.blocks);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseCanvas = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'team-canvas',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/team-canvas`, {
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

  const totalItems = Object.values(blocks).reduce((sum, block) => sum + (block?.items?.length || 0), 0);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-violet-400 dark:border-violet-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Team Canvas {closed ? '• Cerrado' : '• Activo'} • {totalItems} elementos
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Info Box */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4 text-sm text-gray-600 dark:text-gray-300">
        <p><strong>Team Canvas:</strong> Framework visual para formar y alinear equipos. Define quién es el equipo, qué quieren lograr, qué valoran y cómo trabajan juntos.</p>
      </div>

      {/* Canvas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {(Object.entries(BLOCK_CONFIG) as [keyof typeof BLOCK_CONFIG, typeof BLOCK_CONFIG['people']][]).map(([blockId, config]) => {
          const Icon = config.icon;
          const blockData = blocks[blockId] || { items: [] };

          return (
            <div key={blockId} className={`${config.color} rounded-lg p-3 border`}>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-2 flex items-center gap-1">
                <Icon size={14} /> {config.title}
              </h4>

              <div className="space-y-1.5 min-h-[60px]">
                {blockData.items.map((item: CanvasItem) => (
                  <div key={item.id} className="bg-white dark:bg-gray-700 rounded p-2 text-xs group relative">
                    <p className="text-gray-800 dark:text-gray-100 pr-5">{item.text}</p>
                    <p className="text-gray-400 text-[10px]">— {item.userName}</p>
                    {!closed && item.userId === session?.user?.id && (
                      <button
                        onClick={() => handleDeleteItem(blockId, item.id)}
                        disabled={submitting}
                        className="absolute top-1 right-1 p-0.5 text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}

                {!closed && (
                  <button
                    onClick={() => setNewItem({ blockId, text: '' })}
                    className="w-full py-1.5 border border-dashed border-gray-300 dark:border-gray-500 rounded text-gray-400 hover:text-violet-600 hover:border-violet-400 text-xs flex items-center justify-center gap-1"
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {newItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {BLOCK_CONFIG[newItem.blockId as keyof typeof BLOCK_CONFIG]?.title}
            </h4>
            <textarea
              value={newItem.text}
              onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
              placeholder="Describe..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setNewItem(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300">
                Cancelar
              </button>
              <button onClick={handleAddItem} disabled={!newItem.text.trim() || submitting} className="flex-1 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:bg-gray-400">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && totalItems > 0 && (
        <button onClick={handleCloseCanvas} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Team Canvas
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Team Canvas cerrado • {totalItems} elementos
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/team-canvas</code>
      </div>
    </div>
  );
}

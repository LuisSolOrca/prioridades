'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface CanvasItem {
  id: string;
  text: string;
  userId: string;
  userName: string;
}

interface CanvasBlock {
  items: CanvasItem[];
}

interface LeanCanvasCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  blocks: {
    problem: CanvasBlock;
    customerSegments: CanvasBlock;
    uniqueValue: CanvasBlock;
    solution: CanvasBlock;
    channels: CanvasBlock;
    revenueStreams: CanvasBlock;
    costStructure: CanvasBlock;
    keyMetrics: CanvasBlock;
    unfairAdvantage: CanvasBlock;
  };
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const BLOCK_CONFIG = {
  problem: { title: 'Problema', color: 'bg-red-100 dark:bg-red-900/30', icon: '❗', description: 'Top 3 problemas' },
  customerSegments: { title: 'Segmentos de Clientes', color: 'bg-blue-100 dark:bg-blue-900/30', icon: '👥', description: 'Clientes objetivo' },
  uniqueValue: { title: 'Propuesta de Valor Única', color: 'bg-yellow-100 dark:bg-yellow-900/30', icon: '⭐', description: '¿Por qué eres diferente?' },
  solution: { title: 'Solución', color: 'bg-green-100 dark:bg-green-900/30', icon: '💡', description: 'Top 3 features' },
  channels: { title: 'Canales', color: 'bg-purple-100 dark:bg-purple-900/30', icon: '📢', description: 'Camino al cliente' },
  revenueStreams: { title: 'Flujos de Ingreso', color: 'bg-emerald-100 dark:bg-emerald-900/30', icon: '💰', description: 'Modelo de ingresos' },
  costStructure: { title: 'Estructura de Costos', color: 'bg-orange-100 dark:bg-orange-900/30', icon: '📊', description: 'Costos fijos y variables' },
  keyMetrics: { title: 'Métricas Clave', color: 'bg-cyan-100 dark:bg-cyan-900/30', icon: '📈', description: 'KPIs a medir' },
  unfairAdvantage: { title: 'Ventaja Injusta', color: 'bg-pink-100 dark:bg-pink-900/30', icon: '🏆', description: 'No se puede copiar fácilmente' }
};

export default function LeanCanvasCommand({
  projectId,
  messageId,
  channelId,
  title,
  blocks: initialBlocks,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: LeanCanvasCommandProps) {
  const { data: session } = useSession();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [closed, setClosed] = useState(initialClosed);
  const [newItem, setNewItem] = useState<{ blockId: string; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setBlocks(initialBlocks);
  }, [JSON.stringify(initialBlocks)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddItem = async () => {
    if (!session?.user || !newItem?.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-canvas`, {
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
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-canvas`, {
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
        commandType: 'lean-canvas',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-canvas`, {
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

  const renderBlock = (blockId: keyof typeof BLOCK_CONFIG) => {
    const config = BLOCK_CONFIG[blockId];
    const block = blocks[blockId] || { items: [] };

    return (
      <div className={`${config.color} rounded-lg p-3 h-full`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{config.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{config.description}</p>
          </div>
        </div>
        <div className="space-y-1">
          {block.items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-700 rounded p-2 text-xs group relative shadow-sm">
              <p className="text-gray-800 dark:text-gray-100 pr-5">{item.text}</p>
              {!closed && item.userId === session?.user?.id && (
                <button
                  onClick={() => handleDeleteItem(blockId, item.id)}
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
              onClick={() => setNewItem({ blockId, text: '' })}
              className="w-full text-xs text-gray-500 hover:text-indigo-600 flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-indigo-400 bg-white/50 dark:bg-gray-800/50"
            >
              <Plus size={12} />
              Agregar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <Layers className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Lean Canvas {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Canvas Grid - Lean Canvas Layout */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {/* Row 1 */}
        <div className="col-span-1 row-span-2">{renderBlock('problem')}</div>
        <div className="col-span-1">{renderBlock('solution')}</div>
        <div className="col-span-1 row-span-2">{renderBlock('uniqueValue')}</div>
        <div className="col-span-1">{renderBlock('unfairAdvantage')}</div>
        <div className="col-span-1 row-span-2">{renderBlock('customerSegments')}</div>

        {/* Row 2 */}
        <div className="col-span-1">{renderBlock('keyMetrics')}</div>
        <div className="col-span-1">{renderBlock('channels')}</div>

        {/* Row 3 */}
        <div className="col-span-2">{renderBlock('costStructure')}</div>
        <div className="col-span-1">{renderBlock('revenueStreams')}</div>
        <div className="col-span-2"></div>
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
              placeholder="Escribe tu idea..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setNewItem(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItem.text.trim() || submitting}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-400"
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
          onClick={handleCloseCanvas}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Lean Canvas
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Lean Canvas cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/lean-canvas</code>
      </div>
    </div>
  );
}

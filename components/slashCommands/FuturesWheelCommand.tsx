'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Circle, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface WheelNode {
  id: string;
  text: string;
  level: number; // 1 = first order, 2 = second order, 3 = third order
  parentId: string | null;
  userId: string;
  userName: string;
}

interface FuturesWheelCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  centralTrend: string;
  nodes: WheelNode[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function FuturesWheelCommand({
  projectId,
  messageId,
  channelId,
  title,
  centralTrend,
  nodes: initialNodes,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: FuturesWheelCommandProps) {
  const { data: session } = useSession();
  const [nodes, setNodes] = useState<WheelNode[]>(initialNodes || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newImpact, setNewImpact] = useState({ text: '', parentId: '' });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodes(initialNodes || []);
    setClosed(initialClosed);
  }, [initialNodes, initialClosed]);

  const handleAddNode = async (parentId: string | null = null) => {
    if (!session?.user || !newImpact.text.trim() || submitting) return;

    const level = parentId ? (nodes.find(n => n.id === parentId)?.level || 0) + 1 : 1;
    if (level > 3) {
      alert('Máximo 3 niveles de impacto');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/futures-wheel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newImpact.text.trim(),
          parentId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setNodes(data.commandData.nodes || []);
      setNewImpact({ text: '', parentId: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (nodeId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/futures-wheel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setNodes(data.commandData.nodes || []);
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
        commandType: 'futures-wheel',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/futures-wheel`, {
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

  // Get nodes by level
  const firstOrder = nodes.filter(n => n.level === 1);
  const getChildren = (parentId: string) => nodes.filter(n => n.parentId === parentId);

  const levelColors = {
    1: 'bg-blue-100 dark:bg-blue-900/30 border-blue-400',
    2: 'bg-green-100 dark:bg-green-900/30 border-green-400',
    3: 'bg-purple-100 dark:bg-purple-900/30 border-purple-400'
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-violet-400 dark:border-violet-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center">
            <Circle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Futures Wheel {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Central Trend */}
      <div className="flex justify-center mb-6">
        <div className="bg-violet-600 text-white rounded-full px-8 py-6 shadow-lg text-center max-w-xs">
          <p className="text-xs uppercase tracking-wide mb-1 opacity-80">Tendencia Central</p>
          <p className="font-bold text-lg">{centralTrend || title}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-400"></span> 1° Orden
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-400"></span> 2° Orden
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-400"></span> 3° Orden
        </span>
      </div>

      {/* Wheel Structure */}
      <div className="space-y-4 mb-4">
        {firstOrder.map((node) => (
          <div key={node.id} className="ml-4">
            <div className={`${levelColors[1]} rounded-lg p-3 border-2 relative group`}>
              <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{node.text}</p>
              <p className="text-xs text-gray-500 mt-1">— {node.userName}</p>

              {!closed && node.userId === session?.user?.id && (
                <button
                  onClick={() => handleDelete(node.id)}
                  disabled={submitting}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  <Trash2 size={12} />
                </button>
              )}

              {/* Second Order */}
              <div className="mt-3 ml-4 space-y-2">
                {getChildren(node.id).map((child) => (
                  <div key={child.id}>
                    <div className={`${levelColors[2]} rounded-lg p-2 border-2 relative group`}>
                      <p className="text-sm text-gray-800 dark:text-gray-100">{child.text}</p>
                      <p className="text-xs text-gray-500 mt-1">— {child.userName}</p>

                      {!closed && child.userId === session?.user?.id && (
                        <button
                          onClick={() => handleDelete(child.id)}
                          disabled={submitting}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}

                      {/* Third Order */}
                      <div className="mt-2 ml-4 space-y-1">
                        {getChildren(child.id).map((grandchild) => (
                          <div key={grandchild.id} className={`${levelColors[3]} rounded p-2 border relative group`}>
                            <p className="text-xs text-gray-800 dark:text-gray-100">{grandchild.text}</p>
                            <p className="text-xs text-gray-500">— {grandchild.userName}</p>

                            {!closed && grandchild.userId === session?.user?.id && (
                              <button
                                onClick={() => handleDelete(grandchild.id)}
                                disabled={submitting}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Add 3rd order */}
                        {!closed && (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="Impacto 3°..."
                              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                  setNewImpact({ text: (e.target as HTMLInputElement).value, parentId: child.id });
                                  setTimeout(() => handleAddNode(child.id), 0);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add 2nd order */}
                    {!closed && (
                      <div className="flex gap-1 mt-1 ml-4">
                        <input
                          type="text"
                          placeholder="Impacto 2°..."
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                              setNewImpact({ text: (e.target as HTMLInputElement).value, parentId: node.id });
                              setTimeout(() => handleAddNode(node.id), 0);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add First Order Impact */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newImpact.parentId ? '' : newImpact.text}
              onChange={(e) => setNewImpact({ text: e.target.value, parentId: '' })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNode(null)}
              placeholder="Nuevo impacto de primer orden..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
            <button
              onClick={() => handleAddNode(null)}
              disabled={!newImpact.text.trim() || newImpact.parentId !== '' || submitting}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        {firstOrder.length} impactos primarios • {nodes.length} total
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && nodes.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Futures Wheel
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Futures Wheel cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/futures-wheel</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Target, Plus, Trash2, ChevronRight } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface MapNode {
  id: string;
  text: string;
  level: 'actor' | 'impact' | 'deliverable';
  parentId: string | null;
  userId: string;
  userName: string;
}

interface ImpactMappingCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  goal: string;
  nodes: MapNode[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ImpactMappingCommand({
  projectId,
  messageId,
  channelId,
  title,
  goal,
  nodes: initialNodes,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: ImpactMappingCommandProps) {
  const { data: session } = useSession();
  const [nodes, setNodes] = useState<MapNode[]>(initialNodes || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newItem, setNewItem] = useState({ text: '', parentId: '', level: 'actor' as const });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodes(initialNodes || []);
    setClosed(initialClosed);
  }, [initialNodes, initialClosed]);

  const handleAddNode = async (level: 'actor' | 'impact' | 'deliverable', parentId: string | null = null) => {
    if (!session?.user || !newItem.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/impact-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newItem.text.trim(),
          level,
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
      setNewItem({ text: '', parentId: '', level: 'actor' });
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
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/impact-mapping`, {
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
        commandType: 'impact-mapping',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/impact-mapping`, {
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

  const actors = nodes.filter(n => n.level === 'actor');
  const getImpacts = (actorId: string) => nodes.filter(n => n.level === 'impact' && n.parentId === actorId);
  const getDeliverables = (impactId: string) => nodes.filter(n => n.level === 'deliverable' && n.parentId === impactId);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-rose-400 dark:border-rose-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center">
            <Target className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Impact Mapping (Gojko Adzic) {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Goal (WHY) */}
      <div className="bg-rose-600 text-white rounded-lg px-6 py-4 shadow-lg mb-6 text-center">
        <p className="text-xs uppercase tracking-wide mb-1 opacity-80">WHY - Objetivo</p>
        <p className="font-bold text-lg">{goal || title}</p>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-400"></span> WHO - Actores
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-400"></span> HOW - Impactos
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-400"></span> WHAT - Entregables
        </span>
      </div>

      {/* Impact Map Structure */}
      <div className="space-y-4 mb-4">
        {actors.map((actor) => (
          <div key={actor.id} className="ml-4">
            <div className="flex items-center mb-2">
              <ChevronRight className="text-rose-400" size={16} />
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 border-2 border-blue-400 flex-1 relative group">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase mb-1">WHO</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{actor.text}</p>
                <p className="text-xs text-gray-500 mt-1">— {actor.userName}</p>

                {!closed && actor.userId === session?.user?.id && (
                  <button
                    onClick={() => handleDelete(actor.id)}
                    disabled={submitting}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Impacts */}
            <div className="ml-8 space-y-2">
              {getImpacts(actor.id).map((impact) => (
                <div key={impact.id}>
                  <div className="flex items-center mb-2">
                    <ChevronRight className="text-green-400" size={14} />
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2 border-2 border-green-400 flex-1 relative group">
                      <p className="text-xs text-green-600 dark:text-green-400 uppercase mb-1">HOW</p>
                      <p className="text-sm text-gray-800 dark:text-gray-100">{impact.text}</p>
                      <p className="text-xs text-gray-500 mt-1">— {impact.userName}</p>

                      {!closed && impact.userId === session?.user?.id && (
                        <button
                          onClick={() => handleDelete(impact.id)}
                          disabled={submitting}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div className="ml-6 space-y-1">
                    {getDeliverables(impact.id).map((deliverable) => (
                      <div key={deliverable.id} className="flex items-center">
                        <ChevronRight className="text-purple-400" size={12} />
                        <div className="bg-purple-100 dark:bg-purple-900/30 rounded p-2 border border-purple-400 flex-1 relative group">
                          <p className="text-xs text-purple-600 dark:text-purple-400 uppercase mb-1">WHAT</p>
                          <p className="text-xs text-gray-800 dark:text-gray-100">{deliverable.text}</p>
                          <p className="text-xs text-gray-500">— {deliverable.userName}</p>

                          {!closed && deliverable.userId === session?.user?.id && (
                            <button
                              onClick={() => handleDelete(deliverable.id)}
                              disabled={submitting}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add Deliverable */}
                    {!closed && (
                      <div className="flex gap-1 ml-4">
                        <input
                          type="text"
                          placeholder="Agregar entregable..."
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                              setNewItem({ text: (e.target as HTMLInputElement).value, parentId: impact.id, level: 'deliverable' });
                              handleAddNode('deliverable', impact.id);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Impact */}
              {!closed && (
                <div className="flex gap-1 ml-4">
                  <input
                    type="text"
                    placeholder="Agregar impacto..."
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                        setNewItem({ text: (e.target as HTMLInputElement).value, parentId: actor.id, level: 'impact' });
                        handleAddNode('impact', actor.id);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Actor */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem.level === 'actor' ? newItem.text : ''}
              onChange={(e) => setNewItem({ text: e.target.value, parentId: '', level: 'actor' })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNode('actor')}
              placeholder="Nuevo actor (WHO)..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
            <button
              onClick={() => handleAddNode('actor')}
              disabled={!newItem.text.trim() || newItem.level !== 'actor' || submitting}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        {actors.length} actores • {nodes.filter(n => n.level === 'impact').length} impactos • {nodes.filter(n => n.level === 'deliverable').length} entregables
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && nodes.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Impact Map
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Impact Map cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/impact-mapping</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Reframe {
  id: string;
  originalView: string;
  reframedView: string;
  type: 'content' | 'context' | 'intention';
  userId: string;
  userName: string;
  votes: string[];
}

interface ReframingBoardCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  situation: string;
  reframes: Reframe[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ReframingBoardCommand({
  projectId,
  messageId,
  channelId,
  title,
  situation,
  reframes: initialReframes,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: ReframingBoardCommandProps) {
  const { data: session } = useSession();
  const [reframes, setReframes] = useState<Reframe[]>(initialReframes || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newReframe, setNewReframe] = useState<{ originalView: string; reframedView: string; type: 'content' | 'context' | 'intention' }>({ originalView: '', reframedView: '', type: 'content' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReframes(initialReframes || []);
    setClosed(initialClosed);
  }, [initialReframes, initialClosed]);

  const handleAddReframe = async () => {
    if (!session?.user || !newReframe.originalView.trim() || !newReframe.reframedView.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/reframing-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newReframe })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setReframes(data.commandData.reframes || []);
      setNewReframe({ originalView: '', reframedView: '', type: 'content' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleVote = async (reframeId: string) => {
    if (!session?.user || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/reframing-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', reframeId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setReframes(data.commandData.reframes || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (reframeId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/reframing-board`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reframeId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setReframes(data.commandData.reframes || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;
    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'reframing-board', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/reframing-board`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const typeConfig = {
    content: { label: '📝 Contenido', color: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', desc: 'Cambiar el significado' },
    context: { label: '🌍 Contexto', color: 'bg-green-100 border-green-400 text-green-700 dark:bg-green-900/30 dark:text-green-300', desc: 'Cambiar el marco situacional' },
    intention: { label: '💡 Intención', color: 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', desc: 'Buscar la intención positiva' }
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-teal-400 dark:border-teal-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
            <RefreshCw className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Reframing Board (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Situation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-teal-500">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">🎯 Situación a Reencuadrar</h4>
        <p className="text-gray-800 dark:text-gray-100">{situation}</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(typeConfig).map(([key, config]) => (
          <div key={key} className={`px-3 py-1 rounded-full text-xs border ${config.color}`}>{config.label}</div>
        ))}
      </div>

      {/* Reframes */}
      <div className="space-y-3 mb-4">
        {reframes.map(reframe => {
          const config = typeConfig[reframe.type];
          const hasVoted = reframe.votes?.includes(session?.user?.id || '');
          return (
            <div key={reframe.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm relative group">
              <div className={`inline-block px-2 py-0.5 rounded text-xs mb-2 border ${config.color}`}>{config.label}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">Vista Original</p>
                  <p className="text-sm text-gray-800 dark:text-gray-100">{reframe.originalView}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">→ Vista Reencuadrada</p>
                  <p className="text-sm text-gray-800 dark:text-gray-100">{reframe.reframedView}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">— {reframe.userName}</p>
                {!closed && (
                  <button onClick={() => handleVote(reframe.id)} disabled={submitting}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${hasVoted ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'}`}>
                    💡 {reframe.votes?.length || 0}
                  </button>
                )}
              </div>
              {!closed && reframe.userId === session?.user?.id && (
                <button onClick={() => handleDelete(reframe.id)} disabled={submitting}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
        {reframes.length === 0 && <p className="text-center text-gray-500 py-8">Aún no hay reencuadres. ¡Cambia la perspectiva!</p>}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <select value={newReframe.type} onChange={(e) => setNewReframe({ ...newReframe, type: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600">
              <option value="content">📝 Reencuadre de Contenido</option>
              <option value="context">🌍 Reencuadre de Contexto</option>
              <option value="intention">💡 Intención Positiva</option>
            </select>
            <textarea value={newReframe.originalView} onChange={(e) => setNewReframe({ ...newReframe, originalView: e.target.value })}
              placeholder="Vista original del problema..." className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" rows={2} />
            <textarea value={newReframe.reframedView} onChange={(e) => setNewReframe({ ...newReframe, reframedView: e.target.value })}
              placeholder="Nueva perspectiva reencuadrada..." className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" rows={2} />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddReframe} disabled={!newReframe.originalView.trim() || !newReframe.reframedView.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-400">Agregar Reencuadre</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-teal-300 dark:border-teal-600 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Agregar Reencuadre
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">{reframes.length} reencuadres</div>

      {!closed && createdBy === session?.user?.id && reframes.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Reframing Board
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Reframing Board cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/reframing-board</code>
      </div>
    </div>
  );
}

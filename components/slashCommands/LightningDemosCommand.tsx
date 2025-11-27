'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Zap, Plus, Trash2, ExternalLink, ThumbsUp } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface DemoItem {
  id: string;
  title: string;
  source: string; // Company/Product name
  url?: string;
  insight: string; // What we can learn
  userId: string;
  userName: string;
  votes: string[]; // User IDs who voted
}

interface LightningDemosCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  demos: DemoItem[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function LightningDemosCommand({
  projectId,
  messageId,
  channelId,
  title,
  demos: initialDemos,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: LightningDemosCommandProps) {
  const { data: session } = useSession();
  const [demos, setDemos] = useState<DemoItem[]>(initialDemos || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newDemo, setNewDemo] = useState({ title: '', source: '', url: '', insight: '' });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setDemos(initialDemos || []);
  }, [JSON.stringify(initialDemos)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddDemo = async () => {
    if (!session?.user || !newDemo.title.trim() || !newDemo.source.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lightning-demos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          title: newDemo.title.trim(),
          source: newDemo.source.trim(),
          url: newDemo.url.trim() || null,
          insight: newDemo.insight.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setDemos(data.commandData.demos || []);
      setNewDemo({ title: '', source: '', url: '', insight: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (demoId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lightning-demos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', demoId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setDemos(data.commandData.demos || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (demoId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lightning-demos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setDemos(data.commandData.demos || []);
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
        commandType: 'lightning-demos',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lightning-demos`, {
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

  const sortedDemos = [...demos].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-yellow-400 dark:border-yellow-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Lightning Demos {closed ? '• Cerrado' : '• Activo'} • {demos.length} demos
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Instructions */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4 text-sm text-gray-600 dark:text-gray-300">
        <p>💡 Comparte ejemplos inspiradores de otros productos/empresas. ¿Qué podemos aprender?</p>
      </div>

      {/* Demos List */}
      <div className="space-y-3 mb-4">
        {sortedDemos.map((demo) => {
          const hasVoted = demo.votes?.includes(session?.user?.id || '');
          return (
            <div key={demo.id} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 relative group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{demo.title}</h4>
                    {demo.url && (
                      <a
                        href={demo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">📦 {demo.source}</p>
                  {demo.insight && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-600 rounded p-2">
                      💡 {demo.insight}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">— {demo.userName}</p>
                </div>
                <div className="flex flex-col items-center gap-1 ml-4">
                  {!closed && (
                    <button
                      onClick={() => handleVote(demo.id)}
                      disabled={submitting}
                      className={`p-2 rounded-lg transition ${
                        hasVoted
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-yellow-100'
                      }`}
                    >
                      <ThumbsUp size={18} />
                    </button>
                  )}
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {demo.votes?.length || 0}
                  </span>
                </div>
              </div>

              {!closed && demo.userId === session?.user?.id && (
                <button
                  onClick={() => handleDelete(demo.id)}
                  disabled={submitting}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Demo Form */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Agregar Demo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={newDemo.title}
              onChange={(e) => setNewDemo({ ...newDemo, title: e.target.value })}
              placeholder="Título/Feature *"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
            <input
              type="text"
              value={newDemo.source}
              onChange={(e) => setNewDemo({ ...newDemo, source: e.target.value })}
              placeholder="Empresa/Producto *"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
          </div>
          <input
            type="text"
            value={newDemo.url}
            onChange={(e) => setNewDemo({ ...newDemo, url: e.target.value })}
            placeholder="URL (opcional)"
            className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            disabled={submitting}
          />
          <textarea
            value={newDemo.insight}
            onChange={(e) => setNewDemo({ ...newDemo, insight: e.target.value })}
            placeholder="¿Qué podemos aprender de esto?"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 resize-none"
            rows={2}
            disabled={submitting}
          />
          <button
            onClick={handleAddDemo}
            disabled={!newDemo.title.trim() || !newDemo.source.trim() || submitting}
            className="mt-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Plus size={18} />
            Agregar Demo
          </button>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && demos.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Lightning Demos
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Lightning Demos cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/lightning-demos</code>
      </div>
    </div>
  );
}

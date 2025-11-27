'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Heart, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface HopeFear {
  id: string;
  text: string;
  type: 'hope' | 'fear';
  userId: string;
  userName: string;
  votes: string[];
}

interface HopesFearsCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  items: HopeFear[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function HopesFearsCommand({
  projectId,
  messageId,
  channelId,
  title,
  items: initialItems,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: HopesFearsCommandProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<HopeFear[]>(initialItems || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newHope, setNewHope] = useState('');
  const [newFear, setNewFear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setItems(initialItems || []);
  }, [JSON.stringify(initialItems)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddItem = async (type: 'hope' | 'fear') => {
    const text = type === 'hope' ? newHope.trim() : newFear.trim();
    if (!session?.user || !text || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/hopes-fears`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', type, text })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setItems(data.commandData.items || []);
      if (type === 'hope') setNewHope('');
      else setNewFear('');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (itemId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/hopes-fears`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', itemId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(data.commandData.items || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/hopes-fears`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(data.commandData.items || []);
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
        commandType: 'hopes-fears',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/hopes-fears`, {
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

  const hopes = items.filter(i => i.type === 'hope').sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
  const fears = items.filter(i => i.type === 'fear').sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));

  const renderItem = (item: HopeFear) => {
    const hasVoted = item.votes?.includes(session?.user?.id || '');
    const isHope = item.type === 'hope';

    return (
      <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm relative group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-800 dark:text-gray-100">{item.text}</p>
            <p className="text-xs text-gray-500 mt-1">— {item.userName}</p>
          </div>
          {!closed && (
            <button
              onClick={() => handleVote(item.id)}
              disabled={submitting}
              className={`ml-2 px-2 py-1 rounded text-xs font-medium transition ${
                hasVoted
                  ? isHope
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {hasVoted ? '✓' : '+'} {item.votes?.length || 0}
            </button>
          )}
        </div>

        {!closed && item.userId === session?.user?.id && (
          <button
            onClick={() => handleDelete(item.id)}
            disabled={submitting}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-pink-400 dark:border-pink-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
            <Heart className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Hopes & Fears {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Hopes */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-2 border-green-300">
          <h4 className="text-center font-bold text-green-700 dark:text-green-400 mb-3 text-lg">
            🌟 Hopes (Esperanzas)
          </h4>
          <p className="text-xs text-green-600 dark:text-green-400 text-center mb-3">
            ¿Qué esperas que suceda?
          </p>

          <div className="space-y-2 mb-3">
            {hopes.map(renderItem)}
          </div>

          {!closed && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newHope}
                onChange={(e) => setNewHope(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem('hope')}
                placeholder="Agregar esperanza..."
                className="flex-1 px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-gray-800"
                disabled={submitting}
              />
              <button
                onClick={() => handleAddItem('hope')}
                disabled={!newHope.trim() || submitting}
                className="p-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Fears */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border-2 border-red-300">
          <h4 className="text-center font-bold text-red-700 dark:text-red-400 mb-3 text-lg">
            😰 Fears (Miedos)
          </h4>
          <p className="text-xs text-red-600 dark:text-red-400 text-center mb-3">
            ¿Qué te preocupa?
          </p>

          <div className="space-y-2 mb-3">
            {fears.map(renderItem)}
          </div>

          {!closed && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFear}
                onChange={(e) => setNewFear(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem('fear')}
                placeholder="Agregar miedo..."
                className="flex-1 px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-800"
                disabled={submitting}
              />
              <button
                onClick={() => handleAddItem('fear')}
                disabled={!newFear.trim() || submitting}
                className="p-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        {hopes.length} esperanzas • {fears.length} miedos
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && items.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Hopes & Fears
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Hopes & Fears cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/hopes-fears</code>
      </div>
    </div>
  );
}

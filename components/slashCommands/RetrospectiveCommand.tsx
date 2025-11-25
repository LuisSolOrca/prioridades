'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, ThumbsUp, Plus, Check } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface RetroItem {
  id: string;
  text: string;
  author: { id: string; name: string };
  votes: string[];
  column: 'well' | 'improve' | 'actions';
}

interface RetrospectiveCommandProps {
  projectId: string;
  messageId?: string;
  channelId: string;
  title: string;
  items: RetroItem[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function RetrospectiveCommand({
  projectId,
  messageId,
  channelId,
  title,
  items: initialItems,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: RetrospectiveCommandProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<RetroItem[]>(initialItems);
  const [closed, setClosed] = useState(initialClosed);
  const [newItem, setNewItem] = useState({ well: '', improve: '', actions: '' });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setClosed(initialClosed);
  }, [initialItems, initialClosed]);

  const handleAddItem = async (column: 'well' | 'improve' | 'actions') => {
    const text = newItem[column].trim();
    if (!text || !session?.user?.id || closed || submitting) return;

    setNewItem(prev => ({ ...prev, [column]: '' }));

    if (!messageId) {
      const item: RetroItem = {
        id: Date.now().toString(),
        text,
        author: { id: session.user.id, name: session.user.name || 'Usuario' },
        votes: [],
        column
      };
      setItems(prev => [...prev, item]);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/retrospective`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', column, text })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setItems(data.commandData.items);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (itemId: string) => {
    if (!session?.user?.id || closed) return;

    if (!messageId) {
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const hasVoted = item.votes.includes(session.user.id);
          return {
            ...item,
            votes: hasVoted
              ? item.votes.filter(v => v !== session.user.id)
              : [...item.votes, session.user.id]
          };
        }
        return item;
      }));
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/retrospective`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', itemId })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setItems(data.commandData.items);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleClose = async () => {
    if (!messageId) {
      setClosed(true);
      return;
    }

    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'retrospective',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/retrospective`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getColumnItems = (column: 'well' | 'improve' | 'actions') =>
    items.filter(i => i.column === column).sort((a, b) => b.votes.length - a.votes.length);

  const columns = [
    { key: 'well' as const, title: '❤️ Went Well', color: 'green', bg: 'bg-green-50 dark:bg-green-900/20' },
    { key: 'improve' as const, title: '⚠️ Needs Improvement', color: 'yellow', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { key: 'actions' as const, title: '💡 Action Items', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/20' }
  ];

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-green-50 via-yellow-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-green-300 dark:border-green-700 p-6 my-2 max-w-6xl w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
            <MessageSquare className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Retrospectiva</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{title}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {columns.map(col => (
          <div key={col.key} className={`${col.bg} rounded-lg p-4`}>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{col.title}</h4>

            <div className="space-y-2 mb-3">
              {getColumnItems(col.key).map(item => (
                <div key={item.id} className="bg-white dark:bg-gray-700 rounded p-2 flex items-start gap-2">
                  <button
                    onClick={() => handleVote(item.id)}
                    disabled={closed}
                    className={`flex-shrink-0 flex flex-col items-center p-1 rounded ${
                      item.votes.includes(session?.user?.id || '')
                        ? `bg-${col.color}-100 dark:bg-${col.color}-900/30`
                        : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    } ${closed ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
                  >
                    <ThumbsUp size={12} className={item.votes.includes(session?.user?.id || '') ? `text-${col.color}-600` : 'text-gray-400'} />
                    <span className="text-xs font-bold">{item.votes.length}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-100 break-words">{item.text}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.author.name}</span>
                  </div>
                </div>
              ))}
            </div>

            {!closed && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItem[col.key]}
                  onChange={e => setNewItem(prev => ({ ...prev, [col.key]: e.target.value }))}
                  onKeyPress={e => e.key === 'Enter' && handleAddItem(col.key)}
                  placeholder="Agregar..."
                  className="flex-1 min-w-0 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
                <button
                  onClick={() => handleAddItem(col.key)}
                  disabled={submitting}
                  className={`flex-shrink-0 bg-${col.color}-600 hover:bg-${col.color}-700 text-white p-1 rounded`}
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!closed && createdBy === session?.user?.id && items.length > 0 && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Retrospectiva
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex items-center gap-2">
          <Check size={18} className="text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Retrospectiva cerrada</span>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/retrospective</code>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Scale, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ProsConsItem {
  id: string;
  text: string;
  author: { id: string; name: string };
}

interface ProsConsCommandProps {
  projectId: string;
  messageId?: string;
  title: string;
  pros: ProsConsItem[];
  cons: ProsConsItem[];
  createdBy: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ProsConsCommand({
  projectId,
  messageId,
  title,
  pros: initialPros,
  cons: initialCons,
  createdBy,
  onClose,
  onUpdate
}: ProsConsCommandProps) {
  const { data: session } = useSession();
  const [pros, setPros] = useState<ProsConsItem[]>(initialPros);
  const [cons, setCons] = useState<ProsConsItem[]>(initialCons);
  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddItem = async (type: 'pro' | 'con', text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || !session?.user?.id || submitting) return;

    if (type === 'pro') setNewPro('');
    else setNewCon('');

    if (!messageId) {
      const newItem = {
        id: Date.now().toString(),
        text: trimmedText,
        author: { id: session.user.id, name: session.user.name || 'Usuario' }
      };

      if (type === 'pro') {
        setPros(prev => [...prev, newItem]);
      } else {
        setCons(prev => [...prev, newItem]);
      }
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/pros-cons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', type, text: trimmedText })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setPros(data.commandData.pros);
      setCons(data.commandData.cons);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-emerald-300 dark:border-emerald-700 p-6 my-2 max-w-5xl w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
            <Scale className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">⚖️ {title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {pros.length} pros, {cons.length} cons
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Pros Column */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp className="text-green-600 dark:text-green-400" size={20} />
            <h4 className="font-bold text-green-800 dark:text-green-200">
              ✅ Pros ({pros.length})
            </h4>
          </div>

          {/* Pros List */}
          <div className="space-y-2 mb-3 min-h-[100px] max-h-[300px] overflow-y-auto">
            {pros.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                Sin pros aún...
              </p>
            ) : (
              pros.map(item => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-700 rounded p-3 shadow-sm"
                >
                  <p className="text-sm text-gray-800 dark:text-gray-100 mb-1 break-words">
                    {item.text}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    — {item.author.name}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Add Pro Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newPro}
              onChange={e => setNewPro(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddItem('pro', newPro)}
              placeholder="Agregar pro..."
              disabled={submitting}
              className="flex-1 min-w-0 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={() => handleAddItem('pro', newPro)}
              disabled={submitting || !newPro.trim()}
              className="flex-shrink-0 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white p-2 rounded"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Cons Column */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-300 dark:border-red-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ThumbsDown className="text-red-600 dark:text-red-400" size={20} />
            <h4 className="font-bold text-red-800 dark:text-red-200">
              ❌ Cons ({cons.length})
            </h4>
          </div>

          {/* Cons List */}
          <div className="space-y-2 mb-3 min-h-[100px] max-h-[300px] overflow-y-auto">
            {cons.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                Sin cons aún...
              </p>
            ) : (
              cons.map(item => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-700 rounded p-3 shadow-sm"
                >
                  <p className="text-sm text-gray-800 dark:text-gray-100 mb-1 break-words">
                    {item.text}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    — {item.author.name}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Add Con Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCon}
              onChange={e => setNewCon(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddItem('con', newCon)}
              placeholder="Agregar con..."
              disabled={submitting}
              className="flex-1 min-w-0 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={() => handleAddItem('con', newCon)}
              disabled={submitting || !newCon.trim()}
              className="flex-shrink-0 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white p-2 rounded"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {(pros.length > 0 || cons.length > 0) && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-2">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {pros.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Pros</div>
            </div>
            <div className="text-2xl text-gray-400">vs</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {cons.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Cons</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/pros-cons</code>
      </div>
    </div>
  );
}

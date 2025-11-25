'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CheckSquare, Square, Plus } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  checkedBy?: { id: string; name: string };
}

interface ChecklistCommandProps {
  projectId: string;
  messageId?: string;
  title: string;
  items: ChecklistItem[];
  createdBy: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ChecklistCommand({
  projectId,
  messageId,
  title,
  items: initialItems,
  createdBy,
  onClose,
  onUpdate
}: ChecklistCommandProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [newItem, setNewItem] = useState('');

  // Sincronizar estado cuando llegan actualizaciones de Pusher
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleToggle = async (itemId: string) => {
    if (!session?.user?.id) return;

    if (!messageId) {
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, checked: !item.checked, checkedBy: !item.checked ? { id: session.user.id, name: session.user.name || 'Usuario' } : undefined }
          : item
      ));
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', itemId })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setItems(data.commandData.items);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAdd = async () => {
    const text = newItem.trim();
    if (!text || !session?.user?.id) return;

    setNewItem('');

    if (!messageId) {
      setItems(prev => [...prev, {
        id: Date.now().toString(),
        text,
        checked: false
      }]);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', text })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setItems(data.commandData.items);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const completed = items.filter(i => i.checked).length;
  const percentage = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-teal-300 dark:border-teal-700 p-6 my-2 max-w-3xl w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
            <CheckSquare className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {completed} / {items.length} completadas ({percentage}%)
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className="bg-teal-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => handleToggle(item.id)}
            className="bg-white dark:bg-gray-700 rounded p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition"
          >
            {item.checked ? (
              <CheckSquare className="text-teal-600 dark:text-teal-400 flex-shrink-0" size={20} />
            ) : (
              <Square className="text-gray-400 flex-shrink-0" size={20} />
            )}
            <span className={`flex-1 min-w-0 break-words ${item.checked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
              {item.text}
            </span>
            {item.checkedBy && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.checkedBy.name}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Add Item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleAdd()}
          placeholder="Agregar item..."
          className="flex-1 min-w-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
        <button
          onClick={handleAdd}
          className="flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white p-2 rounded"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/checklist</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface AgendaItem {
  topic: string;
  timeMinutes: number;
  speaker: string;
  completed: boolean;
}

interface AgendaCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  items: AgendaItem[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function AgendaCommand({
  projectId,
  messageId,
  channelId,
  title,
  items: initialItems,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: AgendaCommandProps) {
  const { data: session } = useSession();
  const cardRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(initialItems);
  const [closed, setClosed] = useState(initialClosed);
  const [topic, setTopic] = useState('');
  const [timeMinutes, setTimeMinutes] = useState(5);
  const [speaker, setSpeaker] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddItem = async () => {
    if (!topic.trim() || !speaker.trim() || !session?.user || submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/agenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), timeMinutes, speaker: speaker.trim() })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(data.commandData.items);
      setTopic('');
      setTimeMinutes(5);
      setSpeaker('');
      onUpdate?.();
    } catch (error) {
      alert('Error al agregar tema');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (index: number) => {
    if (submitting || closed) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/agenda`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex: index, action: 'toggle' })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(data.commandData.items);
      onUpdate?.();
    } catch (error) {
      alert('Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (session?.user?.id !== createdBy) return;
    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'agenda',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/agenda`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      alert('Error al cerrar');
    } finally {
      setSubmitting(false);
    }
  };

  const totalTime = items.reduce((acc, item) => acc + item.timeMinutes, 0);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-400 dark:border-blue-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-600 rounded-full flex items-center justify-center">
            <Clock className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Agenda • {items.length} temas • {totalTime} min total
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
      </div>

      <div className="space-y-2 mb-4">
        {items.map((item, index) => (
          <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleToggle(index)}
              disabled={submitting || closed}
              className="mt-1"
            />
            <div className="flex-1">
              <p className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                {item.topic}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                👤 {item.speaker} • ⏱️ {item.timeMinutes} min
              </p>
            </div>
          </div>
        ))}
      </div>

      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-3 space-y-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Tema..."
            className="w-full px-3 py-2 text-sm border rounded-lg"
            disabled={submitting}
          />
          <div className="flex gap-2">
            <input
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="Responsable..."
              className="flex-1 px-3 py-2 text-sm border rounded-lg"
              disabled={submitting}
            />
            <input
              type="number"
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(Math.max(1, parseInt(e.target.value) || 5))}
              className="w-20 px-3 py-2 text-sm border rounded-lg"
              disabled={submitting}
              min="1"
            />
          </div>
          <button
            onClick={handleAddItem}
            disabled={!topic.trim() || !speaker.trim() || submitting}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Agregar Tema
          </button>
        </div>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">🔒 Agenda cerrada</p>
        </div>
      )}

      {!closed && createdBy === session?.user?.id && (
        <button onClick={handleClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">
          Cerrar Agenda
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/agenda</code>
      </div>
    </div>
  );
}

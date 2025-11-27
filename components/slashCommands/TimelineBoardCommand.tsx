'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface TimelineEvent {
  id: string;
  text: string;
  period: 'past' | 'present' | 'future';
  date?: string;
  resources?: string;
  learnings?: string;
  userId: string;
  userName: string;
}

interface TimelineBoardCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  events: TimelineEvent[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function TimelineBoardCommand({
  projectId,
  messageId,
  channelId,
  title,
  events: initialEvents,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: TimelineBoardCommandProps) {
  const { data: session } = useSession();
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newEvent, setNewEvent] = useState({ text: '', period: 'present' as 'past' | 'present' | 'future', date: '', resources: '', learnings: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setEvents(initialEvents || []);
  }, [JSON.stringify(initialEvents)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddEvent = async () => {
    if (!session?.user || !newEvent.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/timeline-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newEvent })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setEvents(data.commandData.events || []);
      setNewEvent({ text: '', period: 'present', date: '', resources: '', learnings: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/timeline-board`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setEvents(data.commandData.events || []);
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
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'timeline-board', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/timeline-board`, { method: 'DELETE' });
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

  const pastEvents = events.filter(e => e.period === 'past');
  const presentEvents = events.filter(e => e.period === 'present');
  const futureEvents = events.filter(e => e.period === 'future');

  const periodConfig = {
    past: { label: '📜 Pasado', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-400', text: 'text-amber-700 dark:text-amber-300' },
    present: { label: '⚡ Presente', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-400', text: 'text-blue-700 dark:text-blue-300' },
    future: { label: '🚀 Futuro', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-400', text: 'text-purple-700 dark:text-purple-300' }
  };

  const renderEvent = (event: TimelineEvent) => (
    <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm relative group">
      <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{event.text}</p>
      {event.date && <p className="text-xs text-gray-500 mt-1">📅 {event.date}</p>}
      {event.resources && <p className="text-xs text-green-600 dark:text-green-400 mt-1">💪 {event.resources}</p>}
      {event.learnings && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">💡 {event.learnings}</p>}
      <p className="text-xs text-gray-400 mt-2">— {event.userName}</p>
      {!closed && event.userId === session?.user?.id && (
        <button onClick={() => handleDelete(event.id)} disabled={submitting}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <Clock className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Timeline Board (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Timeline Visual */}
      <div className="relative mb-6">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-blue-400 to-purple-400 -translate-y-1/2"></div>
        <div className="flex justify-between relative z-10">
          {['Pasado', 'Presente', 'Futuro'].map((label, i) => (
            <div key={label} className="flex flex-col items-center">
              <div className={`w-${i === 1 ? 6 : 4} h-${i === 1 ? 6 : 4} ${['bg-amber-500', 'bg-blue-500', 'bg-purple-500'][i]} rounded-full border-2 border-white`}></div>
              <span className={`text-xs mt-1 ${['text-amber-600', 'text-blue-600', 'text-purple-600'][i]}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {(['past', 'present', 'future'] as const).map(period => {
          const config = periodConfig[period];
          const periodEvents = period === 'past' ? pastEvents : period === 'present' ? presentEvents : futureEvents;
          return (
            <div key={period} className={`rounded-lg p-4 border-2 ${config.bg} ${config.border}`}>
              <h4 className={`text-center font-bold mb-3 ${config.text}`}>{config.label}</h4>
              <div className="space-y-2">
                {periodEvents.map(renderEvent)}
                {periodEvents.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Sin eventos</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input type="text" value={newEvent.text} onChange={(e) => setNewEvent({ ...newEvent, text: e.target.value })}
                placeholder="Evento o momento clave..." className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <select value={newEvent.period} onChange={(e) => setNewEvent({ ...newEvent, period: e.target.value as any })}
                className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600">
                <option value="past">📜 Pasado</option>
                <option value="present">⚡ Presente</option>
                <option value="future">🚀 Futuro</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input type="text" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                placeholder="Fecha (opcional)" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <input type="text" value={newEvent.resources} onChange={(e) => setNewEvent({ ...newEvent, resources: e.target.value })}
                placeholder="Recursos/Fortalezas" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <input type="text" value={newEvent.learnings} onChange={(e) => setNewEvent({ ...newEvent, learnings: e.target.value })}
                placeholder="Aprendizajes" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={handleAddEvent} disabled={!newEvent.text.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-400">Agregar Evento</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-center gap-2">
            <Plus size={18} /> Agregar Evento
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">
        {pastEvents.length} pasado • {presentEvents.length} presente • {futureEvents.length} futuro
      </div>

      {!closed && createdBy === session?.user?.id && events.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Timeline Board
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Timeline Board cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/timeline-board</code>
      </div>
    </div>
  );
}

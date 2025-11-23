'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Clock, User, CheckCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  text: string;
  author: { id: string; name: string };
  timestamp: Date;
}

interface IncidentCommandProps {
  projectId: string;
  messageId?: string;
  title: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  commander?: { id: string; name: string };
  timeline: TimelineEvent[];
  resolved: boolean;
  createdBy: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function IncidentCommand({
  projectId,
  messageId,
  title,
  severity: initialSeverity,
  commander: initialCommander,
  timeline: initialTimeline,
  resolved: initialResolved,
  createdBy,
  onClose,
  onUpdate
}: IncidentCommandProps) {
  const { data: session } = useSession();
  const [timeline, setTimeline] = useState<TimelineEvent[]>(initialTimeline);
  const [resolved, setResolved] = useState(initialResolved);
  const [newEvent, setNewEvent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddEvent = async () => {
    const text = newEvent.trim();
    if (!text || !session?.user?.id || resolved || submitting) return;

    setNewEvent('');

    if (!messageId) {
      setTimeline(prev => [...prev, {
        id: Date.now().toString(),
        text,
        author: { id: session.user.id, name: session.user.name || 'Usuario' },
        timestamp: new Date()
      }]);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-event', text })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setTimeline(data.commandData.timeline);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!messageId) {
      setResolved(true);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setResolved(data.commandData.resolved);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const severityConfig = {
    P0: { label: 'Critical', color: 'red', bg: 'bg-red-100 dark:bg-red-900/30' },
    P1: { label: 'High', color: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    P2: { label: 'Medium', color: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    P3: { label: 'Low', color: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    P4: { label: 'Minimal', color: 'gray', bg: 'bg-gray-100 dark:bg-gray-900/30' }
  };

  const config = severityConfig[initialSeverity];

  return (
    <div className={`${config.bg} rounded-lg border-2 border-${config.color}-300 dark:border-${config.color}-700 p-6 my-2`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-10 h-10 bg-${config.color}-600 rounded-full flex items-center justify-center`}>
            <AlertTriangle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
              🚨 Incident: {title}
              <span className={`text-xs px-2 py-0.5 rounded-full bg-${config.color}-600 text-white`}>
                {initialSeverity} - {config.label}
              </span>
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {resolved ? '✅ Resolved' : '🔴 Active'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {initialCommander && (
        <div className="bg-white dark:bg-gray-700 rounded p-2 mb-4 flex items-center gap-2">
          <User size={16} />
          <span className="text-sm"><strong>Commander:</strong> {initialCommander.name}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Clock size={16} />
          Timeline
        </h4>
        {timeline.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            No events yet...
          </p>
        ) : (
          <div className="space-y-2">
            {timeline.map(event => (
              <div key={event.id} className="border-l-2 border-gray-300 dark:border-gray-600 pl-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(event.timestamp).toLocaleTimeString()} - {event.author.name}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-100">{event.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!resolved && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newEvent}
              onChange={e => setNewEvent(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddEvent()}
              placeholder="Add event to timeline..."
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
            />
            <button
              onClick={handleAddEvent}
              disabled={submitting}
              className={`bg-${config.color}-600 hover:bg-${config.color}-700 text-white px-4 py-2 rounded font-medium`}
            >
              Add
            </button>
          </div>

          {createdBy === session?.user?.id && (
            <button
              onClick={handleResolve}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Mark as Resolved
            </button>
          )}
        </div>
      )}

      {resolved && (
        <div className="bg-green-100 dark:bg-green-900/30 rounded p-3 flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-800 dark:text-green-200 font-semibold">
            Incident resolved
          </span>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/incident</code>
      </div>
    </div>
  );
}

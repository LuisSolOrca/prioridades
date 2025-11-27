'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Plus, Trash2, Clock, MapPin, UserPlus } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface SessionSlot {
  id: string;
  topic: string;
  facilitator: string;
  facilitatorId: string;
  location?: string;
  time?: string;
  attendees: { id: string; name: string }[];
}

interface OpenSpaceCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  sessions: SessionSlot[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function OpenSpaceCommand({
  projectId,
  messageId,
  channelId,
  title,
  sessions: initialSessions,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: OpenSpaceCommandProps) {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<SessionSlot[]>(initialSessions || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newSession, setNewSession] = useState({ topic: '', location: '', time: '' });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setSessions(initialSessions || []);
  }, [JSON.stringify(initialSessions)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddSession = async () => {
    if (!session?.user || !newSession.topic.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/open-space`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          topic: newSession.topic.trim(),
          location: newSession.location.trim() || null,
          time: newSession.time.trim() || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setSessions(data.commandData.sessions || []);
      setNewSession({ topic: '', location: '', time: '' });
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinLeave = async (sessionId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/open-space`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-attendance', sessionId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setSessions(data.commandData.sessions || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/open-space`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setSessions(data.commandData.sessions || []);
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
        commandType: 'open-space',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/open-space`, {
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

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-teal-400 dark:border-teal-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Open Space / Marketplace {closed ? '• Cerrado' : '• Activo'} • {sessions.length} sesiones
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Open Space Principles */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4 text-xs text-gray-600 dark:text-gray-300">
        <p className="font-semibold mb-1">🦶 Ley de los Dos Pies:</p>
        <p>Si no estás aprendiendo ni contribuyendo, ¡muévete a otra sesión!</p>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {sessions.map((sess) => {
          const isAttending = sess.attendees?.some(a => a.id === session?.user?.id);
          const isFacilitator = sess.facilitatorId === session?.user?.id;

          return (
            <div key={sess.id} className="bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden relative group">
              <div className="bg-teal-100 dark:bg-teal-900/30 p-3 border-b border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{sess.topic}</h4>
                <p className="text-sm text-teal-600 dark:text-teal-400">👤 {sess.facilitator}</p>
              </div>

              <div className="p-3">
                {(sess.location || sess.time) && (
                  <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-600 dark:text-gray-400">
                    {sess.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {sess.location}
                      </span>
                    )}
                    {sess.time && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {sess.time}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <UserPlus size={14} className="text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {sess.attendees?.length || 0} participantes
                    </span>
                  </div>

                  {!closed && !isFacilitator && (
                    <button
                      onClick={() => handleJoinLeave(sess.id)}
                      disabled={submitting}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                        isAttending
                          ? 'bg-teal-500 text-white hover:bg-teal-600'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-teal-100'
                      }`}
                    >
                      {isAttending ? 'Salir' : 'Unirse'}
                    </button>
                  )}
                </div>

                {sess.attendees && sess.attendees.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {sess.attendees.map(a => a.name).join(', ')}
                  </div>
                )}
              </div>

              {!closed && isFacilitator && (
                <button
                  onClick={() => handleDelete(sess.id)}
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

      {/* Add Session Form */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Proponer Sesión</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={newSession.topic}
              onChange={(e) => setNewSession({ ...newSession, topic: e.target.value })}
              placeholder="Tema de la sesión *"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
            <input
              type="text"
              value={newSession.location}
              onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
              placeholder="Ubicación (opcional)"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
            <input
              type="text"
              value={newSession.time}
              onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
              placeholder="Hora (opcional)"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
            />
          </div>
          <button
            onClick={handleAddSession}
            disabled={!newSession.topic.trim() || submitting}
            className="mt-3 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Plus size={18} />
            Proponer Sesión
          </button>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && sessions.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Open Space
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Open Space cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/open-space</code>
      </div>
    </div>
  );
}

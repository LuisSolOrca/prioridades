'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Heart, Sparkles } from 'lucide-react';

interface Kudos {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  message: string;
  createdAt: string;
}

interface KudosWallCommandProps {
  projectId: string;
  messageId: string;
  title: string;
  kudos: Kudos[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function KudosWallCommand({
  projectId,
  messageId,
  title,
  kudos: initialKudos,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: KudosWallCommandProps) {
  const { data: session } = useSession();
  const [kudos, setKudos] = useState(initialKudos);
  const [closed, setClosed] = useState(initialClosed);
  const [toUser, setToUser] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddKudos = async () => {
    const kudosMessage = message.trim();
    const recipient = toUser.trim();

    if (!kudosMessage || !recipient || !session?.user || submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/kudos-wall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient, message: kudosMessage })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar kudos');
        return;
      }

      const data = await response.json();
      setKudos(data.commandData.kudos);
      setToUser('');
      setMessage('');
      onUpdate?.();
    } catch (error) {
      console.error('Error adding kudos:', error);
      alert('Error al agregar kudos');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/kudos-wall`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al cerrar');
        return;
      }

      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error closing:', error);
      alert('Error al cerrar');
    }
  };

  return (
    <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-pink-400 dark:border-pink-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Heart className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Kudos Wall • {kudos.length} reconocimientos • {closed ? 'Cerrado' : 'Activo'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Kudos Grid */}
      <div className="grid gap-3 mb-4">
        {kudos.map((kudo, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-700 rounded-lg p-4 border-l-4 border-pink-500"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="text-pink-500 flex-shrink-0 mt-1" size={16} />
              <div className="flex-1">
                <p className="text-gray-800 dark:text-gray-100 text-sm mb-2">{kudo.message}</p>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">{kudo.fromName}</span>
                  <span>→</span>
                  <span className="font-semibold text-pink-600 dark:text-pink-400">{kudo.toName}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Kudos */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
            Enviar Reconocimiento:
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              value={toUser}
              onChange={(e) => setToUser(e.target.value)}
              placeholder="Para (nombre del compañero)..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={submitting}
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mensaje de reconocimiento..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              disabled={submitting}
            />
            <button
              onClick={handleAddKudos}
              disabled={!toUser.trim() || !message.trim() || submitting}
              className="w-full px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 text-white rounded-lg transition flex items-center justify-center gap-2"
            >
              <Heart size={16} />
              Enviar Kudos
            </button>
          </div>
        </div>
      )}

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Kudos Wall cerrado con {kudos.length} reconocimientos
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Kudos Wall
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/kudos-wall</code>
      </div>
    </div>
  );
}

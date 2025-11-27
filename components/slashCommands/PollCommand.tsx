'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { BarChart3, CheckCircle } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface PollOption {
  text: string;
  votes: string[]; // Array de userIds que votaron
}

interface Poll {
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: Date;
  closed: boolean;
}

interface PollCommandProps {
  projectId: string;
  messageId?: string; // ID del mensaje que contiene el poll (si es persistente)
  channelId: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void; // Callback para recargar mensajes después de votar
}

export default function PollCommand({
  projectId,
  messageId,
  channelId,
  question,
  options: initialOptions,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: PollCommandProps) {
  const { data: session } = useSession();
  const [poll, setPoll] = useState<Poll>({
    question,
    options: initialOptions,
    createdBy,
    createdAt: new Date(),
    closed: initialClosed
  });
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setPoll(prev => ({
      ...prev,
      options: initialOptions,
      closed: initialClosed
    }));
  }, [initialOptions, initialClosed]);

  useEffect(() => {
    // Verificar si el usuario ya votó
    const userVoted = poll.options.some(opt =>
      opt.votes.includes(session?.user?.id || '')
    );
    setHasVoted(userVoted);
  }, [poll, session]);

  const handleVote = async (optionIndex: number) => {
    if (!session?.user?.id || poll.closed || hasVoted || voting) return;

    // Si no hay messageId, es un poll temporal (sin persistencia)
    if (!messageId) {
      setPoll(prev => ({
        ...prev,
        options: prev.options.map((opt, idx) => {
          if (idx === optionIndex) {
            return {
              ...opt,
              votes: [...opt.votes, session.user.id]
            };
          }
          return opt;
        })
      }));
      setHasVoted(true);
      return;
    }

    // Poll persistente: usar API
    try {
      setVoting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al votar');
        return;
      }

      const data = await response.json();
      setPoll(prev => ({
        ...prev,
        options: data.commandData.options,
        closed: data.commandData.closed
      }));
      setHasVoted(true);
      onUpdate?.(); // Recargar mensajes
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error al votar en la encuesta');
    } finally {
      setVoting(false);
    }
  };

  const handleClosePoll = async () => {
    // Si no hay messageId, es un poll temporal
    if (!messageId) {
      setPoll(prev => ({ ...prev, closed: true }));
      return;
    }

    // Poll persistente: usar API
    try {
      setVoting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'poll',
        title: question
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vote`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al cerrar encuesta');
        return;
      }

      const data = await response.json();
      setPoll(prev => ({
        ...prev,
        closed: data.commandData.closed
      }));
      onUpdate?.(); // Recargar mensajes
    } catch (error) {
      console.error('Error closing poll:', error);
      alert('Error al cerrar la encuesta');
    } finally {
      setVoting(false);
    }
  };

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const winningOption = poll.options.reduce((max, opt) =>
    opt.votes.length > max.votes.length ? opt : max
  , poll.options[0]);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-300 dark:border-purple-700 p-6 my-2">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <BarChart3 className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{poll.question}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'} •
              {poll.closed ? ' Encuesta cerrada' : ' Encuesta activa'}
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

      {/* Opciones */}
      <div className="space-y-3 mb-4">
        {poll.options.map((option, index) => {
          const percentage = getPercentage(option.votes.length);
          const isWinning = option === winningOption && totalVotes > 0;
          const userVotedThis = option.votes.includes(session?.user?.id || '');

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={poll.closed || hasVoted}
              className={`w-full text-left rounded-lg overflow-hidden transition-all ${
                poll.closed || hasVoted
                  ? 'cursor-default'
                  : 'hover:shadow-md cursor-pointer'
              } ${
                userVotedThis
                  ? 'ring-2 ring-purple-500 dark:ring-purple-400'
                  : ''
              }`}
            >
              <div className="relative bg-white dark:bg-gray-700 p-3">
                {/* Barra de progreso */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ${
                    isWinning
                      ? 'bg-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-900/50 dark:to-pink-900/50'
                      : 'bg-gray-100 dark:bg-gray-600'
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>

                {/* Contenido */}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {userVotedThis && (
                      <CheckCircle className="text-purple-600 dark:text-purple-400" size={18} />
                    )}
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {option.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(hasVoted || poll.closed) && (
                      <>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {option.votes.length} {option.votes.length === 1 ? 'voto' : 'votos'}
                        </span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {percentage}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Estado de votación */}
      {!hasVoted && !poll.closed && (
        <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 mb-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ℹ️ Selecciona una opción para votar
          </p>
        </div>
      )}

      {hasVoted && !poll.closed && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-3">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Tu voto ha sido registrado
          </p>
        </div>
      )}

      {poll.closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Esta encuesta ha sido cerrada. Ganadora: <strong>{winningOption.text}</strong>
          </p>
        </div>
      )}

      {/* Botón cerrar encuesta (solo creador) */}
      {!poll.closed && poll.createdBy === session?.user?.id && totalVotes > 0 && (
        <button
          onClick={handleClosePoll}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Encuesta
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/poll</code>
      </div>
    </div>
  );
}

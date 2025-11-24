'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { EyeOff, Eye, CheckCircle } from 'lucide-react';

interface BlindVoteOption {
  text: string;
  votes: string[]; // Array de userIds que votaron
}

interface BlindVoteCommandProps {
  projectId: string;
  messageId: string;
  question: string;
  options: BlindVoteOption[];
  createdBy: string;
  revealed: boolean;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function BlindVoteCommand({
  projectId,
  messageId,
  question,
  options: initialOptions,
  createdBy,
  revealed: initialRevealed,
  closed: initialClosed,
  onClose,
  onUpdate
}: BlindVoteCommandProps) {
  const { data: session } = useSession();
  const [options, setOptions] = useState(initialOptions);
  const [revealed, setRevealed] = useState(initialRevealed);
  const [closed, setClosed] = useState(initialClosed);
  const [voting, setVoting] = useState(false);

  const hasVoted = options.some(opt => opt.votes.includes(session?.user?.id || ''));

  const handleVote = async (optionIndex: number) => {
    if (!session?.user?.id || closed || hasVoted || voting) return;

    try {
      setVoting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/blind-vote`, {
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
      setOptions(data.commandData.options);
      setRevealed(data.commandData.revealed);
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error al votar');
    } finally {
      setVoting(false);
    }
  };

  const handleReveal = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/blind-vote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reveal' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al revelar');
        return;
      }

      const data = await response.json();
      setOptions(data.commandData.options);
      setRevealed(data.commandData.revealed);
      onUpdate?.();
    } catch (error) {
      console.error('Error revealing:', error);
      alert('Error al revelar resultados');
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/blind-vote`, {
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
      alert('Error al cerrar votación');
    }
  };

  const totalVotes = options.reduce((sum, opt) => sum + opt.votes.length, 0);
  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const winningOption = options.reduce((max, opt) =>
    opt.votes.length > max.votes.length ? opt : max
  , options[0]);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            {revealed ? <Eye className="text-white" size={20} /> : <EyeOff className="text-white" size={20} />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{question}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Votación Ciega •
              {revealed ? ` ${totalVotes} votos revelados` : ` Votos ocultos`} •
              {closed ? ' Cerrada' : ' Activa'}
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
        {options.map((option, index) => {
          const percentage = getPercentage(option.votes.length);
          const isWinning = option === winningOption && totalVotes > 0 && revealed;
          const userVotedThis = option.votes.includes(session?.user?.id || '');

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={closed || hasVoted}
              className={`w-full text-left rounded-lg overflow-hidden transition-all ${
                closed || hasVoted
                  ? 'cursor-default'
                  : 'hover:shadow-md cursor-pointer'
              } ${
                userVotedThis
                  ? 'ring-2 ring-indigo-500 dark:ring-indigo-400'
                  : ''
              }`}
            >
              <div className="relative bg-white dark:bg-gray-700 p-3">
                {/* Barra de progreso (solo si revealed) */}
                {revealed && (
                  <div
                    className={`absolute inset-0 transition-all duration-500 ${
                      isWinning
                        ? 'bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-900/50 dark:to-purple-900/50'
                        : 'bg-gray-100 dark:bg-gray-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                )}

                {/* Contenido */}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {userVotedThis && (
                      <CheckCircle className="text-indigo-600 dark:text-indigo-400" size={18} />
                    )}
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {option.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {revealed ? (
                      <>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {option.votes.length} {option.votes.length === 1 ? 'voto' : 'votos'}
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {percentage}%
                        </span>
                      </>
                    ) : userVotedThis ? (
                      <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                        ✓ Votado
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Estado */}
      {!hasVoted && !closed && !revealed && (
        <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 mb-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            🔒 Selecciona una opción. Los resultados se revelarán cuando el creador lo decida
          </p>
        </div>
      )}

      {hasVoted && !revealed && !closed && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-3">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Tu voto ha sido registrado. Esperando revelación...
          </p>
        </div>
      )}

      {revealed && !closed && (
        <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg p-3 mb-3">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            👁️ Resultados revelados
          </p>
        </div>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Votación cerrada. {revealed && `Ganadora: `}<strong>{revealed && winningOption.text}</strong>
          </p>
        </div>
      )}

      {/* Botones (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <div className="flex gap-2">
          {!revealed && totalVotes > 0 && (
            <button
              onClick={handleReveal}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              Revelar Resultados
            </button>
          )}
          {revealed && totalVotes > 0 && (
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              Cerrar Votación
            </button>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/blind-vote</code>
      </div>
    </div>
  );
}

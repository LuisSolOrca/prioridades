'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface NPSVote {
  userId: string;
  userName: string;
  score: number; // 0-10
}

interface NPSCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  question: string;
  votes: NPSVote[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function NPSCommand({
  projectId,
  messageId,
  channelId,
  question,
  votes: initialVotes,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: NPSCommandProps) {
  const { data: session } = useSession();
  const [votes, setVotes] = useState(initialVotes);
  const [closed, setClosed] = useState(initialClosed);
  const [voting, setVoting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const hasVoted = votes.some(v => v.userId === session?.user?.id);
  const userVote = votes.find(v => v.userId === session?.user?.id);

  const handleVote = async (score: number) => {
    if (!session?.user || closed || hasVoted || voting) return;

    try {
      setVoting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/nps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al votar');
        return;
      }

      const data = await response.json();
      setVotes(data.commandData.votes);
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error al votar');
    } finally {
      setVoting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setVoting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'nps',
        title: question
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/nps`, {
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
    } finally {
      setVoting(false);
    }
  };

  // Calcular NPS
  const promoters = votes.filter(v => v.score >= 9).length;
  const passives = votes.filter(v => v.score >= 7 && v.score <= 8).length;
  const detractors = votes.filter(v => v.score <= 6).length;
  const total = votes.length;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'bg-green-500';
    if (score >= 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getNPSColor = () => {
    if (nps >= 50) return 'text-green-600 dark:text-green-400';
    if (nps >= 0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-emerald-400 dark:border-emerald-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
            <ThumbsUp className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{question}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Net Promoter Score • {total} {total === 1 ? 'respuesta' : 'respuestas'} •
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

      {/* NPS Score */}
      {total > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resultado NPS:</span>
            <span className={`text-3xl font-bold ${getNPSColor()}`}>{nps}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-green-100 dark:bg-green-900/30 rounded p-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ThumbsUp size={14} className="text-green-700 dark:text-green-300" />
                <span className="font-semibold text-green-700 dark:text-green-300">{promoters}</span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">Promotores (9-10)</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded p-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Minus size={14} className="text-yellow-700 dark:text-yellow-300" />
                <span className="font-semibold text-yellow-700 dark:text-yellow-300">{passives}</span>
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Pasivos (7-8)</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 rounded p-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ThumbsDown size={14} className="text-red-700 dark:text-red-300" />
                <span className="font-semibold text-red-700 dark:text-red-300">{detractors}</span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400">Detractores (0-6)</p>
            </div>
          </div>
        </div>
      )}

      {/* Voting */}
      {!hasVoted && !closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            ¿Qué tan probable es que recomiendes esto? (0 = Nada probable, 10 = Muy probable)
          </p>
          <div className="grid grid-cols-11 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
              <button
                key={score}
                onClick={() => handleVote(score)}
                disabled={voting}
                className={`${getScoreColor(score)} hover:opacity-80 disabled:opacity-50 text-white font-bold py-2 rounded transition text-sm`}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasVoted && userVote && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-3">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Tu votaste: <strong>{userVote.score}/10</strong>
          </p>
        </div>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Encuesta cerrada. NPS final: <strong className={getNPSColor()}>{nps}</strong>
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && total > 0 && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Encuesta
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/nps</code>
      </div>
    </div>
  );
}

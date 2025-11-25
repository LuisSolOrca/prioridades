'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { TrendingUp } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Vote {
  userId: string;
  userName: string;
  confidence: number; // 1-5
  votedAt: string;
}

interface ConfidenceVoteCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  question: string;
  votes: Vote[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Muy bajo', emoji: '😰', color: 'bg-red-500', description: 'No confío en absoluto' },
  { value: 2, label: 'Bajo', emoji: '😟', color: 'bg-orange-500', description: 'Tengo muchas dudas' },
  { value: 3, label: 'Moderado', emoji: '😐', color: 'bg-yellow-500', description: 'Hay incertidumbre' },
  { value: 4, label: 'Alto', emoji: '🙂', color: 'bg-blue-500', description: 'Bastante seguro' },
  { value: 5, label: 'Muy alto', emoji: '😄', color: 'bg-green-500', description: 'Totalmente confiado' }
];

export default function ConfidenceVoteCommand({
  projectId,
  messageId,
  channelId,
  question,
  votes: initialVotes,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: ConfidenceVoteCommandProps) {
  const { data: session } = useSession();
  const cardRef = useRef<HTMLDivElement>(null);
  const [votes, setVotes] = useState(initialVotes);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);

  const handleVote = async (confidence: number) => {
    if (!session?.user || submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/confidence-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidence })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al votar');
        return;
      }

      const data = await response.json();
      setVotes(data.commandData.votes);
      onUpdate?.();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error al votar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'confidence-vote',
        title: question
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/confidence-vote`, {
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
      setSubmitting(false);
    }
  };

  const getAverage = () => {
    if (votes.length === 0) return null;
    const sum = votes.reduce((acc, vote) => acc + vote.confidence, 0);
    return sum / votes.length;
  };

  const getDistribution = () => {
    const dist = [0, 0, 0, 0, 0];
    votes.forEach(vote => {
      dist[vote.confidence - 1]++;
    });
    return dist;
  };

  const getUserVote = () => {
    return votes.find(v => v.userId === session?.user?.id);
  };

  const average = getAverage();
  const distribution = getDistribution();
  const userVote = getUserVote();

  const getAverageLevel = () => {
    if (average === null) return null;
    return CONFIDENCE_LEVELS.find(level => Math.round(average) === level.value);
  };

  const averageLevel = getAverageLevel();

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <TrendingUp className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Voto de Confianza</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {votes.length} votos • {closed ? 'Cerrado' : 'Activo'}
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

      {/* Question */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 border-l-4 border-indigo-500">
        <p className="text-lg text-gray-800 dark:text-gray-100 font-medium">
          {question}
        </p>
      </div>

      {/* Average Display */}
      {average !== null && averageLevel && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Nivel de confianza promedio:</p>
          <div className="flex items-center justify-center gap-3">
            <div className={`w-16 h-16 ${averageLevel.color} rounded-full flex items-center justify-center text-3xl shadow-lg`}>
              {averageLevel.emoji}
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {average.toFixed(1)}<span className="text-lg text-gray-500">/5</span>
              </p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {averageLevel.label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Voting Buttons */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
            ¿Qué tan seguro estás?
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {CONFIDENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => handleVote(level.value)}
                disabled={submitting}
                className={`py-3 px-2 text-xs rounded-lg transition font-medium ${
                  userVote?.confidence === level.value
                    ? `${level.color} text-white shadow-lg scale-105`
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                }`}
                title={level.description}
              >
                <div className="text-2xl mb-1">{level.emoji}</div>
                <div className="text-lg font-bold mb-1">{level.value}</div>
                <div className="text-[10px] leading-tight">{level.label}</div>
              </button>
            ))}
          </div>
          {userVote && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
              Tu voto: <span className="font-semibold">{userVote.confidence}/5 - {CONFIDENCE_LEVELS[userVote.confidence - 1].label}</span>
            </p>
          )}
        </div>
      )}

      {/* Distribution */}
      {votes.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
            Distribución de votos:
          </h4>
          <div className="space-y-2">
            {CONFIDENCE_LEVELS.map((level, index) => {
              const count = distribution[index];
              const percentage = votes.length > 0 ? (count / votes.length) * 100 : 0;

              return (
                <div key={level.value} className="flex items-center gap-2">
                  <div className="w-8 text-center">
                    <span className="text-lg">{level.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 overflow-hidden">
                        <div
                          className={`${level.color} h-full flex items-center justify-end px-2 text-white text-xs font-bold transition-all`}
                          style={{ width: `${percentage}%` }}
                        >
                          {count > 0 && count}
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voters List */}
      {votes.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
            Votos ({votes.length}):
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {votes.map((vote, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <span>{CONFIDENCE_LEVELS[vote.confidence - 1].emoji}</span>
                <span className="font-semibold">{vote.userName}</span>
                <span className="text-gray-400">({vote.confidence})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Voto de confianza cerrado con {votes.length} votos
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Votación
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/confidence-vote</code>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Hand, TrendingUp, X } from 'lucide-react';

interface UserVote {
  userId: string;
  name: string;
  value: number; // 0-5
}

interface FistOfFiveCommandProps {
  projectId: string;
  messageId?: string;
  question: string;
  votes: UserVote[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const FIST_OPTIONS = [
  { value: 5, label: '5 dedos', emoji: '✋', description: 'Totalmente de acuerdo, muy entusiasta', color: 'bg-green-500' },
  { value: 4, label: '4 dedos', emoji: '🖐️', description: 'De acuerdo', color: 'bg-green-400' },
  { value: 3, label: '3 dedos', emoji: '🤚', description: 'Neutral, puedo vivir con esto', color: 'bg-yellow-400' },
  { value: 2, label: '2 dedos', emoji: '✌️', description: 'Tengo algunas reservas', color: 'bg-orange-400' },
  { value: 1, label: '1 dedo', emoji: '☝️', description: 'Tengo serias preocupaciones', color: 'bg-red-400' },
  { value: 0, label: 'Puño', emoji: '✊', description: 'Totalmente en desacuerdo, veto', color: 'bg-red-600' }
];

export default function FistOfFiveCommand({
  projectId,
  messageId,
  question,
  votes: initialVotes,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: FistOfFiveCommandProps) {
  const { data: session } = useSession();
  const [votes, setVotes] = useState<UserVote[]>(initialVotes);
  const [closed, setClosed] = useState(initialClosed);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const userVote = votes.find(v => v.userId === session?.user?.id);
  const hasVoted = !!userVote;

  // Calcular estadísticas
  const totalVotes = votes.length;
  const average = totalVotes > 0
    ? votes.reduce((sum, v) => sum + v.value, 0) / totalVotes
    : 0;

  const voteCounts = FIST_OPTIONS.map(option => ({
    ...option,
    count: votes.filter(v => v.value === option.value).length,
    percentage: totalVotes > 0 ? (votes.filter(v => v.value === option.value).length / totalVotes) * 100 : 0
  }));

  const handleVote = async (value: number) => {
    if (closed || hasVoted || submitting) return;

    if (!messageId) {
      // Preview mode (antes de crear el mensaje)
      setVotes(prev => [...prev, {
        userId: session?.user?.id || 'temp',
        name: session?.user?.name || 'Usuario',
        value
      }]);
      setSelectedValue(value);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/fist-of-five`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', value })
      });

      if (!response.ok) throw new Error('Error al votar');

      const data = await response.json();
      setVotes(data.commandData.votes);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar tu voto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleClosed = async () => {
    if (!messageId || session?.user?.id !== createdBy) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/fist-of-five`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-closed' })
      });

      if (!response.ok) throw new Error('Error');

      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getConsensusMessage = () => {
    if (totalVotes === 0) return null;

    if (average >= 4) {
      return { text: '¡Excelente consenso! El equipo está muy de acuerdo.', color: 'text-green-600 dark:text-green-400' };
    } else if (average >= 3) {
      return { text: 'Consenso aceptable. El equipo puede proceder.', color: 'text-yellow-600 dark:text-yellow-400' };
    } else if (average >= 2) {
      return { text: 'Consenso bajo. Hay reservas importantes.', color: 'text-orange-600 dark:text-orange-400' };
    } else {
      return { text: 'Sin consenso. Se necesita más discusión.', color: 'text-red-600 dark:text-red-400' };
    }
  };

  const consensus = getConsensusMessage();

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-300 dark:border-purple-700 p-6 my-2 max-w-3xl w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <Hand className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{question}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Votación Fist of Five {closed && '(Cerrada)'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X size={20} />
        </button>
      </div>

      {/* Estadísticas */}
      {totalVotes > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Promedio: {average.toFixed(1)} / 5.0
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
            </span>
          </div>
          {consensus && (
            <p className={`text-sm font-medium ${consensus.color}`}>
              {consensus.text}
            </p>
          )}
        </div>
      )}

      {/* Opciones de votación */}
      {!hasVoted && !closed && (
        <div className="space-y-3 mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selecciona tu nivel de acuerdo:
          </p>
          {FIST_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleVote(option.value)}
              disabled={submitting}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedValue === option.value
                  ? 'border-purple-600 bg-purple-100 dark:bg-purple-900/30'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-purple-400'
              } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{option.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Ya votaste */}
      {hasVoted && (
        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {FIST_OPTIONS.find(o => o.value === userVote.value)?.emoji}
            </span>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                ✓ Has votado: {FIST_OPTIONS.find(o => o.value === userVote.value)?.label}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                {FIST_OPTIONS.find(o => o.value === userVote.value)?.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {totalVotes > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Distribución de votos:
          </h4>
          {voteCounts.map((option) => (
            <div key={option.value} className="flex items-center gap-3">
              <span className="text-xl">{option.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {option.count} ({option.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${option.color} h-full transition-all duration-300`}
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de votantes */}
      {totalVotes > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Han votado ({totalVotes}):
          </p>
          <div className="flex flex-wrap gap-2">
            {votes.map((vote, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs"
              >
                <span>{FIST_OPTIONS.find(o => o.value === vote.value)?.emoji}</span>
                <span className="text-gray-700 dark:text-gray-300">{vote.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón cerrar/abrir (solo creador) */}
      {messageId && session?.user?.id === createdBy && (
        <button
          onClick={handleToggleClosed}
          className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium"
        >
          {closed ? 'Reabrir votación' : 'Cerrar votación'}
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/fist-of-five</code>
      </div>
    </div>
  );
}

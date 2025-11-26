'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Trophy, RotateCcw, Users, Crown, Hand } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Vote {
  visibleUserId: string;
  userName: string;
  choice: 1 | 2;
}

interface Round {
  roundNumber: number;
  votes: Vote[];
  result: 'no-winner' | 'winner';
  winnerId?: string;
  winnerName?: string;
}

interface OddOneOutCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  purpose?: string;
  rounds: Round[];
  currentRound: number;
  winner?: { oderId: string; userName: string };
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function OddOneOutCommand({
  projectId,
  messageId,
  channelId,
  title,
  purpose,
  rounds: initialRounds,
  currentRound: initialCurrentRound,
  winner: initialWinner,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: OddOneOutCommandProps) {
  const { data: session } = useSession();
  const [rounds, setRounds] = useState<Round[]>(initialRounds || []);
  const [currentRound, setCurrentRound] = useState(initialCurrentRound || 1);
  const [winner, setWinner] = useState(initialWinner);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRounds(initialRounds || []);
    setCurrentRound(initialCurrentRound || 1);
    setWinner(initialWinner);
    setClosed(initialClosed);
  }, [initialRounds, initialCurrentRound, initialWinner, initialClosed]);

  // Get current round data
  const currentRoundData = rounds.find(r => r.roundNumber === currentRound);
  const currentVotes = currentRoundData?.votes || [];

  const handleVote = async (choice: 1 | 2) => {
    if (!session?.user || submitting || closed || winner) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/odd-one-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRounds(data.commandData.rounds || []);
      setCurrentRound(data.commandData.currentRound || 1);
      if (data.commandData.winner) {
        setWinner(data.commandData.winner);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckResult = async () => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/odd-one-out`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-result' })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRounds(data.commandData.rounds || []);
      setCurrentRound(data.commandData.currentRound || 1);
      if (data.commandData.winner) {
        setWinner(data.commandData.winner);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRound = async () => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/odd-one-out`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'new-round' })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRounds(data.commandData.rounds || []);
      setCurrentRound(data.commandData.currentRound || 1);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseGame = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'odd-one-out',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/odd-one-out`, {
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

  const oderId = session?.user?.id;
  const userVote = currentVotes.find(v => v.visibleUserId === oderId);
  const hasVoted = !!userVote;
  const isCreator = session?.user?.id === createdBy;

  // Count votes for current round
  const onesCount = currentVotes.filter(v => v.choice === 1).length;
  const twosCount = currentVotes.filter(v => v.choice === 2).length;

  // Determine if current round has a result
  const lastRound = rounds[rounds.length - 1];
  const roundHasResult = lastRound?.result !== undefined && lastRound.roundNumber === currentRound;

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl">✊</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Disparejo {closed ? '• Cerrado' : winner ? '• Tenemos ganador' : `• Ronda ${currentRound}`} • {currentVotes.length} participantes
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Purpose/Question */}
      {purpose && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Para decidir:</p>
          <p className="text-lg font-medium text-gray-800 dark:text-gray-100">{purpose}</p>
        </div>
      )}

      {/* Instructions */}
      {!winner && !closed && (
        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Reglas:</span> Elige 1 o 2 dedos. Si solo UNA persona queda diferente a los demás, esa persona es el <strong>disparejo</strong> y es seleccionada.
          </p>
        </div>
      )}

      {/* Winner celebration */}
      {winner && (
        <div className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-xl p-6 mb-4 text-center border-2 border-yellow-400 dark:border-yellow-600">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg animate-bounce">
            <Crown className="text-white" size={40} />
          </div>
          <h4 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-1">
            {winner.userName}
          </h4>
          <p className="text-amber-600 dark:text-amber-400">es el disparejo</p>
        </div>
      )}

      {/* Voting Buttons */}
      {!closed && !winner && (
        <div className="flex justify-center gap-6 mb-6">
          <button
            onClick={() => handleVote(1)}
            disabled={submitting}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl transition-all transform hover:scale-105 ${
              userVote?.choice === 1
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl ring-4 ring-blue-300'
                : 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 shadow-md'
            }`}
          >
            <span className="text-5xl">☝️</span>
            <span className="text-xl font-bold">UNO</span>
          </button>

          <button
            onClick={() => handleVote(2)}
            disabled={submitting}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl transition-all transform hover:scale-105 ${
              userVote?.choice === 2
                ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl ring-4 ring-purple-300'
                : 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-600 shadow-md'
            }`}
          >
            <span className="text-5xl">✌️</span>
            <span className="text-xl font-bold">DOS</span>
          </button>
        </div>
      )}

      {/* Current votes indicator (hidden until result) */}
      {!closed && !winner && currentVotes.length > 0 && !roundHasResult && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
            <Users size={16} />
            <span className="text-sm">{currentVotes.length} han votado (votos ocultos)</span>
          </div>
        </div>
      )}

      {/* Round result */}
      {roundHasResult && lastRound && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-center">
            Resultado Ronda {lastRound.roundNumber}
          </h4>

          <div className="flex justify-center gap-8 mb-4">
            <div className="text-center">
              <span className="text-3xl mb-1 block">☝️</span>
              <span className="text-2xl font-bold text-blue-600">{onesCount}</span>
              <p className="text-xs text-gray-500">UNO</p>
            </div>
            <div className="text-center">
              <span className="text-3xl mb-1 block">✌️</span>
              <span className="text-2xl font-bold text-purple-600">{twosCount}</span>
              <p className="text-xs text-gray-500">DOS</p>
            </div>
          </div>

          {/* Who voted what */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                <span>☝️</span> UNO
              </p>
              {currentVotes.filter(v => v.choice === 1).map(v => (
                <p key={v.visibleUserId} className="text-gray-600 dark:text-gray-400">{v.userName}</p>
              ))}
            </div>
            <div>
              <p className="font-semibold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                <span>✌️</span> DOS
              </p>
              {currentVotes.filter(v => v.choice === 2).map(v => (
                <p key={v.visibleUserId} className="text-gray-600 dark:text-gray-400">{v.userName}</p>
              ))}
            </div>
          </div>

          {lastRound.result === 'no-winner' && !winner && (
            <div className="mt-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3 text-center">
              <p className="text-orange-800 dark:text-orange-200 font-medium">
                No hay disparejo. Se necesita otra ronda.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Previous rounds history */}
      {rounds.length > 1 && (
        <div className="mb-4">
          <button
            onClick={() => {}}
            className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"
          >
            <RotateCcw size={14} />
            Historial: {rounds.length - 1} rondas anteriores
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!closed && !winner && isCreator && currentVotes.length >= 2 && !roundHasResult && (
          <button
            onClick={handleCheckResult}
            disabled={submitting}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Trophy size={18} />
            Verificar Resultado
          </button>
        )}

        {!closed && !winner && roundHasResult && lastRound?.result === 'no-winner' && (
          <button
            onClick={handleNewRound}
            disabled={submitting}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Nueva Ronda
          </button>
        )}

        {!closed && isCreator && (
          <button
            onClick={handleCloseGame}
            disabled={submitting}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
          >
            Cerrar Juego
          </button>
        )}
      </div>

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Juego cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/odd-one-out</code>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          width: 10px;
          height: 10px;
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ThumbsUp, ThumbsDown, Minus, Eye, EyeOff } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Vote {
  oderId: string;
  odeName: string;
  vote: 'up' | 'down' | 'sideways';
}

interface RomanVotingCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  question: string;
  votes: Vote[];
  revealed?: boolean;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function RomanVotingCommand({
  projectId,
  messageId,
  channelId,
  title,
  question,
  votes: initialVotes,
  revealed: initialRevealed,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: RomanVotingCommandProps) {
  const { data: session } = useSession();
  const [votes, setVotes] = useState<Vote[]>(initialVotes || []);
  const [revealed, setRevealed] = useState(initialRevealed ?? false);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVotes(initialVotes || []);
    setRevealed(initialRevealed ?? false);
    setClosed(initialClosed);
  }, [initialVotes, initialRevealed, initialClosed]);

  const handleVote = async (voteType: 'up' | 'down' | 'sideways') => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/roman-voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: voteType })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setVotes(data.commandData.votes || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReveal = async () => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/roman-voting`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reveal' })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRevealed(data.commandData.revealed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseVoting = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'roman-voting',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/roman-voting`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      setRevealed(true);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const userId = session?.user?.id;
  const userVote = votes.find(v => v.oderId === userId);
  const hasVoted = !!userVote;

  const upVotes = votes.filter(v => v.vote === 'up');
  const downVotes = votes.filter(v => v.vote === 'down');
  const sidewaysVotes = votes.filter(v => v.vote === 'sideways');

  const isCreator = session?.user?.id === createdBy;

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-400 dark:border-purple-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <ThumbsUp className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Roman Voting {closed ? '• Cerrado' : '• Activo'} • {votes.length} votos
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 text-center">
        <p className="text-lg font-medium text-gray-800 dark:text-gray-100">{question}</p>
      </div>

      {/* Voting Buttons */}
      {!closed && (
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => handleVote('up')}
            disabled={submitting}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all transform hover:scale-105 ${
              userVote?.vote === 'up'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'
            }`}
          >
            <ThumbsUp size={40} />
            <span className="text-sm font-semibold">A favor</span>
          </button>

          <button
            onClick={() => handleVote('sideways')}
            disabled={submitting}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all transform hover:scale-105 ${
              userVote?.vote === 'sideways'
                ? 'bg-yellow-500 text-white shadow-lg'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200'
            }`}
          >
            <Minus size={40} className="rotate-0" />
            <span className="text-sm font-semibold">Neutral</span>
          </button>

          <button
            onClick={() => handleVote('down')}
            disabled={submitting}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all transform hover:scale-105 ${
              userVote?.vote === 'down'
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
            }`}
          >
            <ThumbsDown size={40} />
            <span className="text-sm font-semibold">En contra</span>
          </button>
        </div>
      )}

      {/* Results */}
      {(revealed || closed) && votes.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-center">Resultados</h4>

          {/* Visual bars */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="text-green-500" size={20} />
              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-green-500 h-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${votes.length ? (upVotes.length / votes.length) * 100 : 0}%` }}
                >
                  {upVotes.length > 0 && (
                    <span className="text-white text-xs font-bold">{upVotes.length}</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold w-12 text-right text-gray-600 dark:text-gray-400">
                {votes.length ? Math.round((upVotes.length / votes.length) * 100) : 0}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Minus className="text-yellow-500" size={20} />
              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-yellow-500 h-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${votes.length ? (sidewaysVotes.length / votes.length) * 100 : 0}%` }}
                >
                  {sidewaysVotes.length > 0 && (
                    <span className="text-white text-xs font-bold">{sidewaysVotes.length}</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold w-12 text-right text-gray-600 dark:text-gray-400">
                {votes.length ? Math.round((sidewaysVotes.length / votes.length) * 100) : 0}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ThumbsDown className="text-red-500" size={20} />
              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-red-500 h-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${votes.length ? (downVotes.length / votes.length) * 100 : 0}%` }}
                >
                  {downVotes.length > 0 && (
                    <span className="text-white text-xs font-bold">{downVotes.length}</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold w-12 text-right text-gray-600 dark:text-gray-400">
                {votes.length ? Math.round((downVotes.length / votes.length) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Voter names */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="font-semibold text-green-600 dark:text-green-400 mb-1">A favor</p>
              {upVotes.map(v => (
                <p key={v.oderId} className="text-gray-600 dark:text-gray-400">{v.odeName}</p>
              ))}
            </div>
            <div>
              <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">Neutral</p>
              {sidewaysVotes.map(v => (
                <p key={v.oderId} className="text-gray-600 dark:text-gray-400">{v.odeName}</p>
              ))}
            </div>
            <div>
              <p className="font-semibold text-red-600 dark:text-red-400 mb-1">En contra</p>
              {downVotes.map(v => (
                <p key={v.oderId} className="text-gray-600 dark:text-gray-400">{v.odeName}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden votes indicator */}
      {!revealed && !closed && votes.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
            <EyeOff size={16} />
            <span className="text-sm">{votes.length} votos ocultos</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!closed && !revealed && isCreator && votes.length > 0 && (
          <button
            onClick={handleReveal}
            disabled={submitting}
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Eye size={18} />
            Revelar Votos
          </button>
        )}
        {!closed && isCreator && votes.length > 0 && (
          <button
            onClick={handleCloseVoting}
            disabled={submitting}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
          >
            Cerrar Votación
          </button>
        )}
      </div>

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Votación cerrada
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/roman-voting</code>
      </div>
    </div>
  );
}

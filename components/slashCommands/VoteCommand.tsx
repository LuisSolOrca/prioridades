'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Vote, TrendingUp } from 'lucide-react';

interface VoteOption {
  text: string;
  points: number;
}

interface UserVote {
  userId: string;
  name: string;
  votes: { [optionIndex: number]: number };
}

interface VoteCommandProps {
  projectId: string;
  messageId?: string;
  question: string;
  options: VoteOption[];
  totalPoints: number;
  userVotes: UserVote[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function VoteCommand({
  projectId,
  messageId,
  question,
  options: initialOptions,
  totalPoints,
  userVotes: initialUserVotes,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: VoteCommandProps) {
  const { data: session } = useSession();
  const [options, setOptions] = useState<VoteOption[]>(initialOptions);
  const [userVotes, setUserVotes] = useState<UserVote[]>(initialUserVotes);
  const [closed, setClosed] = useState(initialClosed);
  const [myVotes, setMyVotes] = useState<{ [key: number]: number }>({});

  const userVote = userVotes.find(v => v.userId === session?.user?.id);
  const pointsUsed = Object.values(myVotes).reduce((sum, p) => sum + p, 0);
  const pointsLeft = totalPoints - pointsUsed;

  const handleVote = (optionIndex: number, points: number) => {
    if (closed || userVote) return;
    setMyVotes(prev => ({ ...prev, [optionIndex]: Math.max(0, Math.min(pointsLeft + (prev[optionIndex] || 0), points)) }));
  };

  const handleSubmit = async () => {
    if (!session?.user?.id || Object.keys(myVotes).length === 0) return;

    if (!messageId) {
      setUserVotes(prev => [...prev, {
        userId: session.user.id,
        name: session.user.name || 'Usuario',
        votes: myVotes
      }]);
      const newOptions = initialOptions.map((opt, idx) => ({
        ...opt,
        points: opt.points + (myVotes[idx] || 0)
      }));
      setOptions(newOptions);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vote-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', votes: myVotes })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setOptions(data.commandData.options);
      setUserVotes(data.commandData.userVotes);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const maxPoints = Math.max(...options.map(o => o.points), 1);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-300 dark:border-blue-700 p-6 my-2 max-w-3xl w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Vote className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{question}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {totalPoints} puntos para distribuir
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {!userVote && !closed && (
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 mb-3 text-center">
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            Puntos restantes: {pointsLeft} / {totalPoints}
          </span>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {options.map((option, idx) => {
          const percentage = (option.points / maxPoints) * 100;
          const myPoints = myVotes[idx] || 0;

          return (
            <div key={idx} className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
              <div className="relative p-3">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-900/50 dark:to-indigo-900/50 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span className="flex-1 min-w-0 font-medium text-gray-800 dark:text-gray-100 break-words">{option.text}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-blue-600 dark:text-blue-400">{option.points} pts</span>
                    {!userVote && !closed && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleVote(idx, myPoints - 1)}
                          className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold">{myPoints}</span>
                        <button
                          onClick={() => handleVote(idx, myPoints + 1)}
                          className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!userVote && !closed && pointsUsed > 0 && (
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
        >
          Enviar Votos
        </button>
      )}

      {userVote && (
        <div className="bg-green-100 dark:bg-green-900/30 rounded p-3 text-sm text-green-800 dark:text-green-200">
          ✓ Has votado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/vote</code>
      </div>
    </div>
  );
}

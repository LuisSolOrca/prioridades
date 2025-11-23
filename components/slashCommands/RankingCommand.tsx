'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ListOrdered, GripVertical, Trophy } from 'lucide-react';

interface UserRanking {
  userId: string;
  name: string;
  ranking: string[]; // array of option texts in order
}

interface RankingCommandProps {
  projectId: string;
  messageId?: string;
  question: string;
  options: string[];
  rankings: UserRanking[];
  closed: boolean;
  createdBy: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function RankingCommand({
  projectId,
  messageId,
  question,
  options: initialOptions,
  rankings: initialRankings,
  closed: initialClosed,
  createdBy,
  onClose,
  onUpdate
}: RankingCommandProps) {
  const { data: session } = useSession();
  const [rankings, setRankings] = useState<UserRanking[]>(initialRankings);
  const [closed, setClosed] = useState(initialClosed);
  const [myRanking, setMyRanking] = useState<string[]>(initialOptions);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const userRanking = rankings.find(r => r.userId === session?.user?.id);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newRanking = [...myRanking];
    const draggedItem = newRanking[draggedIndex];
    newRanking.splice(draggedIndex, 1);
    newRanking.splice(index, 0, draggedItem);

    setMyRanking(newRanking);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async () => {
    if (!session?.user?.id || userRanking || submitting) return;

    if (!messageId) {
      setRankings(prev => [...prev, {
        userId: session.user.id,
        name: session.user.name || 'Usuario',
        ranking: myRanking
      }]);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', ranking: myRanking })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setRankings(data.commandData.rankings);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRanking = async () => {
    if (!messageId) {
      setClosed(true);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Calculate average positions
  const calculateAverageRankings = () => {
    const positionSums: Record<string, { sum: number; count: number }> = {};

    rankings.forEach(r => {
      r.ranking.forEach((option, index) => {
        if (!positionSums[option]) {
          positionSums[option] = { sum: 0, count: 0 };
        }
        positionSums[option].sum += index + 1; // positions are 1-indexed
        positionSums[option].count += 1;
      });
    });

    return Object.entries(positionSums)
      .map(([option, data]) => ({
        option,
        avgPosition: data.sum / data.count
      }))
      .sort((a, b) => a.avgPosition - b.avgPosition);
  };

  const averageRankings = rankings.length > 0 ? calculateAverageRankings() : [];

  const getMedalColor = (position: number) => {
    if (position === 0) return 'text-yellow-500'; // 🥇
    if (position === 1) return 'text-gray-400'; // 🥈
    if (position === 2) return 'text-orange-700'; // 🥉
    return 'text-gray-600';
  };

  const getMedal = (position: number) => {
    if (position === 0) return '🥇';
    if (position === 1) return '🥈';
    if (position === 2) return '🥉';
    return `#${position + 1}`;
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 p-6 my-2 max-w-4xl w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
            <ListOrdered className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">🏆 {question}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {rankings.length} {rankings.length === 1 ? 'ranking' : 'rankings'} enviado{rankings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* User's ranking interface */}
      {!userRanking && !closed && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-300 dark:border-indigo-600 p-4 mb-4">
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-3">
            Arrastra para ordenar según tu preferencia:
          </p>
          <div className="space-y-2 mb-4">
            {myRanking.map((option, index) => (
              <div
                key={option}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white dark:bg-gray-700 rounded-lg p-3 cursor-move flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="text-gray-400" size={20} />
                <span className="font-bold text-indigo-600 dark:text-indigo-400 w-8">
                  #{index + 1}
                </span>
                <span className="flex-1 min-w-0 text-gray-800 dark:text-gray-100 break-words">{option}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium"
          >
            {submitting ? 'Enviando...' : 'Enviar Ranking'}
          </button>
        </div>
      )}

      {/* Confirmation for submitted users */}
      {userRanking && !closed && (
        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
            ✓ Ranking enviado
          </p>
        </div>
      )}

      {/* Average/Consensus Rankings */}
      {rankings.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Trophy size={18} className="text-yellow-500" />
            Ranking Consensuado
          </h4>
          <div className="space-y-2">
            {averageRankings.map((item, index) => (
              <div
                key={item.option}
                className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
              >
                <span className={`text-2xl ${getMedalColor(index)}`}>
                  {getMedal(index)}
                </span>
                <span className="flex-1 min-w-0 font-medium text-gray-800 dark:text-gray-100 break-words">
                  {item.option}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Pos. promedio: {item.avgPosition.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual rankings */}
      {rankings.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Rankings Individuales
          </h4>
          <div className="space-y-3">
            {rankings.map(r => (
              <div key={r.userId} className="bg-white dark:bg-gray-700 rounded p-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {r.name}
                </p>
                <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-4">
                  {r.ranking.map((option, idx) => (
                    <li key={idx} className="list-decimal">
                      {option}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close button for creator */}
      {!closed && createdBy === session?.user?.id && rankings.length > 0 && (
        <button
          onClick={handleCloseRanking}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium mb-2"
        >
          Cerrar Ranking
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 text-center text-sm text-gray-600 dark:text-gray-400 mb-2">
          Ranking cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/ranking</code>
      </div>
    </div>
  );
}

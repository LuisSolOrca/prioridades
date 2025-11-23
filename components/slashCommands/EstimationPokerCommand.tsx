'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Sparkles, Eye, EyeOff, Calculator, Check } from 'lucide-react';

interface Estimate {
  userId: string;
  name: string;
  value: string; // '1', '2', '3', '5', '8', '13', '21', '∞', '?'
  revealed: boolean;
}

interface EstimationPokerCommandProps {
  projectId: string;
  messageId?: string;
  topic: string;
  estimates: Estimate[];
  revealed: boolean;
  finalEstimate: string | null;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const POKER_CARDS = ['1', '2', '3', '5', '8', '13', '21', '∞', '?'];

export default function EstimationPokerCommand({
  projectId,
  messageId,
  topic,
  estimates: initialEstimates,
  revealed: initialRevealed,
  finalEstimate: initialFinalEstimate,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: EstimationPokerCommandProps) {
  const { data: session } = useSession();
  const [estimates, setEstimates] = useState<Estimate[]>(initialEstimates);
  const [revealed, setRevealed] = useState(initialRevealed);
  const [finalEstimate, setFinalEstimate] = useState(initialFinalEstimate);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setEstimates(initialEstimates);
    setRevealed(initialRevealed);
    setFinalEstimate(initialFinalEstimate);
    setClosed(initialClosed);
  }, [initialEstimates, initialRevealed, initialFinalEstimate, initialClosed]);

  const handleEstimate = async (value: string) => {
    if (!session?.user?.id || revealed || closed || submitting) return;

    if (!messageId) {
      // Temporal
      setEstimates(prev => {
        const existing = prev.find(e => e.userId === session.user.id);
        if (existing) {
          return prev.map(e =>
            e.userId === session.user.id ? { ...e, value } : e
          );
        }
        return [...prev, {
          userId: session.user.id,
          name: session.user.name || 'Usuario',
          value,
          revealed: false
        }];
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/estimation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'estimate', value })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setEstimates(data.commandData.estimates);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReveal = async () => {
    if (!messageId) {
      setRevealed(true);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/estimation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reveal' })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setRevealed(data.commandData.revealed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleFinalize = async (value: string) => {
    if (!messageId) {
      setFinalEstimate(value);
      setClosed(true);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/estimation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', finalEstimate: value })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setFinalEstimate(data.commandData.finalEstimate);
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const userEstimate = estimates.find(e => e.userId === session?.user?.id);
  const allEstimated = estimates.length > 0;

  const calculateStats = () => {
    const numericEstimates = estimates
      .map(e => e.value)
      .filter(v => v !== '∞' && v !== '?')
      .map(v => parseInt(v));

    if (numericEstimates.length === 0) return null;

    const avg = numericEstimates.reduce((a, b) => a + b, 0) / numericEstimates.length;
    const sorted = [...numericEstimates].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...numericEstimates);
    const max = Math.max(...numericEstimates);

    return { avg: Math.round(avg * 10) / 10, median, min, max };
  };

  const stats = revealed ? calculateStats() : null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 p-6 my-2">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <Sparkles className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Planning Poker</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{topic}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{estimates.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Estimados</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {revealed ? (stats?.avg || '-') : '?'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Promedio</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-pink-600 dark:text-pink-400">
            {finalEstimate || '-'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Final</div>
        </div>
      </div>

      {/* Poker Cards */}
      {!revealed && !closed && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tu estimación:</p>
          <div className="flex flex-wrap gap-2">
            {POKER_CARDS.map(card => (
              <button
                key={card}
                onClick={() => handleEstimate(card)}
                disabled={submitting}
                className={`w-12 h-16 rounded-lg font-bold text-lg transition ${
                  userEstimate?.value === card
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-indigo-100 dark:hover:bg-gray-600'
                }`}
              >
                {card}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estimates */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Estimaciones del equipo:</h4>
        {estimates.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            Esperando estimaciones...
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {estimates.map(est => (
              <div key={est.userId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-600 rounded p-2">
                <span className="text-sm text-gray-700 dark:text-gray-200">{est.name}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {revealed ? est.value : '🎴'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats after reveal */}
      {revealed && stats && !closed && (
        <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Calculator size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-blue-800 dark:text-blue-200">Estadísticas:</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div><span className="text-blue-600 dark:text-blue-400 font-semibold">Promedio:</span> {stats.avg}</div>
            <div><span className="text-blue-600 dark:text-blue-400 font-semibold">Mediana:</span> {stats.median}</div>
            <div><span className="text-blue-600 dark:text-blue-400 font-semibold">Min:</span> {stats.min}</div>
            <div><span className="text-blue-600 dark:text-blue-400 font-semibold">Max:</span> {stats.max}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      {!closed && createdBy === session?.user?.id && (
        <div className="flex gap-2">
          {!revealed && allEstimated && (
            <button
              onClick={handleReveal}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Eye size={18} />
              Revelar Cartas
            </button>
          )}
          {revealed && !closed && (
            <select
              onChange={(e) => e.target.value && handleFinalize(e.target.value)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium"
            >
              <option value="">Finalizar con...</option>
              {POKER_CARDS.filter(c => c !== '?' && c !== '∞').map(card => (
                <option key={card} value={card}>{card} puntos</option>
              ))}
            </select>
          )}
        </div>
      )}

      {closed && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 flex items-center gap-2">
          <Check size={18} className="text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-800 dark:text-green-200 font-semibold">
            Estimación final: {finalEstimate} puntos
          </span>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/estimation-poker</code>
      </div>
    </div>
  );
}

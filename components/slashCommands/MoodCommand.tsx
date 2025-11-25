'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Smile, TrendingUp } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface UserMood {
  userId: string;
  name: string;
  mood: string;
}

interface MoodCommandProps {
  projectId: string;
  messageId?: string;
  channelId: string;
  question: string;
  moods: UserMood[];
  closed: boolean;
  createdBy: string;
  onClose: () => void;
  onUpdate?: () => void;
}

const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Genial', color: 'bg-green-100 dark:bg-green-900/30 border-green-300' },
  { emoji: '💪', label: 'Motivado', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300' },
  { emoji: '😐', label: 'Normal', color: 'bg-gray-100 dark:bg-gray-900/30 border-gray-300' },
  { emoji: '😴', label: 'Cansado', color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300' },
  { emoji: '😟', label: 'Estresado', color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300' },
  { emoji: '😤', label: 'Frustrado', color: 'bg-red-100 dark:bg-red-900/30 border-red-300' },
  { emoji: '🔥', label: 'En llamas', color: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300' },
  { emoji: '🤯', label: 'Abrumado', color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300' }
];

export default function MoodCommand({
  projectId,
  messageId,
  channelId,
  question,
  moods: initialMoods,
  closed: initialClosed,
  createdBy,
  onClose,
  onUpdate
}: MoodCommandProps) {
  const { data: session } = useSession();
  const [moods, setMoods] = useState<UserMood[]>(initialMoods);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado cuando llegan actualizaciones de Pusher
  useEffect(() => {
    setMoods(initialMoods);
    setClosed(initialClosed);
  }, [initialMoods, initialClosed]);

  const userMood = moods.find(m => m.userId === session?.user?.id);

  const handleSelectMood = async (mood: string) => {
    if (!session?.user?.id || closed || submitting) return;

    if (!messageId) {
      setMoods(prev => {
        const existing = prev.find(m => m.userId === session.user.id);
        if (existing) {
          return prev.map(m =>
            m.userId === session.user.id ? { ...m, mood } : m
          );
        }
        return [...prev, {
          userId: session.user.id,
          name: session.user.name || 'Usuario',
          mood
        }];
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', mood })
      });

      if (!response.ok) throw new Error('Error');
      const data = await response.json();
      setMoods(data.commandData.moods);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!messageId) {
      setClosed(true);
      return;
    }

    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'mood',
        title: question
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/mood`, {
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
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate mood distribution
  const moodCounts = moods.reduce((acc, m) => {
    acc[m.mood] = (acc[m.mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalResponses = moods.length;

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-pink-300 dark:border-pink-700 p-6 my-2 max-w-3xl w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
            <Smile className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{question}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {totalResponses} {totalResponses === 1 ? 'respuesta' : 'respuestas'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Mood Selection */}
      {!userMood && !closed && (
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">
            ¿Cómo te sientes hoy?
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {MOOD_OPTIONS.map(option => (
              <button
                key={option.emoji}
                onClick={() => handleSelectMood(option.emoji)}
                disabled={submitting}
                className={`${option.color} border-2 rounded-lg p-4 hover:scale-105 transition-transform disabled:opacity-50`}
              >
                <div className="text-4xl mb-1">{option.emoji}</div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  {option.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User's selection confirmation */}
      {userMood && !closed && (
        <div className="bg-pink-100 dark:bg-pink-900/30 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm font-semibold text-pink-800 dark:text-pink-200">
            Tu estado: <span className="text-2xl ml-2">{userMood.mood}</span>
          </p>
          <button
            onClick={() => handleSelectMood('')}
            className="text-xs text-pink-600 dark:text-pink-400 underline mt-1"
          >
            Cambiar
          </button>
        </div>
      )}

      {/* Results */}
      {moods.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <TrendingUp size={16} />
            Resumen del equipo
          </h4>
          <div className="space-y-2">
            {MOOD_OPTIONS.map(option => {
              const count = moodCounts[option.emoji] || 0;
              const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;

              if (count === 0) return null;

              return (
                <div key={option.emoji} className="flex items-center gap-2">
                  <span className="text-2xl">{option.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{option.label}</span>
                      <span className="text-gray-600 dark:text-gray-400">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Participants list */}
      {moods.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 mb-4">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            Participantes:
          </p>
          <div className="flex flex-wrap gap-2">
            {moods.map(m => (
              <div
                key={m.userId}
                className="bg-white dark:bg-gray-700 rounded-full px-3 py-1 text-xs flex items-center gap-1"
              >
                <span>{m.mood}</span>
                <span className="text-gray-700 dark:text-gray-300">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close button for creator */}
      {!closed && createdBy === session?.user?.id && totalResponses > 0 && (
        <button
          onClick={handleClose}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-lg font-medium mb-2"
        >
          Cerrar Check-in
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Check-in cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/mood</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

interface PomodoroCommandProps {
  projectId: string;
  messageId: string;
  title: string;
  workMinutes: number;
  breakMinutes: number;
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number;
  isBreak: boolean;
  sessionsCompleted: number;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PomodoroCommand({
  projectId,
  messageId,
  title,
  workMinutes,
  breakMinutes,
  isRunning: initialIsRunning,
  isPaused: initialIsPaused,
  timeRemaining: initialTimeRemaining,
  isBreak: initialIsBreak,
  sessionsCompleted: initialSessionsCompleted,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: PomodoroCommandProps) {
  const { data: session } = useSession();
  const [isRunning, setIsRunning] = useState(initialIsRunning);
  const [isPaused, setIsPaused] = useState(initialIsPaused);
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [isBreak, setIsBreak] = useState(initialIsBreak);
  const [sessionsCompleted, setSessionsCompleted] = useState(initialSessionsCompleted);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);

  // Local timer countdown
  useEffect(() => {
    if (!isRunning || isPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer finished
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, timeRemaining]);

  const handleStart = async () => {
    if (submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/pomodoro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al iniciar');
        return;
      }

      const data = await response.json();
      setIsRunning(data.commandData.isRunning);
      setIsPaused(data.commandData.isPaused);
      setTimeRemaining(data.commandData.timeRemaining);
      setIsBreak(data.commandData.isBreak);
      setSessionsCompleted(data.commandData.sessionsCompleted);
      onUpdate?.();
    } catch (error) {
      console.error('Error starting:', error);
      alert('Error al iniciar');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/pomodoro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al pausar');
        return;
      }

      const data = await response.json();
      setIsPaused(data.commandData.isPaused);
      onUpdate?.();
    } catch (error) {
      console.error('Error pausing:', error);
      alert('Error al pausar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/pomodoro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al reiniciar');
        return;
      }

      const data = await response.json();
      setIsRunning(data.commandData.isRunning);
      setIsPaused(data.commandData.isPaused);
      setTimeRemaining(data.commandData.timeRemaining);
      setIsBreak(data.commandData.isBreak);
      setSessionsCompleted(data.commandData.sessionsCompleted);
      onUpdate?.();
    } catch (error) {
      console.error('Error resetting:', error);
      alert('Error al reiniciar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/pomodoro`, {
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
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isBreak
    ? ((breakMinutes * 60 - timeRemaining) / (breakMinutes * 60)) * 100
    : ((workMinutes * 60 - timeRemaining) / (workMinutes * 60)) * 100;

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-red-400 dark:border-red-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Timer className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Pomodoro • {workMinutes} min trabajo / {breakMinutes} min descanso • {sessionsCompleted} sesiones completadas
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

      {/* Timer Display */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 mb-4">
        <div className="text-center mb-4">
          <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-3 ${
            isBreak
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}>
            {isBreak ? '☕ Descanso' : '🎯 Trabajo'}
          </div>
          <div className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-mono">
            {formatTime(timeRemaining)}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${isBreak ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        {!closed && (
          <div className="flex gap-2 justify-center">
            {!isRunning || isPaused ? (
              <button
                onClick={handleStart}
                disabled={submitting}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition flex items-center gap-2 font-semibold"
              >
                <Play size={20} />
                {isRunning ? 'Reanudar' : 'Iniciar'}
              </button>
            ) : (
              <button
                onClick={handlePause}
                disabled={submitting}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded-lg transition flex items-center gap-2 font-semibold"
              >
                <Pause size={20} />
                Pausar
              </button>
            )}
            <button
              onClick={handleReset}
              disabled={submitting}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition flex items-center gap-2 font-semibold"
            >
              <RotateCcw size={20} />
              Reiniciar
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-sm text-red-800 dark:text-red-200 mb-4">
        <p className="font-medium mb-1">🍅 Técnica Pomodoro</p>
        <p className="text-xs">
          Trabaja enfocado durante {workMinutes} minutos, luego descansa {breakMinutes} minutos.
          Después de 4 pomodoros, toma un descanso largo (15-30 min).
        </p>
      </div>

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Pomodoro cerrado con {sessionsCompleted} sesiones completadas
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Pomodoro
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/pomodoro</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Timer as TimerIcon, Play, Pause, RotateCcw } from 'lucide-react';

interface TimerCommandProps {
  projectId: string;
  messageId?: string;
  title: string;
  duration: number; // in seconds
  startTime?: number;
  paused: boolean;
  onClose: () => void;
}

export default function TimerCommand({
  projectId,
  messageId,
  title,
  duration,
  startTime: initialStartTime,
  paused: initialPaused,
  onClose
}: TimerCommandProps) {
  const [remaining, setRemaining] = useState(duration);
  const [paused, setPaused] = useState(initialPaused);

  useEffect(() => {
    if (paused || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const percentage = ((duration - remaining) / duration) * 100;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-orange-300 dark:border-orange-700 p-6 my-2 max-w-2xl w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
            <TimerIcon className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="text-center mb-4">
        <div className={`text-6xl font-bold ${remaining <= 10 && remaining > 0 ? 'text-red-600 animate-pulse' : 'text-gray-900 dark:text-gray-100'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
        <div
          className={`h-4 rounded-full transition-all ${remaining <= 10 && remaining > 0 ? 'bg-red-600' : 'bg-orange-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setPaused(!paused)}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => setRemaining(duration)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {remaining === 0 && (
        <div className="mt-4 bg-red-100 dark:bg-red-900/30 rounded p-3 text-center">
          <span className="text-red-800 dark:text-red-200 font-bold">⏰ Time's Up!</span>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/timer</code>
      </div>
    </div>
  );
}

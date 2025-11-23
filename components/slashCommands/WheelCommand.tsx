'use client';

import { useState } from 'react';
import { Disc3, Play } from 'lucide-react';

interface WheelCommandProps {
  projectId: string;
  messageId?: string;
  title: string;
  options: string[];
  winner?: string;
  onClose: () => void;
}

export default function WheelCommand({
  title,
  options,
  winner: initialWinner,
  onClose
}: WheelCommandProps) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(initialWinner);
  const [rotation, setRotation] = useState(0);

  const spin = () => {
    if (spinning) return;

    setSpinning(true);
    const spins = 5 + Math.random() * 3;
    const randomIndex = Math.floor(Math.random() * options.length);
    const degrees = (360 / options.length) * randomIndex;
    const totalRotation = 360 * spins + degrees;

    setRotation(totalRotation);

    setTimeout(() => {
      setWinner(options[randomIndex]);
      setSpinning(false);
    }, 3000);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-300 dark:border-purple-700 p-6 my-2 max-w-2xl w-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <Disc3 className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">🎰 {title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{options.length} opciones</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="relative w-64 h-64 mx-auto mb-4">
        <div
          className="w-full h-full rounded-full border-8 border-purple-600 flex items-center justify-center transition-transform duration-3000 ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(${options.map((_, i) => {
              const start = (i / options.length) * 100;
              const end = ((i + 1) / options.length) * 100;
              const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
              return `${colors[i % colors.length]} ${start}%, ${colors[i % colors.length]} ${end}%`;
            }).join(', ')})`
          }}
        >
          <div className="bg-white dark:bg-gray-800 w-32 h-32 rounded-full flex items-center justify-center font-bold text-2xl">
            {winner || '?'}
          </div>
        </div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-purple-900" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {options.map((opt, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-700 rounded p-2 text-center text-sm">
            {opt}
          </div>
        ))}
      </div>

      {!winner && (
        <button
          onClick={spin}
          disabled={spinning}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"
        >
          <Play size={20} />
          {spinning ? 'Girando...' : 'Girar Ruleta'}
        </button>
      )}

      {winner && (
        <div className="bg-purple-100 dark:bg-purple-900/30 rounded p-4 text-center">
          <p className="text-purple-900 dark:text-purple-100 font-bold text-xl">
            🎉 Ganador: {winner}
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/wheel</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { PartyPopper, Trophy, Star, Sparkles } from 'lucide-react';

interface CelebrateCommandProps {
  projectId: string;
  userName: string;
  achievement: string;
  createdBy?: string;
  createdAt?: string;
  messageId?: string; // Si existe, es una celebración persistente
  onClose: () => void;
}

const CELEBRATION_EMOJIS = ['🎉', '🎊', '🏆', '⭐', '🌟', '✨', '👏', '🙌', '💪', '🔥'];
const COLORS = [
  'from-yellow-400 via-orange-400 to-red-500',
  'from-purple-400 via-pink-400 to-red-500',
  'from-blue-400 via-indigo-400 to-purple-500',
  'from-green-400 via-teal-400 to-blue-500',
];

export default function CelebrateCommand({
  projectId,
  userName,
  achievement,
  createdBy,
  createdAt,
  messageId,
  onClose
}: CelebrateCommandProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ emoji: string; left: number; delay: number }>>([]);
  const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  useEffect(() => {
    // Generar emojis flotantes
    const emojis = Array.from({ length: 15 }, () => ({
      emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)],
      left: Math.random() * 100,
      delay: Math.random() * 2
    }));
    setFloatingEmojis(emojis);

    // Detener animación después de 3 segundos
    const timer = setTimeout(() => setIsAnimating(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 p-6 my-2">
      {/* Animated Background */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none">
          {floatingEmojis.map((item, index) => (
            <div
              key={index}
              className="absolute text-2xl animate-float-up"
              style={{
                left: `${item.left}%`,
                animationDelay: `${item.delay}s`,
                animationDuration: '3s'
              }}
            >
              {item.emoji}
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-12 h-12 bg-gradient-to-br ${randomColor} rounded-full flex items-center justify-center animate-bounce`}>
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-xl">¡Celebración! 🎉</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Reconocimiento del equipo</p>
            </div>
          </div>
          {!messageId && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Main Celebration Card */}
        <div className={`bg-gradient-to-br ${randomColor} rounded-xl p-6 text-white text-center mb-4 shadow-xl transform ${isAnimating ? 'scale-105' : 'scale-100'} transition-transform duration-300`}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Star className="animate-spin-slow" size={32} />
            <Sparkles className="animate-pulse" size={32} />
            <Star className="animate-spin-slow" size={32} />
          </div>

          <div className="text-3xl font-bold mb-2">
            {userName}
          </div>

          <div className="text-xl mb-4 opacity-90">
            {achievement}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm opacity-75">
            <PartyPopper size={16} />
            <span>¡Gran trabajo!</span>
            <PartyPopper size={16} />
          </div>
        </div>

        {/* Fun Messages */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">¡Objetivo cumplido!</div>
            </div>
            <div className="p-2">
              <div className="text-2xl mb-1">💎</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Trabajo excepcional</div>
            </div>
            <div className="p-2">
              <div className="text-2xl mb-1">🚀</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">¡Sigue así!</div>
            </div>
          </div>
        </div>

        {/* Celebration History Info */}
        {createdBy && createdAt && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Celebrado por {createdBy} • {new Date(createdAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/celebrate</code>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-20vh) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-float-up {
          animation: float-up 3s ease-out forwards;
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

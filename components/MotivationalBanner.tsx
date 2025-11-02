'use client';

import { useEffect, useState } from 'react';
import { Trophy, Target, Flame, Award, TrendingUp, Star } from 'lucide-react';

interface UserStats {
  points: number;
  currentStreak: number;
  longestStreak: number;
  badges: number;
  rank?: number;
}

interface MotivationalBannerProps {
  userStats?: UserStats;
  compact?: boolean;
}

const motivationalMessages = [
  {
    icon: Trophy,
    iconColor: 'text-yellow-500',
    bgGradient: 'from-yellow-50 to-amber-50',
    borderColor: 'border-yellow-200',
    messages: [
      '¡Sigue así! Cada prioridad completada suma 4 puntos',
      '¡Estás en camino a la cima del leaderboard!',
      'Las prioridades completadas = más puntos para ti',
    ]
  },
  {
    icon: Flame,
    iconColor: 'text-orange-500',
    bgGradient: 'from-orange-50 to-red-50',
    borderColor: 'border-orange-200',
    messages: [
      '5 semanas con 100% completado = Badge de Racha 🔥',
      'Mantén tu racha viva completando todas tus prioridades',
      'Una racha sólida demuestra tu constancia y dedicación',
    ]
  },
  {
    icon: Award,
    iconColor: 'text-purple-500',
    bgGradient: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200',
    messages: [
      '¡Colecciona badges! Comenta, menciona y registra tareas',
      'Cada badge es un logro que te distingue',
      '¿Ya obtuviste tu primer badge? ¡Es muy fácil!',
    ]
  },
  {
    icon: Target,
    iconColor: 'text-green-500',
    bgGradient: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    messages: [
      'Rescata tus prioridades en riesgo para perder menos puntos',
      'Prioridades en riesgo te cuestan -6 puntos por semana',
      'Mantén tus prioridades EN_TIEMPO para maximizar puntos',
    ]
  },
  {
    icon: Star,
    iconColor: 'text-blue-500',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    messages: [
      '¡El ganador del mes recibe un correo de felicitación!',
      'Administradores reconocen tu esfuerzo al final del mes',
      'Compite sanamente y alcanza la cima del leaderboard',
    ]
  },
  {
    icon: TrendingUp,
    iconColor: 'text-teal-500',
    bgGradient: 'from-teal-50 to-cyan-50',
    borderColor: 'border-teal-200',
    messages: [
      'Agrega tareas al checklist para organizarte mejor',
      'Usa comentarios para colaborar con tu equipo',
      'Menciona a otros con @ para obtener tu badge',
    ]
  }
];

export default function MotivationalBanner({ userStats, compact = false }: MotivationalBannerProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Rotar mensajes cada 10 segundos
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % motivationalMessages.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const message = motivationalMessages[currentMessage];
  const Icon = message.icon;
  const randomMessage = message.messages[Math.floor(Math.random() * message.messages.length)];

  // Determinar mensaje personalizado basado en estadísticas del usuario
  let personalizedMessage = randomMessage;

  if (userStats) {
    if (userStats.currentStreak >= 3 && userStats.currentStreak < 5) {
      personalizedMessage = `¡Racha de ${userStats.currentStreak} semanas! Solo ${5 - userStats.currentStreak} más para tu badge 🔥`;
    } else if (userStats.currentStreak >= 5) {
      personalizedMessage = `¡Increíble! Racha de ${userStats.currentStreak} semanas. ¡Sigue así! 🔥`;
    } else if (userStats.points > 0 && userStats.rank && userStats.rank <= 3) {
      personalizedMessage = `¡Estás en el TOP ${userStats.rank}! Mantén tu posición en el leaderboard 🏆`;
    } else if (userStats.badges === 0) {
      personalizedMessage = '¡Obtén tu primer badge! Agrega una tarea, comenta o menciona a alguien';
    } else if (userStats.badges >= 1 && userStats.badges < 4) {
      personalizedMessage = `Tienes ${userStats.badges} badge${userStats.badges > 1 ? 's' : ''}. ¡Colecciona los ${4 - userStats.badges} restantes!`;
    }
  }

  if (compact) {
    return (
      <div className={`bg-gradient-to-r ${message.bgGradient} border ${message.borderColor} rounded-lg p-3 shadow-sm`}>
        <div className="flex items-center space-x-2">
          <Icon className={`${message.iconColor} flex-shrink-0`} size={20} />
          <p className="text-sm text-gray-800 font-medium">{personalizedMessage}</p>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 ml-auto"
            title="Cerrar"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r ${message.bgGradient} border-2 ${message.borderColor} rounded-xl p-4 shadow-md mb-6`}>
      <div className="flex items-start space-x-4">
        <div className={`${message.iconColor} bg-white rounded-full p-3 shadow-sm`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-lg mb-1">💡 Consejo del Sistema</h3>
          <p className="text-gray-700">{personalizedMessage}</p>

          {userStats && (
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <div className="flex items-center space-x-1">
                <Trophy size={14} className="text-yellow-600" />
                <span className="font-semibold">{userStats.points} pts</span>
              </div>
              <div className="flex items-center space-x-1">
                <Flame size={14} className="text-orange-600" />
                <span className="font-semibold">{userStats.currentStreak} semanas</span>
              </div>
              <div className="flex items-center space-x-1">
                <Award size={14} className="text-purple-600" />
                <span className="font-semibold">{userStats.badges} badges</span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 text-xl"
          title="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Indicador de rotación */}
      <div className="flex justify-center mt-3 space-x-1">
        {motivationalMessages.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all ${
              index === currentMessage
                ? 'bg-gray-600 w-6'
                : 'bg-gray-300 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

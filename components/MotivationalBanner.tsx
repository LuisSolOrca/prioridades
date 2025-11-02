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
      '¡Sigue así! Cada prioridad completada suma +4 puntos',
      '¡Estás en camino a la cima del leaderboard!',
      'Completa prioridades y mantén todo bajo control para ganar',
    ]
  },
  {
    icon: Flame,
    iconColor: 'text-orange-500',
    bgGradient: 'from-orange-50 to-red-50',
    borderColor: 'border-orange-200',
    messages: [
      '5 semanas con 100% completado = Badge "Racha de Fuego" 🔥',
      'Mantén tu racha viva completando todas tus prioridades',
      'Evita riesgos y bloqueos para mantener tu racha perfecta',
    ]
  },
  {
    icon: Award,
    iconColor: 'text-purple-500',
    bgGradient: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200',
    messages: [
      '¡24 badges disponibles! Usa todas las funcionalidades de la plataforma',
      'Desbloquea badges con IA, exportaciones, Analytics y Kanban',
      'Cada badge es un logro que demuestra tu dominio de la plataforma',
    ]
  },
  {
    icon: Target,
    iconColor: 'text-green-500',
    bgGradient: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    messages: [
      'Reacciona rápido: Rescata en la misma semana = solo -2 puntos',
      'Prioridades en riesgo/bloqueadas cuestan -6 puntos por semana',
      'Mantén todo EN_TIEMPO para evitar penalizaciones',
    ]
  },
  {
    icon: Star,
    iconColor: 'text-blue-500',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    messages: [
      '¡El ganador del mes recibe reconocimiento oficial!',
      'Gana puntos con prioridades completadas y uso de la plataforma',
      'Compite sanamente y demuestra tu excelencia operativa',
    ]
  },
  {
    icon: TrendingUp,
    iconColor: 'text-teal-500',
    bgGradient: 'from-teal-50 to-cyan-50',
    borderColor: 'border-teal-200',
    messages: [
      'Usa IA para mejorar textos y obtener análisis organizacionales',
      'Exporta a PowerPoint, Excel y PDF para ganar badges',
      'Colabora con comentarios y menciones (@usuario)',
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
      personalizedMessage = `🔥 ¡Racha de ${userStats.currentStreak} semanas! Solo ${5 - userStats.currentStreak} más para "Racha de Fuego"`;
    } else if (userStats.currentStreak >= 5) {
      personalizedMessage = `🔥 ¡Increíble! Racha de ${userStats.currentStreak} semanas perfectas. ¡Eres imparable!`;
    } else if (userStats.points > 0 && userStats.rank && userStats.rank <= 3) {
      personalizedMessage = `🏆 ¡Estás en el TOP ${userStats.rank}! Sigue completando prioridades y usando la plataforma`;
    } else if (userStats.badges === 0) {
      personalizedMessage = '🎯 ¡Comienza tu colección! Completa tu primera prioridad para ganar tu primer badge';
    } else if (userStats.badges >= 1 && userStats.badges < 10) {
      personalizedMessage = `⭐ Tienes ${userStats.badges} badge${userStats.badges > 1 ? 's' : ''}. ¡Hay ${24 - userStats.badges} más para descubrir!`;
    } else if (userStats.badges >= 10 && userStats.badges < 24) {
      personalizedMessage = `🌟 ¡Excelente! ${userStats.badges} badges desbloqueados. ¡Vas camino a Power User!`;
    } else if (userStats.badges === 24) {
      personalizedMessage = `⚡ ¡POWER USER! Has desbloqueado los 24 badges. ¡Eres un maestro de la plataforma!`;
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

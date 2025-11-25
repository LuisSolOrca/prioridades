'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Target, Circle, CheckCircle } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface DotVotingOption {
  text: string;
  dots: { userId: string; count: number }[]; // Array de userId con cantidad de puntos
}

interface DotVotingCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  question: string;
  options: DotVotingOption[];
  totalDotsPerUser: number;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function DotVotingCommand({
  projectId,
  messageId,
  channelId,
  question,
  options: initialOptions,
  totalDotsPerUser,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: DotVotingCommandProps) {
  const { data: session } = useSession();
  const [options, setOptions] = useState(initialOptions);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calcular puntos usados por el usuario
  const getUserDotsUsed = () => {
    if (!session?.user?.id) return 0;
    return options.reduce((sum, opt) => {
      const userDot = opt.dots.find(d => d.userId === session.user.id);
      return sum + (userDot?.count || 0);
    }, 0);
  };

  const userDotsUsed = getUserDotsUsed();
  const userDotsRemaining = totalDotsPerUser - userDotsUsed;

  const handleVote = async (optionIndex: number, dotsToAdd: number) => {
    if (!session?.user?.id || closed || submitting) return;
    if (dotsToAdd < 0 || dotsToAdd > userDotsRemaining) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/dot-voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex, dots: dotsToAdd })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al votar');
        return;
      }

      const data = await response.json();
      setOptions(data.commandData.options);
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error al votar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'dot-voting',
        title: question
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/dot-voting`, {
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
      alert('Error al cerrar votación');
    } finally {
      setSubmitting(false);
    }
  };

  // Calcular totales
  const getTotalDots = (option: DotVotingOption) => {
    return option.dots.reduce((sum, d) => sum + d.count, 0);
  };

  const getUserDots = (option: DotVotingOption) => {
    const userDot = option.dots.find(d => d.userId === session?.user?.id);
    return userDot?.count || 0;
  };

  const totalDotsAllOptions = options.reduce((sum, opt) => sum + getTotalDots(opt), 0);

  const getPercentage = (dots: number) => {
    if (totalDotsAllOptions === 0) return 0;
    return Math.round((dots / totalDotsAllOptions) * 100);
  };

  const winningOption = options.reduce((max, opt) =>
    getTotalDots(opt) > getTotalDots(max) ? opt : max
  , options[0]);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-400 dark:border-blue-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Target className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{question}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Dot Voting • {totalDotsAllOptions} puntos distribuidos •
              {closed ? ' Cerrada' : ` ${totalDotsPerUser} puntos por persona`}
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

      {/* Puntos restantes del usuario */}
      {!closed && session?.user && (
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Tus puntos restantes:
            </span>
            <div className="flex gap-1">
              {Array.from({ length: userDotsRemaining }).map((_, i) => (
                <Circle key={i} className="text-blue-600 dark:text-blue-400" size={12} fill="currentColor" />
              ))}
              <span className="ml-2 font-bold text-blue-800 dark:text-blue-200">
                {userDotsRemaining} / {totalDotsPerUser}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Opciones */}
      <div className="space-y-3 mb-4">
        {options.map((option, index) => {
          const totalDots = getTotalDots(option);
          const userDots = getUserDots(option);
          const percentage = getPercentage(totalDots);
          const isWinning = option === winningOption && totalDotsAllOptions > 0;

          return (
            <div
              key={index}
              className={`rounded-lg overflow-hidden ${
                userDots > 0 ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
              }`}
            >
              <div className="relative bg-white dark:bg-gray-700 p-3">
                {/* Barra de progreso */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ${
                    isWinning
                      ? 'bg-gradient-to-r from-blue-200 to-cyan-200 dark:from-blue-900/50 dark:to-cyan-900/50'
                      : 'bg-gray-100 dark:bg-gray-600'
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>

                {/* Contenido */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {userDots > 0 && (
                        <CheckCircle className="text-blue-600 dark:text-blue-400" size={18} />
                      )}
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {option.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(totalDots, 10) }).map((_, i) => (
                          <Circle key={i} className="text-blue-600 dark:text-blue-400" size={8} fill="currentColor" />
                        ))}
                        {totalDots > 10 && (
                          <span className="text-xs ml-1 text-gray-600 dark:text-gray-400">
                            +{totalDots - 10}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {totalDots}
                      </span>
                      {percentage > 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ({percentage}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones para agregar puntos */}
                  {!closed && userDotsRemaining > 0 && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 5].filter(n => n <= userDotsRemaining).map(num => (
                        <button
                          key={num}
                          onClick={() => handleVote(index, num)}
                          disabled={submitting}
                          className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full transition font-medium"
                        >
                          +{num}
                        </button>
                      ))}
                    </div>
                  )}

                  {userDots > 0 && (
                    <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                      Tu votaste con {userDots} {userDots === 1 ? 'punto' : 'puntos'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Votación cerrada. Ganadora: <strong>{winningOption.text}</strong> con {getTotalDots(winningOption)} puntos
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && totalDotsAllOptions > 0 && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Votación
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/dot-voting</code>
      </div>
    </div>
  );
}

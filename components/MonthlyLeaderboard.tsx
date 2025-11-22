'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award, ChevronDown, ChevronUp } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  totalPoints: number;
  currentStreak: number;
}

interface NextResetInfo {
  nextResetDate: string;
  formattedDate: string;
  formattedTime: string;
}

export default function MonthlyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRestExpanded, setShowRestExpanded] = useState(false);
  const [nextReset, setNextReset] = useState<NextResetInfo | null>(null);

  useEffect(() => {
    loadLeaderboard();
    loadNextResetDate();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/leaderboard');

      if (!response.ok) {
        throw new Error('Error al cargar el leaderboard');
      }

      const data = await response.json();
      // Cargar top 10
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Error al cargar el leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const loadNextResetDate = async () => {
    try {
      const response = await fetch('/api/leaderboard/next-reset');

      if (!response.ok) {
        throw new Error('Error al cargar fecha de reset');
      }

      const data = await response.json();
      setNextReset(data);
    } catch (err: any) {
      console.error('Error loading next reset date:', err);
      // No mostrar error, solo no mostrar la fecha
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="text-yellow-500" size={32} />;
      case 2:
        return <Medal className="text-gray-400" size={28} />;
      case 3:
        return <Award className="text-orange-400" size={28} />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'from-yellow-50 to-amber-50',
          border: 'border-yellow-300',
          text: 'text-yellow-700',
          badgeBg: 'bg-yellow-100',
          badgeText: 'text-yellow-800'
        };
      case 2:
        return {
          bg: 'from-gray-50 to-slate-50',
          border: 'border-gray-300',
          text: 'text-gray-700',
          badgeBg: 'bg-gray-100',
          badgeText: 'text-gray-800'
        };
      case 3:
        return {
          bg: 'from-orange-50 to-amber-50',
          border: 'border-orange-300',
          text: 'text-orange-700',
          badgeBg: 'bg-orange-100',
          badgeText: 'text-orange-800'
        };
      default:
        return {
          bg: 'from-blue-50 to-indigo-50',
          border: 'border-blue-300',
          text: 'text-blue-700',
          badgeBg: 'bg-blue-100',
          badgeText: 'text-blue-800'
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
          <Trophy className="mr-2 text-yellow-500" size={24} />
          🏆 Leaderboard del Mes
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-2xl mb-2">⏳</div>
          <div>Cargando clasificación...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
          <Trophy className="mr-2 text-yellow-500" size={24} />
          🏆 Leaderboard del Mes
        </h2>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center text-red-700 dark:text-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
          <Trophy className="mr-2 text-yellow-500" size={24} />
          🏆 Leaderboard del Mes
        </h2>
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">🎯</div>
          <div className="text-gray-600 dark:text-gray-300 font-medium mb-1">No hay datos del leaderboard aún</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Completa prioridades para ganar puntos y aparecer en la clasificación
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center justify-between">
        <span className="flex items-center">
          <Trophy className="mr-2 text-yellow-500" size={24} />
          🏆 Leaderboard del Mes
        </span>
        <button
          onClick={loadLeaderboard}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          title="Recargar"
        >
          🔄
        </button>
      </h2>

      {/* Next Reset Date Banner */}
      {nextReset && (
        <div className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="text-2xl mr-2">⏰</span>
                <h3 className="font-bold text-purple-900 dark:text-purple-200">
                  Próximo Reseteo del Leaderboard
                </h3>
              </div>
              <p className="text-sm text-purple-800 dark:text-purple-300 ml-9">
                El <strong>{nextReset.formattedDate}</strong> a las <strong>{nextReset.formattedTime}</strong>
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl">🏆</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
            <p className="text-xs text-purple-700 dark:text-purple-300 ml-9">
              Los <strong>top 3</strong> recibirán un correo de felicitación personalizado y todos los usuarios serán notificados de los ganadores
            </p>
          </div>
        </div>
      )}

      {/* Top 3 - Pódium con premios */}
      <div className="space-y-3 mb-4">
        {leaderboard.slice(0, 3).map((entry, index) => {
          const colors = getRankColor(entry.rank);

          return (
            <div
              key={entry.userId}
              className={`bg-gradient-to-r ${colors.bg} border-2 ${colors.border} rounded-lg p-4 transition-all hover:shadow-lg ${
                entry.rank === 1 ? 'scale-105' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {/* Rank Icon */}
                  <div className="flex-shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`font-bold ${colors.text} truncate`}>
                        {entry.name}
                      </h3>
                      <span className={`${colors.badgeBg} ${colors.badgeText} text-xs px-2 py-0.5 rounded-full font-semibold`}>
                        #{entry.rank}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-sm">
                      <div className="flex items-center">
                        <span className="mr-1">🏆</span>
                        <span className={`font-bold ${colors.text}`}>
                          {entry.points} pts
                        </span>
                      </div>
                      {entry.currentStreak > 0 && (
                        <div className="flex items-center">
                          <span className="mr-1">🔥</span>
                          <span className={`text-xs ${colors.text}`}>
                            {entry.currentStreak} semanas
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Points Badge */}
                  <div className={`flex-shrink-0 ${colors.badgeBg} rounded-lg px-4 py-2 text-center`}>
                    <div className={`text-2xl font-bold ${colors.badgeText}`}>
                      {entry.points}
                    </div>
                    <div className={`text-xs ${colors.badgeText}`}>
                      puntos
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress to next rank (only for 2nd and 3rd) */}
              {entry.rank > 1 && index > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Para alcanzar puesto #{entry.rank - 1}</span>
                    <span className="font-semibold">
                      Faltan {leaderboard[index - 1].points - entry.points} pts
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        entry.rank === 2 ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (entry.points / leaderboard[index - 1].points) * 100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rest of leaderboard (4-10) - Colapsable */}
      {leaderboard.length > 3 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={() => setShowRestExpanded(!showRestExpanded)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition mb-3"
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Ver puestos 4-{leaderboard.length} ({leaderboard.length - 3} más)
            </span>
            {showRestExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showRestExpanded && (
            <div className="space-y-2">
              {leaderboard.slice(3).map((entry) => (
                <div
                  key={entry.userId}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:border-gray-300 dark:hover:border-gray-500 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-lg font-bold text-gray-500 dark:text-gray-400 w-8">#{entry.rank}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{entry.name}</h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                          <span>🏆 {entry.points} pts</span>
                          {entry.currentStreak > 0 && (
                            <span>🔥 {entry.currentStreak} semanas</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-700 dark:text-gray-200">{entry.points}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">puntos</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer message */}
      <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <p className="mb-1">
          💡 Completa prioridades para ganar puntos (+4 por prioridad completada)
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Los <strong>top 3</strong> del mes reciben correos de felicitación personalizados 🥇🥈🥉
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  totalPoints: number;
  currentStreak: number;
}

export default function MonthlyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
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
      // Mostrar solo top 3
      setLeaderboard(Array.isArray(data) ? data.slice(0, 3) : []);
    } catch (err: any) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Error al cargar el leaderboard');
    } finally {
      setLoading(false);
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Trophy className="mr-2 text-yellow-500" size={24} />
          🏆 Leaderboard del Mes
        </h2>
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">⏳</div>
          <div>Cargando clasificación...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Trophy className="mr-2 text-yellow-500" size={24} />
          🏆 Leaderboard del Mes
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Trophy className="mr-2 text-yellow-500" size={24} />
          🏆 Leaderboard del Mes
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">🎯</div>
          <div className="text-gray-600 font-medium mb-1">No hay datos del leaderboard aún</div>
          <div className="text-sm text-gray-500">
            Completa prioridades para ganar puntos y aparecer en la clasificación
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-between">
        <span className="flex items-center">
          <Trophy className="mr-2 text-yellow-500" size={24} />
          🏆 Leaderboard del Mes
        </span>
        <button
          onClick={loadLeaderboard}
          className="text-sm text-blue-600 hover:text-blue-800"
          title="Recargar"
        >
          🔄
        </button>
      </h2>

      <div className="space-y-3">
        {leaderboard.map((entry, index) => {
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
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Para alcanzar puesto #{entry.rank - 1}</span>
                    <span className="font-semibold">
                      Faltan {leaderboard[index - 1].points - entry.points} pts
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
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

      {/* Footer message */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <p className="mb-1">
          💡 Completa prioridades para ganar puntos (+4 por prioridad completada)
        </p>
        <p className="text-xs text-gray-500">
          El ganador del mes recibe un correo de felicitación
        </p>
      </div>
    </div>
  );
}

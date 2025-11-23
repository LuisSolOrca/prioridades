'use client';

import { useEffect, useState } from 'react';
import { Users, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
}

interface UserLoad {
  userId: string;
  userName: string;
  totalPriorities: number;
  activePriorities: number;
  completedPriorities: number;
  blockedPriorities: number;
  atRiskPriorities: number;
  avgCompletion: number;
  loadScore: number; // Calculado basado en múltiples factores
}

interface TeamLoadCommandProps {
  projectId: string;
  onClose: () => void;
}

export default function TeamLoadCommand({ projectId, onClose }: TeamLoadCommandProps) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriorities();
  }, [projectId]);

  const loadPriorities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/priorities`);
      if (response.ok) {
        const data = await response.json();
        setPriorities(data.priorities || []);
      }
    } catch (error) {
      console.error('Error loading priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserLoads = (): UserLoad[] => {
    const userMap = new Map<string, UserLoad>();

    priorities.forEach(priority => {
      const userId = priority.userId._id;
      const userName = priority.userId.name;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName,
          totalPriorities: 0,
          activePriorities: 0,
          completedPriorities: 0,
          blockedPriorities: 0,
          atRiskPriorities: 0,
          avgCompletion: 0,
          loadScore: 0
        });
      }

      const userLoad = userMap.get(userId)!;
      userLoad.totalPriorities++;

      if (priority.status === 'COMPLETADO') {
        userLoad.completedPriorities++;
      } else {
        userLoad.activePriorities++;

        if (priority.status === 'BLOQUEADO') {
          userLoad.blockedPriorities++;
        } else if (priority.status === 'EN_RIESGO') {
          userLoad.atRiskPriorities++;
        }
      }
    });

    // Calcular promedios y scores
    const loads = Array.from(userMap.values()).map(userLoad => {
      const userPriorities = priorities.filter(p => p.userId._id === userLoad.userId);
      userLoad.avgCompletion = userPriorities.length > 0
        ? Math.round(userPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / userPriorities.length)
        : 0;

      // Load Score: más alto = más sobrecargado
      // Factores: prioridades activas * peso + bloqueadas * peso + en riesgo * peso - completadas * peso
      userLoad.loadScore =
        (userLoad.activePriorities * 1.0) +
        (userLoad.blockedPriorities * 2.0) +
        (userLoad.atRiskPriorities * 1.5) -
        (userLoad.completedPriorities * 0.5);

      return userLoad;
    });

    return loads.sort((a, b) => b.loadScore - a.loadScore);
  };

  const getLoadLevel = (loadScore: number, maxLoad: number): string => {
    if (maxLoad === 0) return 'low';
    const percentage = (loadScore / maxLoad) * 100;

    if (percentage >= 80) return 'critical';
    if (percentage >= 60) return 'high';
    if (percentage >= 40) return 'medium';
    return 'low';
  };

  const getLoadColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getLoadLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Moderado';
      case 'low': return 'Bajo';
      default: return 'Desconocido';
    }
  };

  const getRebalanceSuggestions = (loads: UserLoad[]): string[] => {
    const suggestions: string[] = [];

    if (loads.length < 2) return suggestions;

    const maxLoad = loads[0];
    const minLoad = loads[loads.length - 1];

    if (maxLoad.loadScore > minLoad.loadScore * 2) {
      suggestions.push(`Considerar reasignar algunas prioridades de ${maxLoad.userName} a ${minLoad.userName}`);
    }

    const overloaded = loads.filter(l => l.activePriorities > 5);
    if (overloaded.length > 0) {
      suggestions.push(`${overloaded.length} usuario(s) tienen más de 5 prioridades activas`);
    }

    const withBlockers = loads.filter(l => l.blockedPriorities > 0);
    if (withBlockers.length > 0) {
      suggestions.push(`Priorizar desbloqueo de ${withBlockers.reduce((sum, l) => sum + l.blockedPriorities, 0)} prioridades bloqueadas`);
    }

    return suggestions;
  };

  const userLoads = calculateUserLoads();
  const maxLoadScore = userLoads.length > 0 ? Math.max(...userLoads.map(l => l.loadScore)) : 0;
  const suggestions = getRebalanceSuggestions(userLoads);
  const avgActivePriorities = userLoads.length > 0
    ? Math.round(userLoads.reduce((sum, l) => sum + l.activePriorities, 0) / userLoads.length)
    : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 my-2">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Analizando carga de trabajo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-teal-300 dark:border-teal-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Carga de Trabajo del Equipo</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Distribución de prioridades por usuario</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Team Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{userLoads.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Miembros</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{avgActivePriorities}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Promedio Activas</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {priorities.filter(p => p.status !== 'COMPLETADO').length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Activas</div>
        </div>
      </div>

      {/* User Loads */}
      {userLoads.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <BarChart3 size={16} />
            Distribución por Usuario
          </h4>
          <div className="space-y-4">
            {userLoads.map((userLoad) => {
              const loadLevel = getLoadLevel(userLoad.loadScore, maxLoadScore);
              const loadPercentage = maxLoadScore > 0 ? (userLoad.loadScore / maxLoadScore) * 100 : 0;

              return (
                <div key={userLoad.userId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-xs">
                        {userLoad.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{userLoad.userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {userLoad.activePriorities} activas • {userLoad.completedPriorities} completadas
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      loadLevel === 'critical'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : loadLevel === 'high'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : loadLevel === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {getLoadLabel(loadLevel)}
                    </span>
                  </div>

                  {/* Load Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${getLoadColor(loadLevel)}`}
                        style={{ width: `${loadPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-gray-500 dark:text-gray-400">Total</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{userLoad.totalPriorities}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 dark:text-gray-400">Bloqueadas</div>
                      <div className={`font-semibold ${
                        userLoad.blockedPriorities > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {userLoad.blockedPriorities}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 dark:text-gray-400">En Riesgo</div>
                      <div className={`font-semibold ${
                        userLoad.atRiskPriorities > 0
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {userLoad.atRiskPriorities}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 dark:text-gray-400">% Progreso</div>
                      <div className="font-semibold text-teal-600 dark:text-teal-400">{userLoad.avgCompletion}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rebalance Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            Sugerencias de Rebalanceo
          </h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-4 list-disc">
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {userLoads.length === 0 && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">No hay datos de carga de trabajo disponibles</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/team-load</code>
      </div>
    </div>
  );
}

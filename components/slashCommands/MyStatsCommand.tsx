'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Target, TrendingUp, CheckCircle2, Clock, AlertCircle, X, BarChart3 } from 'lucide-react';

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
  weekStart: string;
  weekEnd: string;
  userId: {
    _id: string;
    name: string;
  };
  initiativeId?: {
    _id: string;
    name: string;
    color: string;
  };
}

interface MyStatsCommandProps {
  projectId: string;
  onClose: () => void;
}

export default function MyStatsCommand({ projectId, onClose }: MyStatsCommandProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    blocked: 0,
    atRisk: 0,
    completionRate: 0,
    avgProgress: 0
  });

  useEffect(() => {
    loadMyStats();
  }, [projectId]);

  const loadMyStats = async () => {
    try {
      setLoading(true);

      // Debug logging
      console.log('[MyStats] projectId:', projectId);
      console.log('[MyStats] userId:', session?.user.id);

      // Obtener todas las prioridades del usuario en este proyecto
      const url = `/api/priorities?projectId=${projectId}&userId=${session?.user.id}`;
      console.log('[MyStats] Fetching:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const data = await response.json();
      console.log('[MyStats] Response data:', data);

      // API returns array directly, not wrapped in object
      const myPriorities = Array.isArray(data) ? data : [];
      console.log('[MyStats] My priorities count:', myPriorities.length);

      setPriorities(myPriorities);

      // Calcular estadísticas
      const total = myPriorities.length;
      const completed = myPriorities.filter((p: Priority) => p.status === 'COMPLETADO').length;
      const inProgress = myPriorities.filter((p: Priority) => p.status === 'EN_TIEMPO').length;
      const blocked = myPriorities.filter((p: Priority) => p.status === 'BLOQUEADO').length;
      const atRisk = myPriorities.filter((p: Priority) => p.status === 'EN_RIESGO').length;

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const avgProgress = total > 0
        ? Math.round(myPriorities.reduce((sum: number, p: Priority) => sum + p.completionPercentage, 0) / total)
        : 0;

      setStats({
        total,
        completed,
        inProgress,
        blocked,
        atRisk,
        completionRate,
        avgProgress
      });
    } catch (err) {
      console.error('Error loading my stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EN_TIEMPO':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'EN_RIESGO':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'BLOQUEADO':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'COMPLETADO':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'EN_TIEMPO':
        return 'En Tiempo';
      case 'EN_RIESGO':
        return 'En Riesgo';
      case 'BLOQUEADO':
        return 'Bloqueado';
      case 'COMPLETADO':
        return 'Completado';
      default:
        return status;
    }
  };

  // Obtener prioridades de las últimas 4 semanas
  const recentPriorities = priorities
    .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
    .slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <BarChart3 className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
              Mis Estadísticas
              <User className="text-indigo-600 dark:text-indigo-400" size={16} />
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Progreso personal en {session?.user?.name}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center">
          <BarChart3 className="animate-pulse mx-auto mb-3 text-indigo-600" size={48} />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Cargando tus estadísticas...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumen de Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center">
              <Target className="mx-auto mb-2 text-indigo-600 dark:text-indigo-400" size={24} />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Prioridades</div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 text-green-600 dark:text-green-400" size={24} />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.completed}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Completadas</div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center">
              <TrendingUp className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={24} />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.completionRate}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Tasa Completado</div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center">
              <Clock className="mx-auto mb-2 text-purple-600 dark:text-purple-400" size={24} />
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avgProgress}%</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Progreso Promedio</div>
            </div>
          </div>

          {/* Estado de Prioridades */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
              Distribución por Estado
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <span className="text-sm text-gray-700 dark:text-gray-300">En Tiempo</span>
                <span className="font-bold text-green-700 dark:text-green-300">{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <span className="text-sm text-gray-700 dark:text-gray-300">En Riesgo</span>
                <span className="font-bold text-yellow-700 dark:text-yellow-300">{stats.atRisk}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <span className="text-sm text-gray-700 dark:text-gray-300">Bloqueadas</span>
                <span className="font-bold text-red-700 dark:text-red-300">{stats.blocked}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <span className="text-sm text-gray-700 dark:text-gray-300">Completadas</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{stats.completed}</span>
              </div>
            </div>
          </div>

          {/* Prioridades Recientes */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Prioridades Recientes
            </h4>
            {recentPriorities.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No tienes prioridades en este proyecto
              </p>
            ) : (
              <div className="space-y-2">
                {recentPriorities.map((priority) => (
                  <div
                    key={priority._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {priority.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(priority.status)}`}>
                          {getStatusLabel(priority.status)}
                        </span>
                        {priority.initiativeId && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${priority.initiativeId.color}20`,
                              color: priority.initiativeId.color
                            }}
                          >
                            {priority.initiativeId.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {priority.completionPercentage}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Progreso
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consejo */}
          {stats.total > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <p className="text-sm text-indigo-800 dark:text-indigo-200">
                {stats.blocked > 0 ? (
                  <>💡 <strong>Atención:</strong> Tienes {stats.blocked} prioridad{stats.blocked > 1 ? 'es' : ''} bloqueada{stats.blocked > 1 ? 's' : ''}. Considera pedir ayuda al equipo.</>
                ) : stats.atRisk > 0 ? (
                  <>⚠️ <strong>Ojo:</strong> Tienes {stats.atRisk} prioridad{stats.atRisk > 1 ? 'es' : ''} en riesgo. ¡Enfócate en ellas esta semana!</>
                ) : stats.completionRate >= 75 ? (
                  <>🎉 <strong>¡Excelente trabajo!</strong> Tienes una tasa de completado del {stats.completionRate}%. ¡Sigue así!</>
                ) : (
                  <>📊 <strong>Progreso estable:</strong> Mantén el enfoque en tus prioridades actuales.</>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/my-stats</code>
      </div>
    </div>
  );
}

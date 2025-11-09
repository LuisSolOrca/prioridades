'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  status: string;
  userId: User;
  initiativeIds?: Initiative[];
  createdAt?: string;
  updatedAt?: string;
}

interface Comment {
  _id: string;
  text: string;
  createdAt: string;
  userId: User;
  priorityId: {
    _id: string;
    title: string;
  };
}

interface Stats {
  pending: {
    count: number;
    priorities: Priority[];
  };
  recentlyRescheduled: {
    count: number;
    priorities: Priority[];
  };
  recentlyCarriedOver: {
    count: number;
    priorities: Priority[];
  };
  recentActivity: {
    count: number;
    comments: Comment[];
  };
  totalRescheduled: number;
  totalCarriedOver: number;
}

interface ExecutionResult {
  message: string;
  stats: {
    success: number;
    failed: number;
  };
  nextWeek: {
    monday: string;
    friday: string;
  };
  results: Array<{
    originalId: string;
    newId?: string;
    title: string;
    userId: string;
    status: string;
    error?: string;
  }>;
}

export default function AdminAutoReschedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'rescheduled' | 'carriedover' | 'activity'>('pending');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      if ((session.user as any).role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadStats();
    }
  }, [status, session, router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/priorities/auto-reschedule/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteNow = async () => {
    if (!confirm('¿Estás seguro de que deseas ejecutar la auto-reprogramación ahora? Esto reprogramará todas las prioridades vencidas en estado EN_TIEMPO.')) {
      return;
    }

    try {
      setExecuting(true);
      setExecutionResult(null);

      const res = await fetch('/api/priorities/auto-reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error al ejecutar auto-reprogramación');
      }

      setExecutionResult(result);

      // Reload stats after execution
      await loadStats();

      alert(`Auto-reprogramación completada:\n${result.stats.success} exitosas\n${result.stats.failed} fallidas`);
    } catch (error: any) {
      console.error('Error executing auto-reschedule:', error);
      alert('Error al ejecutar auto-reprogramación: ' + error.message);
    } finally {
      setExecuting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session || !stats) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                🔄 Auto-Reprogramación de Prioridades
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Gestiona y monitorea la reprogramación automática de prioridades vencidas
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/users')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              ← Volver a Admin
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pendientes</div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.pending.count}
                </div>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 w-14 h-14 rounded-full flex items-center justify-center text-2xl">
                ⏰
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Vencidas en EN_TIEMPO
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reprogramadas (7d)</div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.recentlyRescheduled.count}
                </div>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 w-14 h-14 rounded-full flex items-center justify-center text-2xl">
                📋
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Últimos 7 días
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Traídas (7d)</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.recentlyCarriedOver.count}
                </div>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-14 h-14 rounded-full flex items-center justify-center text-2xl">
                🔄
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Copias creadas
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Histórico</div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.totalRescheduled}
                </div>
              </div>
              <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 w-14 h-14 rounded-full flex items-center justify-center text-2xl">
                📊
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Todas las reprogramadas
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Ejecutar Reprogramación Manual
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Ejecuta la auto-reprogramación inmediatamente. Esto reprogramará {stats.pending.count} prioridad(es) vencida(s) en estado EN_TIEMPO.
              </p>
            </div>
            <button
              onClick={handleExecuteNow}
              disabled={executing || stats.pending.count === 0}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                executing || stats.pending.count === 0
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {executing ? '⏳ Ejecutando...' : '▶️ Ejecutar Ahora'}
            </button>
          </div>
        </div>

        {/* Execution Result */}
        {executionResult && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-3">
              ✅ Ejecución Completada
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-green-700 dark:text-green-400">Exitosas</div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                  {executionResult.stats.success}
                </div>
              </div>
              <div>
                <div className="text-sm text-red-700 dark:text-red-400">Fallidas</div>
                <div className="text-2xl font-bold text-red-800 dark:text-red-300">
                  {executionResult.stats.failed}
                </div>
              </div>
            </div>
            <div className="text-sm text-green-700 dark:text-green-400 mb-2">
              Próxima semana: {new Date(executionResult.nextWeek.monday).toLocaleDateString('es-MX')} - {new Date(executionResult.nextWeek.friday).toLocaleDateString('es-MX')}
            </div>

            {/* Results Details */}
            {executionResult.results.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Detalles:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {executionResult.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.status === 'success'
                          ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {result.status === 'success' ? '✅' : '❌'} {result.title}
                          </div>
                          {result.status === 'success' && result.newId && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Original: {result.originalId} → Nueva: {result.newId}
                            </div>
                          )}
                          {result.error && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              Error: {result.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'pending'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              ⏰ Pendientes ({stats.pending.count})
            </button>
            <button
              onClick={() => setActiveTab('rescheduled')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'rescheduled'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              📋 Reprogramadas ({stats.recentlyRescheduled.count})
            </button>
            <button
              onClick={() => setActiveTab('carriedover')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'carriedover'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              🔄 Traídas ({stats.recentlyCarriedOver.count})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'activity'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              📝 Actividad ({stats.recentActivity.count})
            </button>
          </div>

          <div className="p-6">
            {/* Pending Tab */}
            {activeTab === 'pending' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                  Prioridades Pendientes de Reprogramar
                </h3>
                {stats.pending.priorities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎉</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      No hay prioridades pendientes de reprogramar
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.pending.priorities.map((priority) => (
                      <div
                        key={priority._id}
                        className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {priority.title}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Usuario: {priority.userId.name} ({priority.userId.email})
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Semana vencida: {new Date(priority.weekStart).toLocaleDateString('es-MX')} - {new Date(priority.weekEnd).toLocaleDateString('es-MX')}
                            </div>
                            {priority.initiativeIds && priority.initiativeIds.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {priority.initiativeIds.map((init) => (
                                  <span
                                    key={init._id}
                                    className="text-xs px-2 py-1 rounded"
                                    style={{ backgroundColor: init.color + '20', color: init.color }}
                                  >
                                    {init.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {priority.completionPercentage}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Avance</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rescheduled Tab */}
            {activeTab === 'rescheduled' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                  Prioridades Reprogramadas (Últimos 7 días)
                </h3>
                {stats.recentlyRescheduled.priorities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      No hay prioridades reprogramadas en los últimos 7 días
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.recentlyRescheduled.priorities.map((priority) => (
                      <div
                        key={priority._id}
                        className="border dark:border-gray-700 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-gray-800 dark:text-gray-200">
                                {priority.title}
                              </div>
                              <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs px-2 py-1 rounded">
                                REPROGRAMADO
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Usuario: {priority.userId.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Reprogramada: {new Date(priority.updatedAt!).toLocaleString('es-MX')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Carried Over Tab */}
            {activeTab === 'carriedover' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                  Prioridades Traídas (Últimos 7 días)
                </h3>
                {stats.recentlyCarriedOver.priorities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔄</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      No hay prioridades traídas en los últimos 7 días
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.recentlyCarriedOver.priorities.map((priority) => (
                      <div
                        key={priority._id}
                        className="border dark:border-gray-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-gray-800 dark:text-gray-200">
                                {priority.title}
                              </div>
                              <span className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs px-2 py-1 rounded flex items-center gap-1">
                                🔄 Traída
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Usuario: {priority.userId.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Creada: {new Date(priority.createdAt!).toLocaleString('es-MX')}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Semana actual: {new Date(priority.weekStart).toLocaleDateString('es-MX')} - {new Date(priority.weekEnd).toLocaleDateString('es-MX')}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {priority.completionPercentage}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Avance</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
                  Actividad Reciente de Auto-Reprogramación
                </h3>
                {stats.recentActivity.comments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📝</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      No hay actividad reciente
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.recentActivity.comments.map((comment) => (
                      <div
                        key={comment._id}
                        className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">🤖</div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {comment.priorityId.title}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {comment.text}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {new Date(comment.createdAt).toLocaleString('es-MX')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

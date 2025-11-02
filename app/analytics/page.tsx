'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { exportUserStats, exportInitiativeStats } from '@/lib/exportToExcel';
import { trackFeature } from '@/lib/trackFeature';

interface User {
  _id: string;
  name: string;
  role: string;
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
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  completionPercentage: number;
  userId: string;
  initiativeId?: string; // Mantener para compatibilidad
  initiativeIds?: string[]; // Nuevo campo para múltiples iniciativas
  weekStart: string;
  weekEnd: string;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [allPriorities, setAllPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInitiative, setExpandedInitiative] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedUserInTable, setExpandedUserInTable] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userGamification, setUserGamification] = useState<{ [userId: string]: any }>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadData();
      // Trackear visita a Analytics
      trackFeature('analyticsVisits').catch(err =>
        console.error('Error tracking analytics visit:', err)
      );
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      const [usersRes, initiativesRes, prioritiesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/initiatives'),
        fetch('/api/priorities?forDashboard=true')
      ]);

      const [usersData, initiativesData, prioritiesData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        prioritiesRes.json()
      ]);

      setUsers(usersData); // Mostrar todos los usuarios (USER y ADMIN)
      setInitiatives(initiativesData);
      setAllPriorities(prioritiesData);

      // Cargar puntos del mes actual calculados dinámicamente
      try {
        const monthPointsRes = await fetch('/api/analytics/month-points');
        const monthPointsData = await monthPointsRes.json();

        const gamificationData: { [userId: string]: any } = {};
        for (const user of usersData) {
          gamificationData[user._id] = {
            currentMonthPoints: monthPointsData[user._id] || 0
          };
        }
        setUserGamification(gamificationData);
      } catch (err) {
        console.error('Error loading month points:', err);
        const gamificationData: { [userId: string]: any } = {};
        for (const user of usersData) {
          gamificationData[user._id] = {
            currentMonthPoints: 0
          };
        }
        setUserGamification(gamificationData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar prioridades por rango de fechas
  const priorities = allPriorities.filter(priority => {
    if (!dateFrom && !dateTo) return true;

    const priorityStart = new Date(priority.weekStart);
    const priorityEnd = new Date(priority.weekEnd);

    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return (priorityStart >= from && priorityStart <= to) ||
             (priorityEnd >= from && priorityEnd <= to) ||
             (priorityStart <= from && priorityEnd >= to);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      return priorityEnd >= from;
    }

    if (dateTo) {
      const to = new Date(dateTo);
      return priorityStart <= to;
    }

    return true;
  });

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const userStats = users.map(user => {
    const userPriorities = priorities.filter(p => p.userId === user._id);
    const completed = userPriorities.filter(p => p.status === 'COMPLETADO' || p.status === 'REPROGRAMADO').length;
    const avgCompletion = userPriorities.length > 0
      ? userPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / userPriorities.length
      : 0;

    return {
      user,
      total: userPriorities.length,
      completed,
      completionRate: userPriorities.length > 0 ? (completed / userPriorities.length * 100).toFixed(1) : 0,
      avgCompletion: avgCompletion.toFixed(1)
    };
  });

  const initiativeStats = initiatives.map(initiative => {
    // Filtrar prioridades que incluyen esta iniciativa (compatibilidad con initiativeId e initiativeIds)
    const initiativePriorities = priorities.filter(p => {
      const priorityInitiativeIds = p.initiativeIds || (p.initiativeId ? [p.initiativeId] : []);
      return priorityInitiativeIds.includes(initiative._id);
    });
    return {
      initiative,
      count: initiativePriorities.length,
      percentage: priorities.length > 0 ? (initiativePriorities.length / priorities.length * 100).toFixed(1) : 0
    };
  }).sort((a, b) => b.count - a.count);

  const handleExportUserStats = () => {
    exportUserStats(userStats, 'Analitica_Usuarios');
  };

  const handleExportInitiativeStats = () => {
    exportInitiativeStats(initiativeStats, 'Analitica_Iniciativas');
  };

  const toggleInitiativeDrillDown = (initiativeId: string) => {
    if (expandedInitiative === initiativeId) {
      setExpandedInitiative(null);
      setExpandedUser(null);
    } else {
      setExpandedInitiative(initiativeId);
      setExpandedUser(null);
    }
  };

  const toggleUserDrillDown = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const getUserPrioritiesForInitiative = (userId: string, initiativeId: string) => {
    return priorities.filter(p => {
      if (p.userId !== userId) return false;
      const priorityInitiativeIds = p.initiativeIds || (p.initiativeId ? [p.initiativeId] : []);
      return priorityInitiativeIds.includes(initiativeId);
    });
  };

  const getInitiativeStatsForUser = (userId: string) => {
    return initiatives.map(initiative => {
      const userInitiativePriorities = priorities.filter(p => {
        if (p.userId !== userId) return false;
        const priorityInitiativeIds = p.initiativeIds || (p.initiativeId ? [p.initiativeId] : []);
        return priorityInitiativeIds.includes(initiative._id);
      });

      const completed = userInitiativePriorities.filter(p => p.status === 'COMPLETADO' || p.status === 'REPROGRAMADO').length;
      const avgCompletion = userInitiativePriorities.length > 0
        ? userInitiativePriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / userInitiativePriorities.length
        : 0;

      return {
        initiative,
        total: userInitiativePriorities.length,
        completed,
        completionRate: userInitiativePriorities.length > 0
          ? (completed / userInitiativePriorities.length * 100).toFixed(1)
          : 0,
        avgCompletion: avgCompletion.toFixed(1)
      };
    }).filter(stat => stat.total > 0)
      .sort((a, b) => b.total - a.total);
  };

  const toggleUserInTable = (userId: string) => {
    setExpandedUserInTable(expandedUserInTable === userId ? null : userId);
  };

  const getUserStatsForInitiative = (initiativeId: string) => {
    return users.map(user => {
      // Filtrar prioridades del usuario que incluyen esta iniciativa (compatibilidad con initiativeId e initiativeIds)
      const userInitiativePriorities = priorities.filter(p => {
        if (p.userId !== user._id) return false;
        const priorityInitiativeIds = p.initiativeIds || (p.initiativeId ? [p.initiativeId] : []);
        return priorityInitiativeIds.includes(initiativeId);
      });
      const completed = userInitiativePriorities.filter(p => p.status === 'COMPLETADO' || p.status === 'REPROGRAMADO').length;
      const avgCompletion = userInitiativePriorities.length > 0
        ? userInitiativePriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / userInitiativePriorities.length
        : 0;

      return {
        user,
        total: userInitiativePriorities.length,
        completed,
        completionRate: userInitiativePriorities.length > 0
          ? (completed / userInitiativePriorities.length * 100).toFixed(1)
          : 0,
        avgCompletion: avgCompletion.toFixed(1)
      };
    }).filter(stat => stat.total > 0)
      .sort((a, b) => b.total - a.total);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-800">
            📊 Analítica y Métricas
          </h1>

          {/* Filtros de Rango de Tiempo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🗓️ Filtros de Tiempo</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <button
                  onClick={handleClearFilters}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  🔄 Limpiar Filtros
                </button>
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📊 Mostrando datos filtrados:
                  {dateFrom && ` desde ${new Date(dateFrom).toLocaleDateString('es-MX')}`}
                  {dateFrom && dateTo && ' '}
                  {dateTo && ` hasta ${new Date(dateTo).toLocaleDateString('es-MX')}`}
                  {' '}• {priorities.length} prioridades
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Rendimiento por Usuario</h2>
              <button
                onClick={handleExportUserStats}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                title="Exportar a Excel"
              >
                📥 Exportar a Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Usuario</th>
                    <th className="text-center py-3 px-4">Total Prioridades</th>
                    <th className="text-center py-3 px-4">Completadas</th>
                    <th className="text-center py-3 px-4">Tasa Completado</th>
                    <th className="text-center py-3 px-4">% Promedio Avance</th>
                    <th className="text-center py-3 px-4">🏆 Puntos del Mes</th>
                    <th className="text-center py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.map(stat => {
                    const isExpanded = expandedUserInTable === stat.user._id;
                    const initiativeStats = isExpanded ? getInitiativeStatsForUser(stat.user._id) : [];

                    return (
                      <React.Fragment key={stat.user._id}>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">
                                {stat.user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              {stat.user.name}
                            </div>
                          </td>
                          <td className="text-center py-3 px-4 font-semibold">{stat.total}</td>
                          <td className="text-center py-3 px-4">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {stat.completed}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="font-bold text-blue-600">{stat.completionRate}%</span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <div className="flex items-center justify-center">
                              <div className="w-24 bg-gray-200 rounded-full h-3 mr-2">
                                <div
                                  className="bg-blue-600 h-3 rounded-full"
                                  style={{ width: `${stat.avgCompletion}%` }}
                                ></div>
                              </div>
                              <span className="font-semibold">{stat.avgCompletion}%</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4">
                            <div className="inline-flex items-center bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg px-3 py-2">
                              <span className="text-yellow-600 mr-1">🏆</span>
                              <span className="font-bold text-yellow-700">
                                {userGamification[stat.user._id]?.currentMonthPoints || 0}
                              </span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4">
                            <button
                              onClick={() => toggleUserInTable(stat.user._id)}
                              className="text-blue-600 hover:text-blue-800 transition text-xl"
                              title="Ver desglose por iniciativa"
                            >
                              {isExpanded ? '🔽' : '🔍'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && initiativeStats.length > 0 && (
                          <tr>
                            <td colSpan={7} className="bg-gray-50 p-4 border-b">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                📊 Desglose por Iniciativa Estratégica
                              </h4>
                              <div className="space-y-2">
                                {initiativeStats.map(initStat => (
                                  <div
                                    key={initStat.initiative._id}
                                    className="bg-white border border-gray-200 rounded-lg p-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center flex-1">
                                        <div
                                          className="w-3 h-3 rounded-full mr-3"
                                          style={{ backgroundColor: initStat.initiative.color }}
                                        ></div>
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-800 text-sm">
                                            {initStat.initiative.name}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {initStat.total} prioridades • {initStat.completed} completadas
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                          <div className="text-xs text-gray-600">Tasa Completado</div>
                                          <div className="font-bold text-blue-600 text-sm">
                                            {initStat.completionRate}%
                                          </div>
                                        </div>
                                        <div className="flex items-center">
                                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                                            <div
                                              className="h-2 rounded-full"
                                              style={{
                                                width: `${initStat.avgCompletion}%`,
                                                backgroundColor: initStat.initiative.color
                                              }}
                                            ></div>
                                          </div>
                                          <span className="text-xs font-semibold text-gray-700">
                                            {initStat.avgCompletion}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Distribución por Iniciativa Estratégica</h2>
              <button
                onClick={handleExportInitiativeStats}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                title="Exportar a Excel"
              >
                📥 Exportar a Excel
              </button>
            </div>
            <div className="space-y-4">
              {initiativeStats.map(stat => {
                const isExpanded = expandedInitiative === stat.initiative._id;
                const userStats = isExpanded ? getUserStatsForInitiative(stat.initiative._id) : [];

                return (
                  <div key={stat.initiative._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleInitiativeDrillDown(stat.initiative._id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center flex-1">
                          <div
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: stat.initiative.color }}
                          ></div>
                          <span className="font-medium text-gray-800">{stat.initiative.name}</span>
                          <span className="ml-2 text-sm text-gray-500">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">{stat.count} prioridades</span>
                          <span className="font-bold text-gray-800">{stat.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${stat.percentage}%`,
                            backgroundColor: stat.initiative.color
                          }}
                        ></div>
                      </div>
                    </div>

                    {isExpanded && userStats.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          📊 Desglose por Usuario
                        </h4>
                        <div className="space-y-3">
                          {userStats.map(userStat => {
                            const isUserExpanded = expandedUser === userStat.user._id;
                            const userPriorities = isUserExpanded ? getUserPrioritiesForInitiative(userStat.user._id, stat.initiative._id) : [];

                            return (
                              <div key={userStat.user._id}>
                                <div
                                  className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                                  onClick={() => toggleUserDrillDown(userStat.user._id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center flex-1">
                                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                                        {userStat.user.name.split(' ').map(n => n[0]).join('')}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-800 text-sm flex items-center">
                                          {userStat.user.name}
                                          <span className="ml-2 text-xs text-gray-500">
                                            {isUserExpanded ? '▼' : '▶'}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {userStat.total} prioridades • {userStat.completed} completadas
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <div className="text-right">
                                        <div className="text-xs text-gray-600">Tasa Completado</div>
                                        <div className="font-bold text-blue-600 text-sm">
                                          {userStat.completionRate}%
                                        </div>
                                      </div>
                                      <div className="flex items-center">
                                        <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                                          <div
                                            className="h-2 rounded-full"
                                            style={{
                                              width: `${userStat.avgCompletion}%`,
                                              backgroundColor: stat.initiative.color
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700">
                                          {userStat.avgCompletion}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Tercer nivel: Prioridades del usuario */}
                                {isUserExpanded && userPriorities.length > 0 && (
                                  <div className="mt-2 ml-11 space-y-2">
                                    {userPriorities.map(priority => (
                                      <div
                                        key={priority._id}
                                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <h5 className="font-semibold text-gray-800 text-sm mb-1">
                                              {priority.title}
                                            </h5>
                                            {priority.description && (
                                              <p className="text-xs text-gray-600 line-clamp-2">
                                                {priority.description}
                                              </p>
                                            )}
                                          </div>
                                          <StatusBadge status={priority.status} />
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                          <div className="text-gray-500">
                                            {new Date(priority.weekStart).toLocaleDateString('es-MX')} - {new Date(priority.weekEnd).toLocaleDateString('es-MX')}
                                          </div>
                                          <div className="flex items-center">
                                            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                              <div
                                                className="h-2 rounded-full"
                                                style={{
                                                  width: `${priority.completionPercentage}%`,
                                                  backgroundColor: stat.initiative.color
                                                }}
                                              ></div>
                                            </div>
                                            <span className="font-semibold text-gray-700">
                                              {priority.completionPercentage}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

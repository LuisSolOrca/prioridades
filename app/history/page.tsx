'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { getWeekLabel } from '@/lib/utils';
import { exportPriorities } from '@/lib/exportToExcel';

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
  weekStart: string;
  completionPercentage: number;
  status: string;
  userId: string;
  initiativeId: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedInitiative, setSelectedInitiative] = useState('all');
  const [includeAdmins, setIncludeAdmins] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      const [usersRes, initiativesRes, prioritiesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/initiatives'),
        fetch('/api/priorities')
      ]);

      const [usersData, initiativesData, prioritiesData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        prioritiesRes.json()
      ]);

      setUsers(usersData);
      setInitiatives(initiativesData);
      setPriorities(prioritiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPriorities = useMemo(() => {
    let filtered = priorities;

    // Filtro por usuario
    if (selectedUser !== 'all') {
      filtered = filtered.filter(p => p.userId === selectedUser);
    }

    // Filtro por rol de usuario (incluir/excluir admins)
    if (!includeAdmins) {
      const userIds = users.filter(u => u.role === 'USER').map(u => u._id);
      filtered = filtered.filter(p => userIds.includes(p.userId));
    }

    // Filtro por iniciativa
    if (selectedInitiative !== 'all') {
      filtered = filtered.filter(p => p.initiativeId === selectedInitiative);
    }

    // Filtro por rango de fechas
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(p => new Date(p.weekStart) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Incluir todo el día
      filtered = filtered.filter(p => new Date(p.weekStart) <= toDate);
    }

    // Filtro por keywords
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  }, [priorities, selectedUser, selectedInitiative, includeAdmins, dateFrom, dateTo, searchKeyword, users]);

  const weekGroups = useMemo(() => {
    const groups: { [key: string]: Priority[] } = {};
    filteredPriorities.forEach(priority => {
      const weekKey = new Date(priority.weekStart).toISOString().split('T')[0];
      if (!groups[weekKey]) {
        groups[weekKey] = [];
      }
      groups[weekKey].push(priority);
    });

    return Object.entries(groups)
      .map(([weekStart, priorities]) => ({
        weekStart: new Date(weekStart),
        priorities
      }))
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  }, [filteredPriorities]);

  const handleExport = () => {
    exportPriorities(filteredPriorities as any, users as any, initiatives as any, 'Historico_Prioridades');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              📅 Histórico de Prioridades
            </h1>
            <button
              onClick={handleExport}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
              title="Exportar a Excel"
            >
              📥 Exportar a Excel
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={includeAdmins}
                  onChange={(e) => setIncludeAdmins(e.target.checked)}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Incluir prioridades de administradores
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Usuario
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="all">Todos los usuarios</option>
                  {users
                    .filter(u => includeAdmins || u.role === 'USER')
                    .map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} {user.role === 'ADMIN' ? '(Admin)' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Iniciativa
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedInitiative}
                  onChange={(e) => setSelectedInitiative(e.target.value)}
                >
                  <option value="all">Todas las iniciativas</option>
                  {initiatives.map(initiative => (
                    <option key={initiative._id} value={initiative._id}>{initiative.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar por palabras clave
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Buscar en títulos..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha desde
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{filteredPriorities.length}</span> prioridades encontradas
              </div>
              <button
                onClick={() => {
                  setSelectedUser('all');
                  setSelectedInitiative('all');
                  setIncludeAdmins(true);
                  setDateFrom('');
                  setDateTo('');
                  setSearchKeyword('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                🔄 Limpiar todos los filtros
              </button>
            </div>

            <div className="space-y-6">
              {weekGroups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <p className="text-gray-500">No hay datos históricos con los filtros seleccionados</p>
                </div>
              ) : (
                weekGroups.map(week => {
                  const weekStats = {
                    total: week.priorities.length,
                    completed: week.priorities.filter(p => p.status === 'COMPLETADO').length,
                    avgCompletion: week.priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / week.priorities.length
                  };

                  return (
                    <div key={week.weekStart.toISOString()} className="border-l-4 border-blue-500 pl-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            {getWeekLabel(week.weekStart)}
                          </h3>
                          <div className="text-sm text-gray-600">
                            {weekStats.total} prioridades - {weekStats.completed} completadas -
                            Promedio: {weekStats.avgCompletion.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {week.priorities.map(priority => {
                          const user = users.find(u => u._id === priority.userId);
                          const initiative = initiatives.find(i => i._id === priority.initiativeId);
                          return (
                            <div key={priority._id} className="bg-gray-50 rounded-lg p-4 border" style={{ borderLeftColor: initiative?.color, borderLeftWidth: '3px' }}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800 text-sm">{priority.title}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {user?.name} • {initiative?.name}
                                  </div>
                                </div>
                                <StatusBadge status={priority.status as any} />
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${priority.completionPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="font-bold text-gray-700">{priority.completionPercentage}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

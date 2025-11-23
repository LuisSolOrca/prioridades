'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import PermissionGuard from '@/components/PermissionGuard';
import { exportUserStats, exportInitiativeStats, exportAreaStats } from '@/lib/exportToExcel';
import { trackFeature } from '@/lib/trackFeature';

interface User {
  _id: string;
  name: string;
  role: string;
  area?: string;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface Client {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  type?: 'ESTRATEGICA' | 'OPERATIVA';
  completionPercentage: number;
  userId: string;
  initiativeId?: string; // Mantener para compatibilidad
  initiativeIds?: string[]; // Nuevo campo para múltiples iniciativas
  clientId?: string;
  projectId?: string;
  weekStart: string;
  weekEnd: string;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allPriorities, setAllPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInitiative, setExpandedInitiative] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedUserInTable, setExpandedUserInTable] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedInitiative, setSelectedInitiative] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [includeAdmins, setIncludeAdmins] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priorityTypeFilter, setPriorityTypeFilter] = useState<'TODAS' | 'ESTRATEGICA' | 'OPERATIVA'>('TODAS');
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
      const [usersRes, initiativesRes, clientsRes, projectsRes, prioritiesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/initiatives'),
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/projects'),
        fetch('/api/priorities?forDashboard=true')
      ]);

      const [usersData, initiativesData, clientsData, projectsData, prioritiesData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        clientsRes.json(),
        projectsRes.json(),
        prioritiesRes.json()
      ]);

      setUsers(usersData); // Mostrar todos los usuarios (USER y ADMIN)
      setInitiatives(initiativesData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
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

  // Filtrar prioridades por todos los criterios
  const priorities = allPriorities.filter(priority => {
    // Filtro por usuario
    if (selectedUser !== 'all') {
      if (priority.userId !== selectedUser) return false;
    }

    // Filtro por rol de usuario (incluir/excluir admins)
    if (!includeAdmins) {
      const user = users.find(u => u._id === priority.userId);
      if (user && user.role === 'ADMIN') return false;
    }

    // Filtro por área
    if (selectedArea !== 'all') {
      const user = users.find(u => u._id === priority.userId);
      if (!user || user.area !== selectedArea) return false;
    }

    // Filtro por iniciativa (puede ser array o string único)
    if (selectedInitiative !== 'all') {
      // Si tiene initiativeIds (array), verificar si contiene la iniciativa seleccionada
      if (priority.initiativeIds && Array.isArray(priority.initiativeIds)) {
        if (!priority.initiativeIds.includes(selectedInitiative)) return false;
      } else if (priority.initiativeId) {
        // Si solo tiene initiativeId (campo único), comparar directamente
        if (priority.initiativeId !== selectedInitiative) return false;
      } else {
        return false;
      }
    }

    // Filtro por cliente
    if (selectedClient !== 'all') {
      if (priority.clientId !== selectedClient) return false;
    }

    // Filtro por proyecto
    if (selectedProject !== 'all') {
      if (priority.projectId !== selectedProject) return false;
    }

    // Filtro por tipo
    if (priorityTypeFilter !== 'TODAS') {
      const priorityType = priority.type || 'ESTRATEGICA';
      if (priorityType !== priorityTypeFilter) return false;
    }

    // Filtro por keywords
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      if (!priority.title.toLowerCase().includes(keyword)) return false;
    }

    // Filtro por fecha
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
    setSelectedUser('all');
    setSelectedInitiative('all');
    setSelectedClient('all');
    setSelectedProject('all');
    setSelectedArea('all');
    setIncludeAdmins(true);
    setSearchKeyword('');
    setDateFrom('');
    setDateTo('');
    setPriorityTypeFilter('TODAS');
  };

  // Obtener áreas únicas
  const uniqueAreas = Array.from(new Set(users.filter(u => u.area).map(u => u.area as string)));

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

  if (!session) return null;

  const userStats = users.map(user => {
    const userPriorities = priorities.filter(p => p.userId._id === user._id);
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

  // Calcular estadísticas por área
  const areaStats = (() => {
    const areaMap = new Map<string, any>();

    users.forEach(user => {
      const area = user.area || 'Sin Área Asignada';
      const userPriorities = priorities.filter(p => p.userId._id === user._id);
      const completed = userPriorities.filter(p => p.status === 'COMPLETADO' || p.status === 'REPROGRAMADO').length;
      const totalCompletion = userPriorities.reduce((sum, p) => sum + p.completionPercentage, 0);

      if (!areaMap.has(area)) {
        areaMap.set(area, {
          area,
          userCount: 0,
          total: 0,
          completed: 0,
          totalCompletion: 0,
          monthPoints: 0
        });
      }

      const areaData = areaMap.get(area);
      areaData.userCount += 1;
      areaData.total += userPriorities.length;
      areaData.completed += completed;
      areaData.totalCompletion += totalCompletion;
      areaData.monthPoints += userGamification[user._id]?.currentMonthPoints || 0;
    });

    return Array.from(areaMap.values()).map(area => ({
      ...area,
      completionRate: area.total > 0 ? (area.completed / area.total * 100).toFixed(1) : 0,
      avgCompletion: area.total > 0 ? (area.totalCompletion / area.total).toFixed(1) : 0
    })).sort((a, b) => b.total - a.total);
  })();

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

  const handleExportAreaStats = () => {
    exportAreaStats(areaStats, 'Analitica_Areas');
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
    <PermissionGuard permission="viewAnalytics">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            📊 Analítica y Métricas
          </h1>

          {/* Filtros Completos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🔍 Filtros</h2>

            <div className="mb-4">
              <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeAdmins}
                  onChange={(e) => setIncludeAdmins(e.target.checked)}
                  className="mr-2"
                />
                Incluir prioridades de administradores
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Usuario
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Todos los usuarios</option>
                  {users.filter(u => includeAdmins || u.role === 'USER').map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} {user.role === 'ADMIN' ? '(Admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Iniciativa
                </label>
                <select
                  value={selectedInitiative}
                  onChange={(e) => setSelectedInitiative(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Todas las iniciativas</option>
                  {initiatives.map(initiative => (
                    <option key={initiative._id} value={initiative._id}>{initiative.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Cliente
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Todos los clientes</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>{client.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Proyecto
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Todos los proyectos</option>
                  {projects.filter(p => p.isActive).map(project => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Área
                </label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Todas las áreas</option>
                  {uniqueAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Prioridad
                </label>
                <select
                  value={priorityTypeFilter}
                  onChange={(e) => setPriorityTypeFilter(e.target.value as 'TODAS' | 'ESTRATEGICA' | 'OPERATIVA')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="TODAS">Todas</option>
                  <option value="ESTRATEGICA">Estratégicas</option>
                  <option value="OPERATIVA">Operativas</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar por palabras clave
                </label>
                <input
                  type="text"
                  placeholder="Buscar en títulos..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <button
                  onClick={handleClearFilters}
                  className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                >
                  🔄 Limpiar Filtros
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📊 Mostrando {priorities.length} prioridades
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Rendimiento por Usuario</h2>
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
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-800 dark:text-gray-100">Usuario</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">Total Prioridades</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">Completadas</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">Tasa Completado</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">% Promedio Avance</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">🏆 Puntos del Mes</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.map(stat => {
                    const isExpanded = expandedUserInTable === stat.user._id;
                    const initiativeStats = isExpanded ? getInitiativeStatsForUser(stat.user._id) : [];

                    return (
                      <React.Fragment key={stat.user._id}>
                        <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">
                                {stat.user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              {stat.user.name}
                            </div>
                          </td>
                          <td className="text-center py-3 px-4 font-semibold">{stat.total}</td>
                          <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {stat.completed}
                            </span>
                          </td>
                          <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                            <span className="font-bold text-blue-600">{stat.completionRate}%</span>
                          </td>
                          <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                            <div className="flex items-center justify-center">
                              <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-3 mr-2">
                                <div
                                  className="bg-blue-600 h-3 rounded-full"
                                  style={{ width: `${stat.avgCompletion}%` }}
                                ></div>
                              </div>
                              <span className="font-semibold">{stat.avgCompletion}%</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                            <div className="inline-flex items-center bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg px-3 py-2">
                              <span className="text-yellow-600 mr-1">🏆</span>
                              <span className="font-bold text-yellow-700">
                                {userGamification[stat.user._id]?.currentMonthPoints || 0}
                              </span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
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
                            <td colSpan={7} className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                📊 Desglose por Iniciativa Estratégica
                              </h4>
                              <div className="space-y-2">
                                {initiativeStats.map(initStat => (
                                  <div
                                    key={initStat.initiative._id}
                                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center flex-1">
                                        <div
                                          className="w-3 h-3 rounded-full mr-3"
                                          style={{ backgroundColor: initStat.initiative.color }}
                                        ></div>
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                                            {initStat.initiative.name}
                                          </div>
                                          <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {initStat.total} prioridades • {initStat.completed} completadas
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                          <div className="text-xs text-gray-600 dark:text-gray-400">Tasa Completado</div>
                                          <div className="font-bold text-blue-600 text-sm">
                                            {initStat.completionRate}%
                                          </div>
                                        </div>
                                        <div className="flex items-center">
                                          <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                                            <div
                                              className="h-2 rounded-full"
                                              style={{
                                                width: `${initStat.avgCompletion}%`,
                                                backgroundColor: initStat.initiative.color
                                              }}
                                            ></div>
                                          </div>
                                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
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

          {/* Nueva sección: Rendimiento por Área */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">🏢 Rendimiento por Área</h2>
              <button
                onClick={handleExportAreaStats}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                title="Exportar a Excel"
              >
                📥 Exportar a Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-800 dark:text-gray-100">Área</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">Usuarios</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">Total Prioridades</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">Completadas</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">Tasa Completado</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">% Promedio Avance</th>
                    <th className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">🏆 Puntos Totales</th>
                  </tr>
                </thead>
                <tbody>
                  {areaStats.map((stat, index) => (
                    <tr key={stat.area} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">
                            {index + 1}
                          </div>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">{stat.area}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {stat.userCount}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4 font-semibold">{stat.total}</td>
                      <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {stat.completed}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                        <span className="font-bold text-blue-600">{stat.completionRate}%</span>
                      </td>
                      <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                        <div className="flex items-center justify-center">
                          <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-3 mr-2">
                            <div
                              className="bg-purple-600 h-3 rounded-full"
                              style={{ width: `${stat.avgCompletion}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold">{stat.avgCompletion}%</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 text-gray-800 dark:text-gray-100">
                        <div className="inline-flex items-center bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg px-3 py-2">
                          <span className="text-yellow-600 mr-1">🏆</span>
                          <span className="font-bold text-yellow-700">
                            {stat.monthPoints}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {areaStats.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No hay datos de áreas disponibles
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Distribución por Iniciativa Estratégica</h2>
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
                  <div key={stat.initiative._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
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
                          <span className="font-medium text-gray-800 dark:text-gray-100">{stat.initiative.name}</span>
                          <span className="ml-2 text-sm text-gray-500">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{stat.count} prioridades</span>
                          <span className="font-bold text-gray-800 dark:text-gray-100">{stat.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
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
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          📊 Desglose por Usuario
                        </h4>
                        <div className="space-y-3">
                          {userStats.map(userStat => {
                            const isUserExpanded = expandedUser === userStat.user._id;
                            const userPriorities = isUserExpanded ? getUserPrioritiesForInitiative(userStat.user._id, stat.initiative._id) : [];

                            return (
                              <div key={userStat.user._id}>
                                <div
                                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
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
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                          {userStat.total} prioridades • {userStat.completed} completadas
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <div className="text-right">
                                        <div className="text-xs text-gray-600 dark:text-gray-400">Tasa Completado</div>
                                        <div className="font-bold text-blue-600 text-sm">
                                          {userStat.completionRate}%
                                        </div>
                                      </div>
                                      <div className="flex items-center">
                                        <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                                          <div
                                            className="h-2 rounded-full"
                                            style={{
                                              width: `${userStat.avgCompletion}%`,
                                              backgroundColor: stat.initiative.color
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
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
                                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:shadow-sm transition-shadow"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <h5 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                                                {priority.title}
                                              </h5>
                                              <span className={`text-xs px-2 py-0.5 rounded ${
                                                (priority.type || 'ESTRATEGICA') === 'ESTRATEGICA'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-green-100 text-green-700'
                                              }`}>
                                                {(priority.type || 'ESTRATEGICA') === 'ESTRATEGICA' ? 'Estratégica' : 'Operativa'}
                                              </span>
                                            </div>
                                            {priority.description && (
                                              <p className="text-xs text-gray-600 line-clamp-2">
                                                {priority.description}
                                              </p>
                                            )}
                                          </div>
                                          <StatusBadge status={priority.status} />
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                          <div className="text-gray-500 dark:text-gray-400">
                                            {new Date(priority.weekStart).toLocaleDateString('es-MX')} - {new Date(priority.weekEnd).toLocaleDateString('es-MX')}
                                          </div>
                                          <div className="flex items-center">
                                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                                              <div
                                                className="h-2 rounded-full"
                                                style={{
                                                  width: `${priority.completionPercentage}%`,
                                                  backgroundColor: stat.initiative.color
                                                }}
                                              ></div>
                                            </div>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">
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
    </PermissionGuard>
  );
}

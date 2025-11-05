'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  generatePrioritiesReport,
  generateUserPerformanceReport,
  generateInitiativesReport,
  generateChecklistReport
} from '@/lib/generateReports';

interface User {
  _id: string;
  name: string;
  role: string;
  email: string;
  area?: string;
}

interface Initiative {
  _id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

interface ChecklistItem {
  _id?: string;
  text: string;
  completed: boolean;
  createdAt?: string;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  weekStart: string;
  completionPercentage: number;
  status: string;
  type?: 'ESTRATEGICA' | 'OPERATIVA';
  userId: string;
  initiativeId: string;
  checklist?: ChecklistItem[];
}

type ReportType = 'priorities' | 'performance' | 'initiatives' | 'checklist';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedInitiative, setSelectedInitiative] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [includeAdmins, setIncludeAdmins] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [reportType, setReportType] = useState<ReportType>('priorities');
  const [priorityTypeFilter, setPriorityTypeFilter] = useState<'TODAS' | 'ESTRATEGICA' | 'OPERATIVA'>('TODAS');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
      const currentUserId = (session?.user as any)?.id;

      const [usersRes, initiativesRes, prioritiesRes, currentUserRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/initiatives'),
        fetch('/api/priorities?forDashboard=true'),
        currentUserId ? fetch(`/api/users/${currentUserId}`) : Promise.resolve(null)
      ]);

      const [usersData, initiativesData, prioritiesData, currentUserData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        prioritiesRes.json(),
        currentUserRes ? currentUserRes.json() : null
      ]);

      setUsers(usersData);
      setInitiatives(initiativesData);
      setPriorities(prioritiesData);
      setCurrentUser(currentUserData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPriorities = useMemo(() => {
    let filtered = priorities;

    if (selectedUser !== 'all') {
      filtered = filtered.filter(p => p.userId === selectedUser);
    }

    if (!includeAdmins) {
      const userIds = users.filter(u => u.role === 'USER').map(u => u._id);
      filtered = filtered.filter(p => userIds.includes(p.userId));
    }

    // Filtro por área
    if (selectedArea !== 'all') {
      const areaUserIds = users.filter(u => u.area === selectedArea).map(u => u._id);
      filtered = filtered.filter(p => areaUserIds.includes(p.userId));
    }

    if (selectedInitiative !== 'all') {
      filtered = filtered.filter(p => p.initiativeId === selectedInitiative);
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(p => new Date(p.weekStart) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.weekStart) <= toDate);
    }

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(keyword)
      );
    }

    // Filtro por tipo de prioridad
    if (priorityTypeFilter !== 'TODAS') {
      filtered = filtered.filter(p => (p.type || 'ESTRATEGICA') === priorityTypeFilter);
    }

    return filtered;
  }, [priorities, selectedUser, selectedInitiative, selectedArea, includeAdmins, dateFrom, dateTo, searchKeyword, priorityTypeFilter, users]);

  const filteredUsers = useMemo(() => {
    if (includeAdmins) return users;
    return users.filter(u => u.role === 'USER');
  }, [users, includeAdmins]);

  // Obtener áreas únicas
  const uniqueAreas = useMemo(() => {
    const areas = users
      .filter(u => u.area)
      .map(u => u.area as string);
    return Array.from(new Set(areas)).sort();
  }, [users]);

  const getFilterDescription = () => {
    const parts: string[] = [];

    if (selectedUser !== 'all') {
      const user = users.find(u => u._id === selectedUser);
      parts.push(`Usuario: ${user?.name}`);
    } else if (!includeAdmins) {
      parts.push('Solo usuarios (sin administradores)');
    }

    if (selectedArea !== 'all') {
      parts.push(`Área: ${selectedArea}`);
    }

    if (selectedInitiative !== 'all') {
      const initiative = initiatives.find(i => i._id === selectedInitiative);
      parts.push(`Iniciativa: ${initiative?.name}`);
    }

    if (dateFrom && dateTo) {
      parts.push(`Período: ${new Date(dateFrom).toLocaleDateString('es-MX')} - ${new Date(dateTo).toLocaleDateString('es-MX')}`);
    } else if (dateFrom) {
      parts.push(`Desde: ${new Date(dateFrom).toLocaleDateString('es-MX')}`);
    } else if (dateTo) {
      parts.push(`Hasta: ${new Date(dateTo).toLocaleDateString('es-MX')}`);
    }

    if (searchKeyword.trim()) {
      parts.push(`Búsqueda: "${searchKeyword}"`);
    }

    return parts.length > 0 ? parts.join(' | ') : undefined;
  };

  const handleGenerateReport = (format: 'pdf' | 'doc') => {
    const filterDescription = getFilterDescription();

    switch (reportType) {
      case 'priorities':
        generatePrioritiesReport(
          filteredPriorities,
          users,
          initiatives,
          format,
          filterDescription
        );
        break;
      case 'performance':
        generateUserPerformanceReport(
          filteredUsers,
          filteredPriorities,
          format,
          filterDescription
        );
        break;
      case 'initiatives':
        generateInitiativesReport(
          initiatives,
          filteredPriorities,
          format,
          filterDescription
        );
        break;
      case 'checklist':
        generateChecklistReport(
          filteredPriorities,
          users,
          initiatives,
          format,
          filterDescription
        );
        break;
    }
  };

  const clearFilters = () => {
    setSelectedUser('all');
    setSelectedInitiative('all');
    setSelectedArea('all');
    setIncludeAdmins(true);
    setDateFrom('');
    setDateTo('');
    setSearchKeyword('');
    setPriorityTypeFilter('TODAS');
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

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              📄 Generador de Reportes Profesionales
            </h1>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">ℹ️</span>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Genera reportes profesionales en PDF o Word</strong>
                <p className="mt-1">
                  Aplica filtros personalizados y genera reportes con tablas automáticas, resúmenes y estadísticas.
                  Los reportes incluyen formato profesional con encabezados, pie de página y fecha de generación.
                </p>
              </div>
            </div>
          </div>

          {/* Tipo de Reporte */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Tipo de Reporte</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setReportType('priorities')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'priorities'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="text-3xl mb-2">📋</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">Reporte de Prioridades</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Listado detallado de prioridades con estado y porcentaje
                </div>
              </button>

              <button
                onClick={() => setReportType('performance')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'performance'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="text-3xl mb-2">👥</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">Rendimiento de Usuarios</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Análisis de rendimiento y métricas por usuario
                </div>
              </button>

              <button
                onClick={() => setReportType('initiatives')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'initiatives'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="text-3xl mb-2">💡</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">Iniciativas Estratégicas</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Distribución de prioridades por iniciativa
                </div>
              </button>

              <button
                onClick={() => setReportType('checklist')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'checklist'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="text-3xl mb-2">✅</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">Tareas de Checklist</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Avance detallado de tareas en checklists de prioridades
                </div>
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Filtros del Reporte</h2>

            <div className="mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                  checked={includeAdmins}
                  onChange={(e) => setIncludeAdmins(e.target.checked)}
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Incluir prioridades de administradores
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Usuario
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Iniciativa
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Prioridad
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={priorityTypeFilter}
                  onChange={(e) => setPriorityTypeFilter(e.target.value as 'TODAS' | 'ESTRATEGICA' | 'OPERATIVA')}
                >
                  <option value="TODAS">Todas</option>
                  <option value="ESTRATEGICA">Estratégicas</option>
                  <option value="OPERATIVA">Operativas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Área
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                >
                  <option value="all">Todas las áreas</option>
                  {uniqueAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar por palabras clave
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Buscar en títulos..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha desde
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {reportType === 'priorities' && (
                  <>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{filteredPriorities.length}</span> prioridades serán incluidas en el reporte
                  </>
                )}
                {reportType === 'performance' && (
                  <>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{filteredUsers.length}</span> usuarios serán incluidos en el reporte
                  </>
                )}
                {reportType === 'initiatives' && (
                  <>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{initiatives.length}</span> iniciativas serán incluidas en el reporte
                  </>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                🔄 Limpiar filtros
              </button>
            </div>
          </div>

          {/* Vista Previa */}
          {getFilterDescription() && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">Filtros Aplicados</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">{getFilterDescription()}</p>
              </div>
            </div>
          )}

          {/* Botones de Generación */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Generar Reporte</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleGenerateReport('pdf')}
                className="flex items-center justify-center space-x-3 bg-red-600 text-white px-6 py-4 rounded-lg hover:bg-red-700 transition shadow-md font-semibold"
              >
                <span className="text-2xl">📕</span>
                <span>Generar Reporte PDF</span>
              </button>

              <button
                onClick={() => handleGenerateReport('doc')}
                className="flex items-center justify-center space-x-3 bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition shadow-md font-semibold"
              >
                <span className="text-2xl">📘</span>
                <span>Generar Reporte Word (.docx)</span>
              </button>
            </div>

            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="font-semibold mb-2">💡 Información:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Los reportes se generarán con los filtros aplicados actualmente</li>
                  <li>Los archivos se descargarán automáticamente en tu navegador</li>
                  <li>Los reportes incluyen fecha de generación y formato profesional</li>
                  <li>Los reportes PDF incluyen numeración de páginas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

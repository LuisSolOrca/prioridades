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
  generateChecklistReport,
  generateAzureDevOpsReport,
  generateLocalHoursReport,
  generateClientBreakdownReport,
  generateProjectBreakdownReport
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

interface Client {
  _id: string;
  name: string;
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
  clientId?: string;
  projectId?: string;
  checklist?: ChecklistItem[];
}

type ReportType = 'priorities' | 'performance' | 'initiatives' | 'checklist' | 'azuredevops' | 'localhours' | 'clientbreakdown' | 'projectbreakdown';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedInitiative, setSelectedInitiative] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [includeAdmins, setIncludeAdmins] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [reportType, setReportType] = useState<ReportType>('priorities');
  const [priorityTypeFilter, setPriorityTypeFilter] = useState<'TODAS' | 'ESTRATEGICA' | 'OPERATIVA'>('TODAS');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState('');

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

      const [usersRes, initiativesRes, clientsRes, projectsRes, prioritiesRes, currentUserRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/initiatives'),
        fetch('/api/clients'),
        fetch('/api/projects'),
        fetch('/api/priorities?forDashboard=true'),
        currentUserId ? fetch(`/api/users/${currentUserId}`) : Promise.resolve(null)
      ]);

      const [usersData, initiativesData, clientsData, projectsData, prioritiesData, currentUserData] = await Promise.all([
        usersRes.json(),
        initiativesRes.json(),
        clientsRes.json(),
        projectsRes.json(),
        prioritiesRes.json(),
        currentUserRes ? currentUserRes.json() : null
      ]);

      setUsers(usersData);
      setInitiatives(initiativesData);
      setClients(clientsData);
      setProjects(projectsData);
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

    // Filtro por iniciativa (puede ser array o string único)
    if (selectedInitiative !== 'all') {
      filtered = filtered.filter(p => {
        // Si tiene initiativeIds (array), verificar si contiene la iniciativa seleccionada
        if (p.initiativeIds && Array.isArray(p.initiativeIds)) {
          return p.initiativeIds.includes(selectedInitiative);
        }
        // Si solo tiene initiativeId (campo único), comparar directamente
        if (p.initiativeId) {
          return p.initiativeId === selectedInitiative;
        }
        return false;
      });
    }

    // Filtro por cliente
    if (selectedClient !== 'all') {
      filtered = filtered.filter(p => p.clientId === selectedClient);
    }

    // Filtro por proyecto
    if (selectedProject !== 'all') {
      filtered = filtered.filter(p => p.projectId === selectedProject);
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
  }, [priorities, selectedUser, selectedInitiative, selectedClient, selectedProject, selectedArea, includeAdmins, dateFrom, dateTo, searchKeyword, priorityTypeFilter, users]);

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

    if (selectedClient !== 'all') {
      const client = clients.find(c => c._id === selectedClient);
      parts.push(`Cliente: ${client?.name}`);
    }

    if (selectedProject !== 'all') {
      const project = projects.find(p => p._id === selectedProject);
      parts.push(`Proyecto: ${project?.name}`);
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

  const handleGenerateReport = async (format: 'pdf' | 'doc') => {
    setIsGeneratingReport(true);
    setReportProgress('Preparando datos del reporte...');

    try {
      const filterDescription = getFilterDescription();

      await new Promise(resolve => setTimeout(resolve, 300)); // Pequeña pausa para mostrar el mensaje inicial

      switch (reportType) {
        case 'priorities':
          setReportProgress('Generando reporte de prioridades...');
          await generatePrioritiesReport(
            filteredPriorities,
            users,
            initiatives,
            format,
            filterDescription
          );
          break;
        case 'performance':
          setReportProgress('Generando reporte de rendimiento...');
          await generateUserPerformanceReport(
            filteredUsers,
            filteredPriorities,
            format,
            filterDescription
          );
          break;
        case 'initiatives':
          setReportProgress('Generando reporte de iniciativas...');
          await generateInitiativesReport(
            initiatives,
            filteredPriorities,
            format,
            filterDescription
          );
          break;
        case 'checklist':
          setReportProgress('Generando reporte de checklist...');
          await generateChecklistReport(
            filteredPriorities,
            users,
            initiatives,
            format,
            filterDescription
          );
          break;
        case 'azuredevops':
          setReportProgress('Generando reporte de Azure DevOps...');
          await generateAzureDevOpsReport(
            filteredPriorities,
            users,
            initiatives,
            format,
            filterDescription
          );
          break;
        case 'localhours':
          setReportProgress('Consultando horas locales...');
          await generateLocalHoursReport(
            selectedUser,
            selectedArea,
            selectedClient,
            dateFrom,
            dateTo,
            format,
            filterDescription
          );
          break;
        case 'clientbreakdown':
          setReportProgress('Generando breakdown por cliente...');
          await generateClientBreakdownReport(
            filteredPriorities,
            users,
            clients,
            initiatives,
            format,
            filterDescription
          );
          break;
        case 'projectbreakdown':
          setReportProgress('Generando breakdown por proyecto...');
          await generateProjectBreakdownReport(
            filteredPriorities,
            users,
            projects,
            initiatives,
            format,
            filterDescription
          );
          break;
      }

      setReportProgress('¡Reporte generado exitosamente!');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error generating report:', error);
      setReportProgress('Error al generar el reporte');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsGeneratingReport(false);
      setReportProgress('');
    }
  };

  const clearFilters = () => {
    setSelectedUser('all');
    setSelectedInitiative('all');
    setSelectedClient('all');
    setSelectedProject('all');
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

              <button
                onClick={() => setReportType('azuredevops')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'azuredevops'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="text-3xl mb-2">
                  <svg className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 4.5v15l6.5 3.5v-3.5l-3-1.5v-13l3-1.5v-3.5l-6.5 3.5zm10.5-4.5v4.5l3 1.5v13l-3 1.5v4.5l6.5-3.5v-19l-6.5 3.5zm7 0v4.5l6.5 3.5v-8l-6.5 0z"/>
                  </svg>
                </div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">Azure DevOps</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Prioridades sincronizadas con Azure DevOps y sus tareas
                </div>
              </button>

              <button
                onClick={() => setReportType('localhours')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'localhours'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="text-3xl mb-2">🕐</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">Horas Locales</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Horas trabajadas en prioridades no vinculadas a Azure DevOps
                </div>
              </button>

              <button
                onClick={() => setReportType('clientbreakdown')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'clientbreakdown'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="text-3xl mb-2">🏢</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">Breakdown por Cliente</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Horas trabajadas y prioridades desglosadas por cliente
                </div>
              </button>

              <button
                onClick={() => setReportType('projectbreakdown')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'projectbreakdown'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="text-3xl mb-2">📁</div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">Breakdown por Proyecto</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Horas trabajadas y prioridades desglosadas por proyecto
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
                  Filtrar por Cliente
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="all">Todos los clientes</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrar por Proyecto
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="all">Todos los proyectos</option>
                  {projects.filter(p => p.isActive).map(project => (
                    <option key={project._id} value={project._id}>{project.name}</option>
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
                {reportType === 'azuredevops' && (
                  <>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{filteredPriorities.filter((p: any) => p.azureDevOps).length}</span> prioridades sincronizadas con Azure DevOps serán incluidas en el reporte
                  </>
                )}
                {reportType === 'localhours' && (
                  <>
                    Los filtros seleccionados se aplicarán al reporte de horas locales
                  </>
                )}
                {reportType === 'clientbreakdown' && (
                  <>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{filteredPriorities.length}</span> prioridades serán incluidas en el breakdown por cliente
                  </>
                )}
                {reportType === 'projectbreakdown' && (
                  <>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{filteredPriorities.length}</span> prioridades serán incluidas en el breakdown por proyecto
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

          {/* Barra de Progreso */}
          {isGeneratingReport && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-blue-500 dark:border-blue-400">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                    Generando Reporte...
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {reportProgress}
                  </p>
                  <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Generación */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Generar Reporte</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleGenerateReport('pdf')}
                disabled={isGeneratingReport}
                className={`flex items-center justify-center space-x-3 px-6 py-4 rounded-lg transition shadow-md font-semibold ${
                  isGeneratingReport
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <span className="text-2xl">📕</span>
                <span>Generar Reporte PDF</span>
              </button>

              <button
                onClick={() => handleGenerateReport('doc')}
                disabled={isGeneratingReport}
                className={`flex items-center justify-center space-x-3 px-6 py-4 rounded-lg transition shadow-md font-semibold ${
                  isGeneratingReport
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
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

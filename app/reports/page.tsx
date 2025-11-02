'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  generatePrioritiesReport,
  generateUserPerformanceReport,
  generateInitiativesReport
} from '@/lib/generateReports';

interface User {
  _id: string;
  name: string;
  role: string;
  email: string;
}

interface Initiative {
  _id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  weekStart: string;
  completionPercentage: number;
  status: string;
  userId: string;
  initiativeId: string;
}

type ReportType = 'priorities' | 'performance' | 'initiatives';

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
  const [includeAdmins, setIncludeAdmins] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [reportType, setReportType] = useState<ReportType>('priorities');

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
        fetch('/api/priorities?forDashboard=true')
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

    if (selectedUser !== 'all') {
      filtered = filtered.filter(p => p.userId === selectedUser);
    }

    if (!includeAdmins) {
      const userIds = users.filter(u => u.role === 'USER').map(u => u._id);
      filtered = filtered.filter(p => userIds.includes(p.userId));
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

    return filtered;
  }, [priorities, selectedUser, selectedInitiative, includeAdmins, dateFrom, dateTo, searchKeyword, users]);

  const filteredUsers = useMemo(() => {
    if (includeAdmins) return users;
    return users.filter(u => u.role === 'USER');
  }, [users, includeAdmins]);

  const getFilterDescription = () => {
    const parts: string[] = [];

    if (selectedUser !== 'all') {
      const user = users.find(u => u._id === selectedUser);
      parts.push(`Usuario: ${user?.name}`);
    } else if (!includeAdmins) {
      parts.push('Solo usuarios (sin administradores)');
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
    }
  };

  const clearFilters = () => {
    setSelectedUser('all');
    setSelectedInitiative('all');
    setIncludeAdmins(true);
    setDateFrom('');
    setDateTo('');
    setSearchKeyword('');
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
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              📄 Generador de Reportes Profesionales
            </h1>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">ℹ️</span>
              <div className="text-sm text-blue-800">
                <strong>Genera reportes profesionales en PDF o Word</strong>
                <p className="mt-1">
                  Aplica filtros personalizados y genera reportes con tablas automáticas, resúmenes y estadísticas.
                  Los reportes incluyen formato profesional con encabezados, pie de página y fecha de generación.
                </p>
              </div>
            </div>
          </div>

          {/* Tipo de Reporte */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tipo de Reporte</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setReportType('priorities')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'priorities'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-3xl mb-2">📋</div>
                <div className="font-semibold text-gray-800">Reporte de Prioridades</div>
                <div className="text-sm text-gray-600 mt-1">
                  Listado detallado de prioridades con estado y porcentaje
                </div>
              </button>

              <button
                onClick={() => setReportType('performance')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'performance'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-3xl mb-2">👥</div>
                <div className="font-semibold text-gray-800">Rendimiento de Usuarios</div>
                <div className="text-sm text-gray-600 mt-1">
                  Análisis de rendimiento y métricas por usuario
                </div>
              </button>

              <button
                onClick={() => setReportType('initiatives')}
                className={`p-4 rounded-lg border-2 transition ${
                  reportType === 'initiatives'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-3xl mb-2">💡</div>
                <div className="font-semibold text-gray-800">Iniciativas Estratégicas</div>
                <div className="text-sm text-gray-600 mt-1">
                  Distribución de prioridades por iniciativa
                </div>
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Filtros del Reporte</h2>

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

            <div className="flex items-center justify-between pb-4 border-b">
              <div className="text-sm text-gray-600">
                {reportType === 'priorities' && (
                  <>
                    <span className="font-semibold text-gray-800">{filteredPriorities.length}</span> prioridades serán incluidas en el reporte
                  </>
                )}
                {reportType === 'performance' && (
                  <>
                    <span className="font-semibold text-gray-800">{filteredUsers.length}</span> usuarios serán incluidos en el reporte
                  </>
                )}
                {reportType === 'initiatives' && (
                  <>
                    <span className="font-semibold text-gray-800">{initiatives.length}</span> iniciativas serán incluidas en el reporte
                  </>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                🔄 Limpiar filtros
              </button>
            </div>
          </div>

          {/* Vista Previa */}
          {getFilterDescription() && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Filtros Aplicados</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{getFilterDescription()}</p>
              </div>
            </div>
          )}

          {/* Botones de Generación */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Generar Reporte</h2>
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

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
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

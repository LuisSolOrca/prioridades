'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Hash, Users, Calendar, ExternalLink, Search, Table, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description?: string;
  slackChannelName?: string;
  client?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt?: string;
}

type SortField = 'name' | 'client' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

export default function ChannelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vista y filtros
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadProjects();
    }
  }, [status, router]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');

      if (!response.ok) {
        throw new Error('Error al cargar proyectos');
      }

      const data = await response.json();
      setProjects(Array.isArray(data) ? data : data.projects || []);
    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  // Normalizar string para búsqueda sin acentos
  const normalizeString = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  // Filtrar y ordenar proyectos
  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const normalizedQuery = normalizeString(searchQuery);
      result = result.filter(project => {
        const normalizedName = normalizeString(project.name || '');
        const normalizedDescription = normalizeString(project.description || '');
        const normalizedClient = normalizeString(project.client?.name || '');
        const normalizedSlack = normalizeString(project.slackChannelName || '');

        return normalizedName.includes(normalizedQuery) ||
               normalizedDescription.includes(normalizedQuery) ||
               normalizedClient.includes(normalizedQuery) ||
               normalizedSlack.includes(normalizedQuery);
      });
    }

    // Ordenar
    result.sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;

      switch (sortField) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'client':
          valueA = (a.client?.name || '').toLowerCase();
          valueB = (b.client?.name || '').toLowerCase();
          break;
        case 'createdAt':
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [projects, searchQuery, sortField, sortDirection]);

  // Cambiar ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Icono de ordenamiento
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-blue-600" />
      : <ArrowDown size={14} className="text-blue-600" />;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando canales...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center">
            <Hash className="mr-2" size={32} />
            Canales de Proyecto
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Colabora con tu equipo en tiempo real. Ve actualizaciones, chatea y comparte recursos.
          </p>
        </div>

        {/* Filtros y controles */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Búsqueda */}
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar proyectos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Vista y contador */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredAndSortedProjects.length} proyecto{filteredAndSortedProjects.length !== 1 ? 's' : ''}
              </span>

              {/* Toggle de vista */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title="Vista de tabla"
                >
                  <Table size={20} />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-md transition ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  title="Vista de tarjetas"
                >
                  <LayoutGrid size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Vista de Tabla */}
        {viewMode === 'table' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                      >
                        Proyecto
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('client')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                      >
                        Cliente
                        <SortIcon field="client" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                      >
                        Fecha
                        <SortIcon field="createdAt" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedProjects.map((project) => (
                    <tr
                      key={project._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                      onClick={() => router.push(`/channels/${project._id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
                            <Hash className="text-blue-600 dark:text-blue-400" size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {project.name}
                            </div>
                            {project.slackChannelName && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                #{project.slackChannelName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {project.client ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">
                            {project.client.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-xs">
                          {project.description || <span className="text-gray-400">Sin descripción</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(project.createdAt).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/channels/${project._id}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        >
                          Abrir
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAndSortedProjects.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? `No se encontraron proyectos para "${searchQuery}"`
                    : 'No hay proyectos disponibles'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vista de Cards */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedProjects.map((project) => (
              <button
                key={project._id}
                onClick={() => router.push(`/channels/${project._id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition p-6 text-left border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
                      <Hash className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                        {project.name}
                      </h3>
                      {project.slackChannelName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          #{project.slackChannelName}
                        </p>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="text-gray-400" size={18} />
                </div>

                {project.client && (
                  <div className="mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">
                      {project.client.name}
                    </span>
                  </div>
                )}

                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Calendar size={14} className="mr-1" />
                  Creado {new Date(project.createdAt).toLocaleDateString('es-MX')}
                </div>
              </button>
            ))}
          </div>
        )}

        {viewMode === 'cards' && filteredAndSortedProjects.length === 0 && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {searchQuery
                ? `No se encontraron proyectos para "${searchQuery}"`
                : 'No hay proyectos disponibles'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Los proyectos se crean automáticamente cuando se asignan prioridades o hitos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

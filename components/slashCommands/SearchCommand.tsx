'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, Target, MessageSquare, Link as LinkIcon, FileText } from 'lucide-react';

interface SearchCommandProps {
  projectId: string;
  initialType?: string;
  initialTerm?: string;
  onClose: () => void;
}

interface SearchResult {
  _id: string;
  type: 'priority' | 'message' | 'link';
  title: string;
  content?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
  status?: string;
  completionPercentage?: number;
}

export default function SearchCommand({
  projectId,
  initialType = 'all',
  initialTerm = '',
  onClose
}: SearchCommandProps) {
  const [searchType, setSearchType] = useState(initialType);
  const [searchTerm, setSearchTerm] = useState(initialTerm);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [initiatives, setInitiatives] = useState<any[]>([]);

  useEffect(() => {
    loadFilters();
    if (initialTerm) {
      handleSearch();
    }
  }, [projectId]);

  const loadFilters = async () => {
    try {
      // Cargar usuarios del proyecto
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : []);
      }

      // Cargar iniciativas
      const initiativesRes = await fetch('/api/initiatives');
      if (initiativesRes.ok) {
        const data = await initiativesRes.json();
        setInitiatives(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert('Por favor ingresa un término de búsqueda');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        projectId,
        term: searchTerm.trim(),
        type: searchType,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(selectedUser && { userId: selectedUser }),
        ...(selectedInitiative && { initiativeId: selectedInitiative })
      });

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error('Error en búsqueda');

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error al realizar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'priority': return <Target size={16} className="text-blue-600" />;
      case 'message': return <MessageSquare size={16} className="text-green-600" />;
      case 'link': return <LinkIcon size={16} className="text-purple-600" />;
      default: return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const colors: Record<string, string> = {
      'EN_TIEMPO': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'EN_RIESGO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'BLOQUEADO': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'COMPLETADO': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };

    return (
      <span className={`text-xs px-2 py-1 rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-300 dark:border-purple-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <Search className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Búsqueda Avanzada</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Encuentra lo que necesitas</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-4">
        {/* Search Term */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Término de búsqueda
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe lo que buscas..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Filter size={14} className="inline mr-1" />
            Tipo de contenido
          </label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'Todo', icon: '🔍' },
              { value: 'priorities', label: 'Prioridades', icon: '🎯' },
              { value: 'messages', label: 'Mensajes', icon: '💬' },
              { value: 'links', label: 'Links', icon: '🔗' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setSearchType(type.value)}
                className={`px-3 py-2 rounded-lg text-sm transition ${
                  searchType === type.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-2 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar size={14} className="inline mr-1" />
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar size={14} className="inline mr-1" />
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
        </div>

        {/* User and Initiative Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User size={14} className="inline mr-1" />
              Usuario
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="">Todos</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Target size={14} className="inline mr-1" />
              Iniciativa
            </label>
            <select
              value={selectedInitiative}
              onChange={(e) => setSelectedInitiative(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="">Todas</option>
              {initiatives.map((initiative) => (
                <option key={initiative._id} value={initiative._id}>
                  {initiative.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
        >
          {loading ? 'Buscando...' : '🔍 Buscar'}
        </button>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Resultados {results.length > 0 && `(${results.length})`}
        </h4>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Buscando...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron resultados' : 'Ingresa un término para buscar'}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result._id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getResultIcon(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.title}
                      </h5>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {result.content}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {result.user && (
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {result.user.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(result.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      {result.completionPercentage !== undefined && (
                        <span className="font-medium text-purple-600 dark:text-purple-400">
                          {result.completionPercentage}% completado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/search</code>
      </div>
    </div>
  );
}

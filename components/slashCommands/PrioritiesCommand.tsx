'use client';

import { useState, useEffect } from 'react';
import { List, Filter, User, Target, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface PrioritiesCommandProps {
  projectId: string;
  initialFilters?: {
    status?: string;
    user?: string;
    initiative?: string;
    week?: string;
  };
  onClose: () => void;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  completionPercentage: number;
  weekStart: string;
  weekEnd: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  initiativeIds?: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
  updatedAt: string;
}

export default function PrioritiesCommand({
  projectId,
  initialFilters,
  onClose
}: PrioritiesCommandProps) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [filteredPriorities, setFilteredPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status || 'all');
  const [userFilter, setUserFilter] = useState(initialFilters?.user || 'all');
  const [initiativeFilter, setInitiativeFilter] = useState(initialFilters?.initiative || 'all');
  const [weekFilter, setWeekFilter] = useState(initialFilters?.week || 'all');

  const [users, setUsers] = useState<any[]>([]);
  const [initiatives, setInitiatives] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [priorities, statusFilter, userFilter, initiativeFilter, weekFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar prioridades
      const prioritiesRes = await fetch(`/api/projects/${projectId}/priorities`);
      if (prioritiesRes.ok) {
        const data = await prioritiesRes.json();
        setPriorities(data.priorities || []);
      }

      // Cargar usuarios
      const usersRes = await fetch('/api/users');
      console.log('[PrioritiesCommand] Users response status:', usersRes.status);
      if (usersRes.ok) {
        const data = await usersRes.json();
        console.log('[PrioritiesCommand] Users data:', data, 'IsArray:', Array.isArray(data));
        setUsers(Array.isArray(data) ? data : []);
      }

      // Cargar iniciativas
      const initiativesRes = await fetch('/api/initiatives');
      console.log('[PrioritiesCommand] Initiatives response status:', initiativesRes.status);
      if (initiativesRes.ok) {
        const data = await initiativesRes.json();
        console.log('[PrioritiesCommand] Initiatives data:', data, 'IsArray:', Array.isArray(data));
        setInitiatives(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...priorities];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Filter by user
    if (userFilter !== 'all') {
      filtered = filtered.filter(p => p.userId._id === userFilter);
    }

    // Filter by initiative
    if (initiativeFilter !== 'all') {
      filtered = filtered.filter(p =>
        p.initiativeIds?.some(i => i._id === initiativeFilter)
      );
    }

    // Filter by week
    if (weekFilter !== 'all') {
      const now = new Date();
      const currentWeekStart = getMonday(now);

      if (weekFilter === 'current') {
        filtered = filtered.filter(p => {
          const weekStart = new Date(p.weekStart);
          return weekStart >= currentWeekStart;
        });
      } else if (weekFilter === 'past') {
        filtered = filtered.filter(p => {
          const weekStart = new Date(p.weekStart);
          return weekStart < currentWeekStart;
        });
      }
    }

    setFilteredPriorities(filtered);
  };

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'EN_TIEMPO': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'EN_RIESGO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'BLOQUEADO': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'COMPLETADO': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'REPROGRAMADO': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setUserFilter('all');
    setInitiativeFilter('all');
    setWeekFilter('all');
  };

  const activeFiltersCount = [statusFilter, userFilter, initiativeFilter, weekFilter].filter(f => f !== 'all').length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 my-2">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando prioridades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-300 dark:border-indigo-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <List className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
              Prioridades {activeFiltersCount > 0 && `(${activeFiltersCount} filtros)`}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {filteredPriorities.length} de {priorities.length} prioridades
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Filter size={16} />
            Filtros
          </h4>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Todos</option>
              <option value="EN_TIEMPO">En Tiempo</option>
              <option value="EN_RIESGO">En Riesgo</option>
              <option value="BLOQUEADO">Bloqueado</option>
              <option value="COMPLETADO">Completado</option>
              <option value="REPROGRAMADO">Reprogramado</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Usuario
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Todos</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Initiative Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Iniciativa
            </label>
            <select
              value={initiativeFilter}
              onChange={(e) => setInitiativeFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Todas</option>
              {initiatives.map((initiative) => (
                <option key={initiative._id} value={initiative._id}>
                  {initiative.name}
                </option>
              ))}
            </select>
          </div>

          {/* Week Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Semana
            </label>
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Todas</option>
              <option value="current">Semana Actual</option>
              <option value="past">Semanas Pasadas</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={() => setViewMode('compact')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg transition ${
              viewMode === 'compact'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            📋 Vista Compacta
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg transition ${
              viewMode === 'detailed'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            📝 Vista Detallada
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
        {filteredPriorities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No se encontraron prioridades con los filtros seleccionados
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPriorities.map((priority) => (
              <div
                key={priority._id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                {/* Compact View */}
                {viewMode === 'compact' && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {priority.title}
                        </h5>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(priority.status)}`}>
                          {priority.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {priority.userId.name}
                        </span>
                        <span>{priority.completionPercentage}%</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(priority.weekStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(priority._id)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-500 rounded"
                    >
                      {expandedIds.has(priority._id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                )}

                {/* Detailed View or Expanded Compact */}
                {(viewMode === 'detailed' || expandedIds.has(priority._id)) && (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {priority.title}
                        </h5>
                        {priority.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {priority.description}
                          </p>
                        )}
                      </div>
                      {viewMode === 'compact' && (
                        <button
                          onClick={() => toggleExpand(priority._id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-500 rounded"
                        >
                          <ChevronUp size={16} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(priority.status)}`}>
                        {priority.status.replace('_', ' ')}
                      </span>
                      {priority.initiativeIds?.map((initiative) => (
                        <span
                          key={initiative._id}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: `${initiative.color}20`,
                            color: initiative.color
                          }}
                        >
                          {initiative.name}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Usuario:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{priority.userId.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Progreso:</span>
                        <span className="ml-2 font-medium text-indigo-600 dark:text-indigo-400">
                          {priority.completionPercentage}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Inicio:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">
                          {new Date(priority.weekStart).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Fin:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">
                          {new Date(priority.weekEnd).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${priority.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/priorities</code>
      </div>
    </div>
  );
}

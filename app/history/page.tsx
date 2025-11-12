'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import PriorityFormModal from '@/components/PriorityFormModal';
import PermissionGuard from '@/components/PermissionGuard';
import { getWeekLabel } from '@/lib/utils';
import { exportPriorities } from '@/lib/exportToExcel';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  area?: string;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface ChecklistItem {
  _id?: string;
  text: string;
  completed: boolean;
  createdAt?: string;
}

interface EvidenceLink {
  _id?: string;
  title: string;
  url: string;
  createdAt?: string;
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
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  type?: 'ESTRATEGICA' | 'OPERATIVA';
  userId: string;
  initiativeId?: string; // Mantener para compatibilidad
  initiativeIds?: string[]; // Nuevo campo para múltiples iniciativas
  clientId?: string;
  projectId?: string;
  isCarriedOver?: boolean;
  checklist?: ChecklistItem[];
  evidenceLinks?: EvidenceLink[];
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedInitiative, setSelectedInitiative] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [includeAdmins, setIncludeAdmins] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [priorityTypeFilter, setPriorityTypeFilter] = useState<'TODAS' | 'ESTRATEGICA' | 'OPERATIVA'>('TODAS');
  const [loading, setLoading] = useState(true);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
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

      const [usersRes, initiativesRes, clientsRes, projectsRes, prioritiesRes, currentUserRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/initiatives'),
        fetch('/api/clients?activeOnly=true'),
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
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
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

    // Filtro por usuario
    if (selectedUser !== 'all') {
      filtered = filtered.filter(p => p.userId === selectedUser);
    }

    // Filtro por rol de usuario (incluir/excluir admins)
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

    // Filtro por tipo de prioridad
    if (priorityTypeFilter !== 'TODAS') {
      filtered = filtered.filter(p => (p.type || 'ESTRATEGICA') === priorityTypeFilter);
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
  }, [priorities, selectedUser, selectedInitiative, selectedClient, selectedProject, selectedArea, priorityTypeFilter, includeAdmins, dateFrom, dateTo, searchKeyword, users]);

  // Obtener áreas únicas
  const uniqueAreas = useMemo(() => {
    const areas = users
      .filter(u => u.area)
      .map(u => u.area as string);
    return Array.from(new Set(areas)).sort();
  }, [users]);

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

  const handleEdit = (priority: Priority) => {
    // Compatibilidad: convertir initiativeId a initiativeIds si existe
    const editFormData = {
      title: priority.title,
      description: priority.description || '',
      initiativeIds: priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []),
      clientId: priority.clientId,
      projectId: priority.projectId,
      completionPercentage: priority.completionPercentage,
      status: priority.status,
      type: (priority.type || 'ESTRATEGICA') as 'ESTRATEGICA' | 'OPERATIVA',
      checklist: priority.checklist || [],
      evidenceLinks: priority.evidenceLinks || [],
      weekStart: priority.weekStart,
      weekEnd: priority.weekEnd
    };

    setEditingPriority(priority);
    setFormData(editFormData);
    setSelectedUserId(priority.userId);
    setShowEditForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !editingPriority) return;

    try {
      const updateData = {
        ...formData,
        userId: selectedUserId // Incluir el userId para reasignación
      };

      const res = await fetch(`/api/priorities/${editingPriority._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!res.ok) throw new Error('Error updating priority');

      await loadData();
      setShowEditForm(false);
      setEditingPriority(null);
      setFormData(null);
      setSelectedUserId('');
    } catch (error) {
      console.error('Error saving priority:', error);
      alert('Error al guardar la prioridad');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta prioridad?')) return;

    try {
      const res = await fetch(`/api/priorities/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error deleting priority');

      await loadData();
    } catch (error) {
      console.error('Error deleting priority:', error);
      alert('Error al eliminar la prioridad');
    }
  };

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

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
    <PermissionGuard permission="viewHistory">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar por palabras clave
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{filteredPriorities.length}</span> prioridades encontradas
              </div>
              <button
                onClick={() => {
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
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                🔄 Limpiar todos los filtros
              </button>
            </div>

            <div className="space-y-6">
              {weekGroups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <p className="text-gray-500 dark:text-gray-400">No hay datos históricos con los filtros seleccionados</p>
                </div>
              ) : (
                weekGroups.map(week => {
                  const weekStats = {
                    total: week.priorities.length,
                    completed: week.priorities.filter(p => p.status === 'COMPLETADO' || p.status === 'REPROGRAMADO').length,
                    avgCompletion: week.priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / week.priorities.length
                  };

                  return (
                    <div key={week.weekStart.toISOString()} className="border-l-4 border-blue-500 pl-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                            {getWeekLabel(week.weekStart)}
                          </h3>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {weekStats.total} prioridades - {weekStats.completed} completadas -
                            Promedio: {weekStats.avgCompletion.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {week.priorities.map(priority => {
                          const user = users.find(u => u._id === priority.userId);
                          // Obtener iniciativas (compatibilidad con ambos campos)
                          const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
                          const priorityInitiatives = priorityInitiativeIds
                            .map(id => initiatives.find(i => i._id === id))
                            .filter((init): init is Initiative => init !== undefined);
                          const primaryInitiative = priorityInitiatives[0];

                          return (
                            <div key={priority._id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700" style={{ borderLeftColor: primaryInitiative?.color || '#ccc', borderLeftWidth: '3px' }}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{priority.title}</div>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      (priority.type || 'ESTRATEGICA') === 'ESTRATEGICA'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200'
                                    }`}>
                                      {(priority.type || 'ESTRATEGICA') === 'ESTRATEGICA' ? 'Estratégica' : 'Operativa'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-1 items-center">
                                    <span>{user?.name}</span>
                                    {priorityInitiatives.map((initiative, idx) => initiative && (
                                      <span key={initiative._id}>
                                        • <span style={{ color: initiative.color }}>●</span> {initiative.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <StatusBadge status={priority.status as any} />
                                  {isAdmin && (
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => handleEdit(priority)}
                                        className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 w-8 h-8 rounded transition text-xs"
                                        title="Editar prioridad"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDelete(priority._id)}
                                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 w-8 h-8 rounded transition text-xs"
                                        title="Eliminar prioridad"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${priority.completionPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="font-bold text-gray-700 dark:text-gray-300">{priority.completionPercentage}%</span>
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

      {/* Modal de Edición con PriorityFormModal */}
      <PriorityFormModal
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setEditingPriority(null);
          setFormData(null);
          setSelectedUserId('');
        }}
        formData={formData || {
          title: '',
          description: '',
          initiativeIds: [],
          clientId: undefined,
          projectId: undefined,
          completionPercentage: 0,
          status: 'EN_TIEMPO',
          type: 'ESTRATEGICA',
          checklist: [],
          evidenceLinks: []
        }}
        setFormData={(data) => setFormData(data)}
        handleSubmit={handleSave}
        initiatives={initiatives}
        clients={clients}
        onClientCreated={(newClient) => {
          // Agregar el nuevo cliente a la lista
          setClients([...clients, newClient]);
        }}
        projects={projects}
        onProjectCreated={(newProject) => {
          // Agregar el nuevo proyecto a la lista
          setProjects([...projects, newProject]);
        }}
        isEditing={true}
        weekLabel={editingPriority ? getWeekLabel(new Date(editingPriority.weekStart)) : ''}
        allowUserReassignment={isAdmin}
        users={users}
        selectedUserId={selectedUserId}
        onUserChange={setSelectedUserId}
      />
      </div>
    </PermissionGuard>
  );
}

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { Search, X } from 'lucide-react';

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
  isActive: boolean;
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

interface ChecklistItem {
  text: string;
  completed: boolean;
  completedHours?: number;
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
  initiativeId?: string;
  initiativeIds?: string[];
  clientId?: string;
  projectId?: string;
  checklist?: ChecklistItem[];
}

export default function BulkAssignmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de filtros
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

  // Estados de asignación
  const [selectedPriorities, setSelectedPriorities] = useState<Set<string>>(new Set());
  const [assignClient, setAssignClient] = useState('');
  const [assignProject, setAssignProject] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Estados para crear nuevos clientes y proyectos
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [clientCreating, setClientCreating] = useState(false);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectCreating, setProjectCreating] = useState(false);

  // Estado para modal de detalles
  const [selectedPriorityForView, setSelectedPriorityForView] = useState<Priority | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      const userRole = (session.user as any).role;
      if (userRole !== 'ADMIN') {
        router.push('/dashboard');
      } else {
        loadData();
      }
    }
  }, [status, router, session]);

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

      setUsers(usersData);
      setInitiatives(initiativesData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
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
      if (selectedClient === 'none') {
        // Filtrar prioridades sin cliente
        filtered = filtered.filter(p => !p.clientId);
      } else {
        filtered = filtered.filter(p => p.clientId === selectedClient);
      }
    }

    // Filtro por proyecto
    if (selectedProject !== 'all') {
      if (selectedProject === 'none') {
        // Filtrar prioridades sin proyecto
        filtered = filtered.filter(p => !p.projectId);
      } else {
        filtered = filtered.filter(p => p.projectId === selectedProject);
      }
    }

    // Filtro por tipo
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
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.weekStart) <= toDate);
    }

    // Filtro por keywords
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(keyword) ||
        (p.description && p.description.toLowerCase().includes(keyword))
      );
    }

    return filtered;
  }, [priorities, selectedUser, selectedInitiative, selectedClient, selectedProject, selectedArea, includeAdmins, dateFrom, dateTo, searchKeyword, priorityTypeFilter, users]);

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

  const uniqueAreas = useMemo(() => {
    const areas = users
      .filter(u => u.area)
      .map(u => u.area as string);
    return Array.from(new Set(areas));
  }, [users]);

  const togglePriority = (priorityId: string) => {
    const newSelected = new Set(selectedPriorities);
    if (newSelected.has(priorityId)) {
      newSelected.delete(priorityId);
    } else {
      newSelected.add(priorityId);
    }
    setSelectedPriorities(newSelected);
  };

  const toggleAll = () => {
    if (selectedPriorities.size === filteredPriorities.length) {
      setSelectedPriorities(new Set());
    } else {
      setSelectedPriorities(new Set(filteredPriorities.map(p => p._id)));
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      alert('Por favor ingresa el nombre del cliente');
      return;
    }

    setClientCreating(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          isActive: true
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear el cliente');
      }

      const newClient = await res.json();

      // Agregar el nuevo cliente a la lista y seleccionarlo
      setClients([...clients, newClient]);
      setAssignClient(newClient._id);

      // Limpiar estado
      setNewClientName('');
      setIsCreatingNewClient(false);
      alert(`✅ Cliente "${newClient.name}" creado exitosamente`);
    } catch (error: any) {
      console.error('Error al crear cliente:', error);
      alert('Error al crear el cliente: ' + error.message);
    } finally {
      setClientCreating(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('Por favor ingresa el nombre del proyecto');
      return;
    }

    setProjectCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          isActive: true
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear el proyecto');
      }

      const newProject = await res.json();

      // Agregar el nuevo proyecto a la lista y seleccionarlo
      setProjects([...projects, newProject]);
      setAssignProject(newProject._id);

      // Limpiar estado
      setNewProjectName('');
      setIsCreatingNewProject(false);
      alert(`✅ Proyecto "${newProject.name}" creado exitosamente`);
    } catch (error: any) {
      console.error('Error al crear proyecto:', error);
      alert('Error al crear el proyecto: ' + error.message);
    } finally {
      setProjectCreating(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedPriorities.size === 0) {
      alert('Por favor selecciona al menos una prioridad');
      return;
    }

    if (!assignClient && !assignProject) {
      alert('Por favor selecciona al menos un cliente o proyecto para asignar');
      return;
    }

    if (!confirm(`¿Estás seguro de asignar ${assignClient ? 'cliente' : ''}${assignClient && assignProject ? ' y ' : ''}${assignProject ? 'proyecto' : ''} a ${selectedPriorities.size} prioridad(es)?`)) {
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch('/api/priorities/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorityIds: Array.from(selectedPriorities),
          clientId: assignClient || undefined,
          projectId: assignProject || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Error en la asignación masiva');
      }

      const result = await response.json();
      alert(`✅ Asignación completada exitosamente:\n${result.updated} prioridades actualizadas`);

      // Recargar datos y limpiar selección
      await loadData();
      setSelectedPriorities(new Set());
      setAssignClient('');
      setAssignProject('');
    } catch (error: any) {
      console.error('Error en asignación masiva:', error);
      alert('Error al asignar: ' + error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            📋 Asignación Masiva de Cliente y Proyecto
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Selecciona múltiples prioridades y asígnales cliente y/o proyecto de forma masiva
          </p>
        </div>

        {/* Sección de Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🔍 Filtros de Búsqueda</h2>

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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Todos los clientes</option>
                <option value="none">❌ Sin cliente asignado</option>
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Todos los proyectos</option>
                <option value="none">❌ Sin proyecto asignado</option>
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                placeholder="Buscar en título o descripción..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <button
                onClick={clearFilters}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
              >
                🔄 Limpiar Filtros
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              📊 Mostrando {filteredPriorities.length} prioridades • {selectedPriorities.size} seleccionadas
            </p>
          </div>
        </div>

        {/* Sección de Asignación Masiva */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">✏️ Asignación Masiva</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Asignar Cliente
              </label>
              {!isCreatingNewClient ? (
                <div className="flex gap-2">
                  <select
                    value={assignClient}
                    onChange={(e) => setAssignClient(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isAssigning}
                  >
                    <option value="">No modificar cliente</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>{client.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsCreatingNewClient(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                    disabled={isAssigning}
                    title="Crear nuevo cliente"
                  >
                    + Nuevo
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nombre del nuevo cliente"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={clientCreating}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateClient()}
                  />
                  <button
                    onClick={handleCreateClient}
                    disabled={clientCreating || !newClientName.trim()}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm disabled:bg-gray-400"
                  >
                    {clientCreating ? '...' : '✓'}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingNewClient(false);
                      setNewClientName('');
                    }}
                    disabled={clientCreating}
                    className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition font-semibold text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Asignar Proyecto
              </label>
              {!isCreatingNewProject ? (
                <div className="flex gap-2">
                  <select
                    value={assignProject}
                    onChange={(e) => setAssignProject(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isAssigning}
                  >
                    <option value="">No modificar proyecto</option>
                    {projects.filter(p => p.isActive).map(project => (
                      <option key={project._id} value={project._id}>{project.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsCreatingNewProject(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                    disabled={isAssigning}
                    title="Crear nuevo proyecto"
                  >
                    + Nuevo
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nombre del nuevo proyecto"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={projectCreating}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <button
                    onClick={handleCreateProject}
                    disabled={projectCreating || !newProjectName.trim()}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm disabled:bg-gray-400"
                  >
                    {projectCreating ? '...' : '✓'}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingNewProject(false);
                      setNewProjectName('');
                    }}
                    disabled={projectCreating}
                    className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition font-semibold text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-end">
              <button
                onClick={handleBulkAssign}
                disabled={isAssigning || selectedPriorities.size === 0}
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isAssigning ? '⏳ Asignando...' : `✅ Asignar a ${selectedPriorities.size} prioridad(es)`}
              </button>
            </div>
          </div>

          {(assignClient || assignProject) && selectedPriorities.size > 0 && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ℹ️ Se asignará:
                {assignClient && ` Cliente: ${clients.find(c => c._id === assignClient)?.name}`}
                {assignClient && assignProject && ' •'}
                {assignProject && ` Proyecto: ${projects.find(p => p._id === assignProject)?.name}`}
                {' '} a {selectedPriorities.size} prioridad(es)
              </p>
            </div>
          )}
        </div>

        {/* Lista de Prioridades */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Prioridades Encontradas ({filteredPriorities.length})
            </h2>
            <button
              onClick={toggleAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              {selectedPriorities.size === filteredPriorities.length ? '☑️ Deseleccionar todas' : '☐ Seleccionar todas'}
            </button>
          </div>

          {filteredPriorities.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No se encontraron prioridades con los filtros aplicados
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPriorities.map(priority => {
                const user = users.find(u => u._id === priority.userId);
                const initiative = initiatives.find(i => i._id === priority.initiativeId);
                const client = clients.find(c => c._id === priority.clientId);
                const project = projects.find(p => p._id === priority.projectId);
                const isSelected = selectedPriorities.has(priority._id);

                return (
                  <div
                    key={priority._id}
                    className={`p-4 border rounded-lg transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1 mr-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePriority(priority._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 cursor-pointer" onClick={() => togglePriority(priority._id)}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                            {priority.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={priority.status} />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPriorityForView(priority);
                              }}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition"
                              title="Ver detalles"
                            >
                              <Search size={18} />
                            </button>
                          </div>
                        </div>
                        {priority.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {priority.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            👤 {user?.name || 'Usuario desconocido'}
                          </span>
                          {initiative && (
                            <span className="px-2 py-1 rounded" style={{ backgroundColor: initiative.color + '20', color: initiative.color }}>
                              🎯 {initiative.name}
                            </span>
                          )}
                          {client && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                              🏢 {client.name}
                            </span>
                          )}
                          {project && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                              📁 {project.name}
                            </span>
                          )}
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                            📅 {new Date(priority.weekStart).toLocaleDateString('es-MX')}
                          </span>
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded">
                            {priority.completionPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalles */}
      {selectedPriorityForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Detalles de la Prioridad
              </h2>
              <button
                onClick={() => setSelectedPriorityForView(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Título */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Título</h3>
                <p className="text-gray-800 dark:text-gray-200">{selectedPriorityForView.title}</p>
              </div>

              {/* Descripción */}
              {selectedPriorityForView.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</h3>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedPriorityForView.description}</p>
                </div>
              )}

              {/* Usuario */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Usuario</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {users.find(u => u._id === selectedPriorityForView.userId)?.name || 'Usuario desconocido'}
                </p>
              </div>

              {/* Iniciativa */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Iniciativa</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {(() => {
                    if (selectedPriorityForView.initiativeIds && selectedPriorityForView.initiativeIds.length > 0) {
                      return selectedPriorityForView.initiativeIds
                        .map(id => initiatives.find(i => i._id === id)?.name)
                        .filter(Boolean)
                        .join(', ') || 'No especificada';
                    }
                    if (selectedPriorityForView.initiativeId) {
                      return initiatives.find(i => i._id === selectedPriorityForView.initiativeId)?.name || 'No especificada';
                    }
                    return 'No especificada';
                  })()}
                </p>
              </div>

              {/* Cliente */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cliente</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {selectedPriorityForView.clientId
                    ? (clients.find(c => c._id === selectedPriorityForView.clientId)?.name || 'No especificado')
                    : 'Sin cliente'}
                </p>
              </div>

              {/* Proyecto */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Proyecto</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {selectedPriorityForView.projectId
                    ? (projects.find(p => p._id === selectedPriorityForView.projectId)?.name || 'No especificado')
                    : 'Sin proyecto'}
                </p>
              </div>

              {/* Semana */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Semana</h3>
                <p className="text-gray-800 dark:text-gray-200">
                  {new Date(selectedPriorityForView.weekStart).toLocaleDateString('es-MX')} - {new Date(selectedPriorityForView.weekEnd).toLocaleDateString('es-MX')}
                </p>
              </div>

              {/* Estado y Progreso */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Estado</h3>
                  <StatusBadge status={selectedPriorityForView.status} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Progreso</h3>
                  <p className="text-gray-800 dark:text-gray-200">{selectedPriorityForView.completionPercentage}%</p>
                </div>
              </div>

              {/* Tipo */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tipo</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  (selectedPriorityForView.type || 'ESTRATEGICA') === 'ESTRATEGICA'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                    : 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200'
                }`}>
                  {(selectedPriorityForView.type || 'ESTRATEGICA') === 'ESTRATEGICA' ? 'Estratégica' : 'Operativa'}
                </span>
              </div>

              {/* Checklist */}
              {selectedPriorityForView.checklist && selectedPriorityForView.checklist.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Checklist ({selectedPriorityForView.checklist.filter(item => item.completed).length}/{selectedPriorityForView.checklist.length})
                  </h3>
                  <ul className="space-y-2">
                    {selectedPriorityForView.checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-lg">{item.completed ? '✅' : '⬜'}</span>
                        <span className={`flex-1 ${item.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6">
              <button
                onClick={() => setSelectedPriorityForView(null)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

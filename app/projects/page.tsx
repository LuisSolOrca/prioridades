'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProjectFormModal, { ProjectFormData } from '@/components/ProjectFormModal';

interface Project extends ProjectFormData {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      // Solo permitir acceso a administradores
      if ((session?.user as any)?.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, session]);

  const loadData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/users')
      ]);

      const [projectsData, usersData] = await Promise.all([
        projectsRes.json(),
        usersRes.json()
      ]);

      setProjects(projectsData.sort((a: Project, b: Project) => a.name.localeCompare(b.name)));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleData = async (projectId: string) => {
    try {
      const [milestonesRes, prioritiesRes] = await Promise.all([
        fetch('/api/milestones?forReports=true'),
        fetch('/api/priorities?forDashboard=true')
      ]);

      const [milestonesData, prioritiesData] = await Promise.all([
        milestonesRes.json(),
        prioritiesRes.json()
      ]);

      // Filtrar por proyecto
      const filteredMilestones = milestonesData.filter((m: any) => m.projectId === projectId);
      const filteredPriorities = prioritiesData.filter((p: any) => p.projectId === projectId);

      setMilestones(filteredMilestones);
      setPriorities(filteredPriorities);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const handleNew = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
      objectives: [],
      deliverables: [],
      stakeholders: [],
      risks: [],
      successCriteria: [],
      scope: {},
      budget: {},
      projectManager: {}
    });
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEdit = (project: Project) => {
    setFormData({
      name: project.name,
      description: project.description,
      isActive: project.isActive,
      purpose: project.purpose,
      objectives: project.objectives || [],
      scope: project.scope || {},
      deliverables: project.deliverables || [],
      requirements: project.requirements,
      assumptions: project.assumptions,
      constraints: project.constraints,
      stakeholders: project.stakeholders || [],
      risks: project.risks || [],
      budget: project.budget || {},
      successCriteria: project.successCriteria || [],
      projectManager: project.projectManager || {}
    });
    setEditingProject(project);
    setShowForm(true);
  };

  const handleViewSchedule = async (projectId: string) => {
    setSelectedProjectId(projectId);
    await loadScheduleData(projectId);
    setShowSchedule(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProject?._id) {
        const res = await fetch(`/api/projects/${editingProject._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error updating project');
        }
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error creating project');
        }
      }

      await loadData();
      setShowForm(false);
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        isActive: true
      });
    } catch (error: any) {
      console.error('Error saving project:', error);
      alert(error.message || 'Error al guardar el proyecto');
    }
  };

  const handleDelete = async () => {
    if (!editingProject?._id) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto?')) return;

    try {
      const res = await fetch(`/api/projects/${editingProject._id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error deleting project');
      }

      await loadData();
      setShowForm(false);
      setEditingProject(null);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert(error.message || 'Error al eliminar el proyecto');
    }
  };

  const toggleActive = async (project: Project) => {
    try {
      const res = await fetch(`/api/projects/${project._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, isActive: !project.isActive })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error updating project');
      }

      await loadData();
    } catch (error: any) {
      console.error('Error toggling active:', error);
      alert(error.message || 'Error al actualizar el proyecto');
    }
  };

  const getCompletionStats = (project: Project) => {
    const objectivesTotal = project.objectives?.length || 0;
    const objectivesComplete = project.objectives?.filter(o =>
      o.specific && o.measurable && o.achievable && o.relevant && o.timeBound
    ).length || 0;

    const deliverablesTotal = project.deliverables?.length || 0;
    const risksTotal = project.risks?.length || 0;
    const stakeholdersTotal = project.stakeholders?.length || 0;

    return {
      objectivesTotal,
      objectivesComplete,
      deliverablesTotal,
      risksTotal,
      stakeholdersTotal,
      hasPM: !!project.projectManager?.name || !!project.projectManager?.userId
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-4xl">📁</span>
              Gestión de Proyectos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Administra los proyectos con metodología PM BOOK
            </p>
          </div>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Nuevo Proyecto
          </button>
        </div>

        {/* Projects List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const stats = getCompletionStats(project);
            const pmUser = users.find(u => u._id === project.projectManager?.userId);

            return (
              <div
                key={project._id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition ${
                  !project.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(project)}
                        className={`text-sm px-2 py-1 rounded ${
                          project.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                        title={project.isActive ? 'Activo' : 'Inactivo'}
                      >
                        {project.isActive ? '●' : '○'}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-4">
                    {stats.objectivesTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Objetivos SMART:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {stats.objectivesComplete}/{stats.objectivesTotal}
                        </span>
                      </div>
                    )}
                    {stats.deliverablesTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Entregables:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {stats.deliverablesTotal}
                        </span>
                      </div>
                    )}
                    {stats.stakeholdersTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Stakeholders:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {stats.stakeholdersTotal}
                        </span>
                      </div>
                    )}
                    {stats.risksTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Riesgos:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {stats.risksTotal}
                        </span>
                      </div>
                    )}
                    {stats.hasPM && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Project Manager:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate ml-2">
                          {pmUser?.name || project.projectManager?.name}
                        </span>
                      </div>
                    )}
                    {project.budget?.estimated && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Presupuesto:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {project.budget.currency || 'USD'} {project.budget.estimated.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleViewSchedule(project._id)}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                    >
                      Cronograma
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              No hay proyectos
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Comienza creando tu primer proyecto
            </p>
            <button
              onClick={handleNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Crear Primer Proyecto
            </button>
          </div>
        )}
      </div>

      {/* Project Form Modal */}
      <ProjectFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProject(null);
        }}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSave}
        handleDelete={editingProject ? handleDelete : undefined}
        isEditing={!!editingProject}
        users={users}
        projectId={editingProject?._id}
        onViewSchedule={editingProject?._id ? () => {
          setShowForm(false);
          handleViewSchedule(editingProject._id);
        } : undefined}
      />

      {/* Schedule Modal */}
      {showSchedule && selectedProjectId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Cronograma del Proyecto
              </h2>
              <button
                onClick={() => {
                  setShowSchedule(false);
                  setSelectedProjectId(null);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Milestones Section */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💎</span>
                  Hitos ({milestones.length})
                </h3>
                {milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones
                      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                      .map((milestone) => {
                        const user = users.find(u => u._id === milestone.userId);
                        const dueDate = new Date(milestone.dueDate);
                        const isPast = dueDate < new Date() && !milestone.isCompleted;

                        return (
                          <div
                            key={milestone._id}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                                  {milestone.title}
                                </h4>
                                {milestone.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {milestone.description}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                milestone.isCompleted
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : isPast
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                              }`}>
                                {milestone.isCompleted ? 'Completado' : isPast ? 'Vencido' : 'Pendiente'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>👤 {user?.name}</span>
                              <span>📅 {dueDate.toLocaleDateString('es-MX')}</span>
                              {milestone.deliverables?.length > 0 && (
                                <span>
                                  📦 {milestone.deliverables.filter((d: any) => d.isCompleted).length}/{milestone.deliverables.length} entregables
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No hay hitos asociados a este proyecto
                  </p>
                )}
              </div>

              {/* Priorities Section */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Prioridades ({priorities.length})
                </h3>
                {priorities.length > 0 ? (
                  <div className="space-y-3">
                    {priorities
                      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
                      .map((priority) => {
                        const user = users.find(u => u._id === priority.userId);

                        return (
                          <div
                            key={priority._id}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                                  {priority.title}
                                </h4>
                                {priority.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {priority.description}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                priority.status === 'COMPLETADO'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : priority.status === 'EN_RIESGO'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                  : priority.status === 'BLOQUEADO'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              }`}>
                                {priority.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>👤 {user?.name}</span>
                              <span>📅 Semana {new Date(priority.weekStart).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</span>
                              <span>📊 {priority.completionPercentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No hay prioridades asociadas a este proyecto
                  </p>
                )}
              </div>

              {/* Info message */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> Los hitos y prioridades se asocian a proyectos desde sus respectivas páginas de gestión.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProjectFormModal, { ProjectFormData } from '@/components/ProjectFormModal';
import { usePermissions } from '@/hooks/usePermissions';

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
  const { hasPermission } = usePermissions();
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
      // Verificar permiso para gestionar proyectos
      if (!hasPermission('canManageProjects')) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, session, hasPermission]);

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

  const canEditProject = (project: Project | null): boolean => {
    if (!session || !session.user) return false;
    const user = session.user as any;

    // ADMIN puede editar todo
    if (user.role === 'ADMIN') return true;

    // Si no hay proyecto (nuevo), solo ADMIN puede crear
    if (!project) return false;

    // El Project Manager asignado puede editar su proyecto
    if (project.projectManager?.userId === user.id) return true;

    return false;
  };

  const handleNew = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
      objectives: [],
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

    const risksTotal = project.risks?.length || 0;
    const stakeholdersTotal = project.stakeholders?.length || 0;

    return {
      objectivesTotal,
      objectivesComplete,
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
          {canEditProject(null) && (
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Nuevo Proyecto
            </button>
          )}
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
        readOnly={!canEditProject(editingProject)}
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
              {(() => {
                // Combinar y ordenar todos los items
                const allItems = [
                  ...milestones.map((m: any) => ({
                    type: 'milestone',
                    title: m.title,
                    user: users.find(u => u._id === m.userId)?.name || 'N/A',
                    date: new Date(m.dueDate),
                    endDate: new Date(m.dueDate),
                    isCompleted: m.isCompleted,
                    deliverables: m.deliverables || [],
                    status: m.isCompleted ? 'completado' : 'pendiente'
                  })),
                  ...priorities.map((p: any) => ({
                    type: 'priority',
                    title: p.title,
                    user: users.find(u => u._id === p.userId)?.name || 'N/A',
                    date: new Date(p.weekStart),
                    endDate: new Date(p.weekEnd),
                    isCompleted: p.status === 'COMPLETADO',
                    status: p.status,
                    progress: p.completionPercentage
                  }))
                ].sort((a, b) => a.date.getTime() - b.date.getTime());

                if (allItems.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📊</div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        No hay elementos en el cronograma
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Asocia hitos y prioridades a este proyecto para verlos aquí
                      </p>
                    </div>
                  );
                }

                // Calcular rango de fechas
                const minDate = new Date(Math.min(...allItems.map(i => i.date.getTime())));
                const maxDate = new Date(Math.max(...allItems.map(i => i.endDate.getTime())));
                const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const today = new Date();

                return (
                  <div className="space-y-6">
                    {/* Header */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                        Diagrama de Gantt
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {milestones.length} hitos, {priorities.length} prioridades | Del {minDate.toLocaleDateString('es-MX')} al {maxDate.toLocaleDateString('es-MX')}
                      </p>
                    </div>

                    {/* Gantt Chart */}
                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        {/* Timeline header */}
                        <div className="flex border-b-2 border-gray-300 dark:border-gray-600 mb-4 pb-2">
                          <div className="w-64 flex-shrink-0 font-semibold text-gray-700 dark:text-gray-300">Elemento</div>
                          <div className="flex-1 relative">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                              {Array.from({ length: Math.min(daysDiff, 30) }, (_, i) => {
                                const date = new Date(minDate);
                                date.setDate(date.getDate() + Math.floor(i * daysDiff / 30));
                                return (
                                  <span key={i} className="text-center">
                                    {date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-3">
                          {allItems.map((item, idx) => {
                            const startPercent = ((item.date.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;
                            const duration = ((item.endDate.getTime() - item.date.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;
                            const isMilestone = item.type === 'milestone';
                            const totalDeliverables = isMilestone && 'deliverables' in item ? item.deliverables.length : 0;
                            const completedDeliverables = isMilestone && 'deliverables' in item ? item.deliverables.filter((d: any) => d.isCompleted).length : 0;

                            return (
                              <div key={idx} className="flex items-center group">
                                {/* Label */}
                                <div className="w-64 flex-shrink-0 pr-4">
                                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={item.title}>
                                    {isMilestone ? '💎' : '📋'} {item.title}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.user}
                                  </div>
                                </div>

                                {/* Bar */}
                                <div className="flex-1 relative h-10">
                                  {/* Background */}
                                  <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700/30 rounded"></div>

                                  {/* Timeline bar or diamond */}
                                  {isMilestone ? (
                                    // Milestone diamond
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 transform rotate-45 w-6 h-6 cursor-pointer"
                                      style={{ left: `${startPercent}%` }}
                                      title={`${item.title} - ${item.date.toLocaleDateString('es-MX')}\n${totalDeliverables > 0 ? `Entregables: ${completedDeliverables}/${totalDeliverables}` : ''}`}
                                    >
                                      <div className={`w-full h-full ${
                                        item.isCompleted
                                          ? 'bg-green-500 dark:bg-green-600'
                                          : item.date < today
                                          ? 'bg-red-500 dark:bg-red-600'
                                          : 'bg-orange-500 dark:bg-orange-600'
                                      } shadow-md group-hover:scale-110 transition`}></div>
                                    </div>
                                  ) : (
                                    // Priority bar
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer"
                                      style={{
                                        left: `${startPercent}%`,
                                        width: `${Math.max(duration, 2)}%`
                                      }}
                                      title={`${item.title}\n${item.date.toLocaleDateString('es-MX')} - ${item.endDate.toLocaleDateString('es-MX')}${!isMilestone && 'progress' in item ? `\nProgreso: ${item.progress}%` : ''}`}
                                    >
                                      <div className={`h-full rounded ${
                                        item.status === 'COMPLETADO'
                                          ? 'bg-green-500 dark:bg-green-600'
                                          : item.status === 'EN_RIESGO'
                                          ? 'bg-yellow-500 dark:bg-yellow-600'
                                          : item.status === 'BLOQUEADO'
                                          ? 'bg-red-500 dark:bg-red-600'
                                          : 'bg-blue-500 dark:bg-blue-600'
                                      } group-hover:opacity-80 transition`}></div>
                                      {/* Progress overlay */}
                                      {!isMilestone && 'progress' in item && item.progress < 100 && (
                                        <div className="absolute inset-0 flex items-center">
                                          <div
                                            className="h-full bg-opacity-30 bg-white dark:bg-gray-800 rounded-r"
                                            style={{ width: `${100 - item.progress}%`, marginLeft: `${item.progress}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 text-sm pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 transform rotate-45 bg-orange-500"></div>
                        <span className="text-gray-700 dark:text-gray-300">Hito Pendiente</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 transform rotate-45 bg-green-500"></div>
                        <span className="text-gray-700 dark:text-gray-300">Hito Completado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-3 rounded bg-blue-500"></div>
                        <span className="text-gray-700 dark:text-gray-300">Prioridad</span>
                      </div>
                    </div>

                    {/* Info message */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        💡 <strong>Tip:</strong> Los entregables están en los hitos (rombos 💎). Las barras representan prioridades con su duración.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import PriorityFormModal from '@/components/PriorityFormModal';
import CommentsSection from '@/components/CommentsSection';
import MilestoneNotifications from '@/components/MilestoneNotifications';
import MilestoneFormModal from '@/components/MilestoneFormModal';
import { getWeekDates, getWeekLabel } from '@/lib/utils';

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
  _id?: string;
  text: string;
  completed: boolean;
  completedHours?: number;
  createdAt?: string;
}

interface EvidenceLink {
  _id?: string;
  title: string;
  url: string;
  createdAt?: string;
}

interface Priority {
  _id?: string;
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
  evidenceLinks?: EvidenceLink[];
  isCarriedOver?: boolean;
}

interface WeekInfo {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  offset: number; // -2, -1, 0, 1
}

interface Deliverable {
  title: string;
  description?: string;
  isCompleted: boolean;
}

interface Milestone {
  _id?: string;
  title: string;
  description?: string;
  dueDate: string;
  deliverables: Deliverable[];
  isCompleted: boolean;
}

export default function PrioritiesGanttPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [selectedPriorityForView, setSelectedPriorityForView] = useState<Priority | null>(null);
  const [selectedPriorityForComments, setSelectedPriorityForComments] = useState<Priority | null>(null);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneFormData, setMilestoneFormData] = useState<any>({
    title: '',
    description: '',
    dueDate: '',
    deliverables: []
  });
  const [showFutureMilestonesModal, setShowFutureMilestonesModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session) {
      setupWeeks();
    }
  }, [status, session, router]);

  useEffect(() => {
    if (weeks.length > 0 && session) {
      loadData();
    }
  }, [weeks, session]);

  const setupWeeks = () => {
    const currentWeek = getWeekDates();
    const weeksData: WeekInfo[] = [];

    // 2 semanas antes
    for (let i = -2; i <= -1; i++) {
      const offsetDays = i * 7;
      const monday = new Date(currentWeek.monday);
      monday.setDate(monday.getDate() + offsetDays);
      const friday = new Date(currentWeek.friday);
      friday.setDate(friday.getDate() + offsetDays);

      weeksData.push({
        weekStart: monday,
        weekEnd: friday,
        label: getWeekLabel(monday),
        offset: i
      });
    }

    // Semana actual
    weeksData.push({
      weekStart: currentWeek.monday,
      weekEnd: currentWeek.friday,
      label: getWeekLabel(currentWeek.monday),
      offset: 0
    });

    // Semana siguiente
    const nextWeek = getWeekDates(new Date(currentWeek.monday.getTime() + 7 * 24 * 60 * 60 * 1000));
    weeksData.push({
      weekStart: nextWeek.monday,
      weekEnd: nextWeek.friday,
      label: getWeekLabel(nextWeek.monday),
      offset: 1
    });

    setWeeks(weeksData);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar prioridades de cada semana por separado
      const priorityPromises = weeks.map(week =>
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${week.weekStart.toISOString()}&weekEnd=${week.weekEnd.toISOString()}`)
          .then(res => res.json())
      );

      // Calcular rango de fechas para hitos
      const startDate = weeks[0].weekStart.toISOString();
      const endDate = weeks[weeks.length - 1].weekEnd.toISOString();

      const [initiativesRes, clientsRes, projectsRes, milestonesRes, ...weeklyPriorities] = await Promise.all([
        fetch('/api/initiatives?activeOnly=true'),
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/projects'),
        fetch(`/api/milestones?userId=${(session!.user as any).id}&startDate=${startDate}&endDate=${endDate}`),
        ...priorityPromises
      ]);

      const [initiativesData, clientsData, projectsData, milestonesData] = await Promise.all([
        initiativesRes.json(),
        clientsRes.json(),
        projectsRes.json(),
        milestonesRes.json()
      ]);

      // Combinar todas las prioridades de las 4 semanas
      const allPriorities = weeklyPriorities.flat().filter((p: any) => Array.isArray(p) ? false : p);

      setInitiatives(Array.isArray(initiativesData) ? initiativesData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setPriorities(allPriorities);
      setMilestones(Array.isArray(milestonesData) ? milestonesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (priority: Priority) => {
    // Prevenir edición de prioridades con estado final
    if (priority.status === 'COMPLETADO' || priority.status === 'REPROGRAMADO') {
      alert('No se puede editar una prioridad con estado final (Completado o Reprogramado)');
      return;
    }

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
    setShowEditForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !editingPriority) return;

    try {
      const res = await fetch(`/api/priorities/${editingPriority._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Error updating priority');

      await loadData();
      setShowEditForm(false);
      setEditingPriority(null);
      setFormData(null);
    } catch (error) {
      console.error('Error saving priority:', error);
      alert('Error al guardar la prioridad');
    }
  };

  const handleNewMilestone = () => {
    setMilestoneFormData({
      title: '',
      description: '',
      dueDate: '',
      deliverables: []
    });
    setEditingMilestone(null);
    setShowMilestoneForm(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setMilestoneFormData({
      title: milestone.title,
      description: milestone.description || '',
      dueDate: milestone.dueDate.split('T')[0],
      deliverables: milestone.deliverables
    });
    setEditingMilestone(milestone);
    setShowMilestoneForm(true);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!milestoneFormData.title || !milestoneFormData.dueDate) {
      alert('El título y la fecha son obligatorios');
      return;
    }

    try {
      if (editingMilestone?._id) {
        const res = await fetch(`/api/milestones/${editingMilestone._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(milestoneFormData)
        });

        if (!res.ok) throw new Error('Error updating milestone');
      } else {
        const res = await fetch('/api/milestones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(milestoneFormData)
        });

        if (!res.ok) throw new Error('Error creating milestone');
      }

      await loadData();
      setShowMilestoneForm(false);
      setEditingMilestone(null);
      setMilestoneFormData({ title: '', description: '', dueDate: '', deliverables: [] });
    } catch (error) {
      console.error('Error saving milestone:', error);
      alert('Error al guardar el hito');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este hito?')) return;

    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error deleting milestone');

      await loadData();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      alert('Error al eliminar el hito');
    }
  };

  const handleToggleMilestoneComplete = async (milestone: Milestone) => {
    try {
      const res = await fetch(`/api/milestones/${milestone._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !milestone.isCompleted })
      });

      if (!res.ok) throw new Error('Error updating milestone');

      await loadData();
    } catch (error) {
      console.error('Error updating milestone:', error);
      alert('Error al actualizar el hito');
    }
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

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              📊 Vista Gantt - Mis Prioridades
            </h1>
            <div className="flex space-x-3">
              <button
                onClick={handleNewMilestone}
                className="bg-orange-600 dark:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-700 dark:hover:bg-orange-600 transition"
                title="Crear nuevo hito"
              >
                💎 Nuevo Hito
              </button>
              <button
                onClick={() => router.push('/priorities-kanban')}
                className="bg-purple-600 dark:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 transition"
                title="Ver Vista Kanban"
              >
                📊 Vista Kanban
              </button>
              <button
                onClick={() => router.push('/priorities')}
                className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                title="Ver Lista"
              >
                📋 Vista Lista
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-200">
                  Vista de 4 semanas
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Mostrando {priorities.length} prioridades desde 2 semanas atrás hasta la siguiente semana
                </div>
              </div>
            </div>
          </div>

          {/* Gantt Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto overflow-y-visible">
            {/* Header con las semanas */}
            <div className="grid grid-cols-[1fr,repeat(4,120px),100px] border-b border-gray-200 dark:border-gray-700">
              <div className="p-3 font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 text-sm">
                Prioridad
              </div>
              {weeks.map((week, index) => (
                <div
                  key={index}
                  className={`p-3 text-center font-semibold border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                    week.offset === 0
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200'
                      : week.offset < 0
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200'
                  }`}
                >
                  <div className="text-xs font-bold">{week.label}</div>
                  <div className="text-[10px] mt-1">
                    {week.offset === -2 && '2 sem atrás'}
                    {week.offset === -1 && '1 sem atrás'}
                    {week.offset === 0 && 'Actual'}
                    {week.offset === 1 && 'Siguiente'}
                  </div>
                </div>
              ))}
              <div className="p-3 font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 text-center text-xs">
                Acciones
              </div>
            </div>

            {/* Fila de Hitos */}
            {milestones.length > 0 && (
              <div className="grid grid-cols-[1fr,repeat(4,120px),100px] border-b-2 border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10 relative">
                <div className="p-3 border-r border-gray-200 dark:border-gray-700 flex items-center">
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">💎 Hitos</span>
                </div>
                {weeks.map((week, weekIndex) => {
                  const weekMilestones = milestones.filter(m => {
                    const mDate = new Date(m.dueDate);
                    return mDate >= week.weekStart && mDate <= week.weekEnd;
                  });

                  return (
                    <div
                      key={weekIndex}
                      className="p-2 border-r border-gray-200 dark:border-gray-700 relative"
                    >
                      {weekMilestones.map((milestone) => (
                        <div
                          key={milestone._id}
                          className="relative cursor-pointer mb-1"
                          onClick={() => handleEditMilestone(milestone)}
                        >
                          {/* Rombo */}
                          <div
                            className={`w-6 h-6 mx-auto transform rotate-45 ${
                              milestone.isCompleted
                                ? 'bg-green-500 dark:bg-green-600'
                                : 'bg-orange-500 dark:bg-orange-600'
                            } shadow-md hover:scale-110 transition milestone-diamond`}
                            data-milestone-title={milestone.title}
                            data-milestone-description={milestone.description || ''}
                            data-milestone-date={new Date(milestone.dueDate).toLocaleDateString('es-MX')}
                            data-milestone-deliverables={`${milestone.deliverables.filter(d => d.isCompleted).length}/${milestone.deliverables.length}`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const tooltip = document.createElement('div');
                              tooltip.className = 'milestone-tooltip';
                              tooltip.style.cssText = `
                                position: fixed;
                                left: ${rect.left + rect.width / 2}px;
                                top: ${rect.top - 10}px;
                                transform: translate(-50%, -100%);
                                z-index: 9999;
                                width: 192px;
                                pointer-events: none;
                              `;
                              tooltip.innerHTML = `
                                <div class="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-2 shadow-2xl border border-gray-700 dark:border-gray-600">
                                  <div class="font-semibold mb-1">${milestone.title}</div>
                                  ${milestone.description ? `<div class="text-gray-300 dark:text-gray-400 mb-1 line-clamp-2">${milestone.description}</div>` : ''}
                                  <div class="text-gray-400 dark:text-gray-500">${new Date(milestone.dueDate).toLocaleDateString('es-MX')}</div>
                                  ${milestone.deliverables.length > 0 ? `<div class="mt-1 text-gray-400 dark:text-gray-500">${milestone.deliverables.filter(d => d.isCompleted).length}/${milestone.deliverables.length} entregables</div>` : ''}
                                </div>
                              `;
                              document.body.appendChild(tooltip);
                              e.currentTarget.dataset.tooltipId = String(Date.now());
                            }}
                            onMouseLeave={(e) => {
                              const tooltips = document.querySelectorAll('.milestone-tooltip');
                              tooltips.forEach(t => t.remove());
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className="p-2 flex items-center justify-center">
                  <button
                    onClick={() => setShowFutureMilestonesModal(true)}
                    className="text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-2 py-1 rounded transition text-xs font-medium"
                    title="Ver hitos futuros"
                  >
                    📅 Ver hitos
                  </button>
                </div>
              </div>
            )}

            {/* Filas de prioridades */}
            <div>
              {priorities.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No tienes prioridades en este rango de fechas
                  </p>
                </div>
              ) : (
                priorities.map(priority => {
                  const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
                  const priorityInitiatives = priorityInitiativeIds
                    .map(id => initiatives.find(i => i._id === id))
                    .filter((init): init is Initiative => init !== undefined);
                  const primaryInitiative = priorityInitiatives[0];

                  return (
                    <div
                      key={priority._id}
                      className="grid grid-cols-[1fr,repeat(4,120px),100px] border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      {/* Columna de información de la prioridad */}
                      <div className="p-3 border-r border-gray-200 dark:border-gray-700">
                        <div className="flex items-start space-x-2">
                          <div
                            className="w-1 rounded-full flex-shrink-0 self-stretch"
                            style={{ backgroundColor: primaryInitiative?.color || '#ccc' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs text-gray-800 dark:text-gray-100 mb-1 line-clamp-3" title={priority.title}>
                              {priority.title}
                            </div>
                            <div className="flex items-center gap-1 mb-2 flex-wrap">
                              <StatusBadge status={priority.status} />
                              {priority.type && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  priority.type === 'ESTRATEGICA'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                                    : 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200'
                                }`}>
                                  {priority.type === 'ESTRATEGICA' ? 'E' : 'O'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${priority.completionPercentage}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 min-w-[32px] text-right">
                                {priority.completionPercentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Columnas de semanas */}
                      {weeks.map((week, weekIndex) => {
                        const pWeekStart = new Date(priority.weekStart);
                        const isInThisWeek = pWeekStart >= week.weekStart && pWeekStart <= week.weekEnd;

                        return (
                          <div
                            key={weekIndex}
                            className={`p-2 border-r border-gray-200 dark:border-gray-700 ${
                              week.offset === 0
                                ? 'bg-blue-50/30 dark:bg-blue-900/10'
                                : week.offset < 0
                                ? 'bg-gray-50/50 dark:bg-gray-800/30'
                                : 'bg-green-50/30 dark:bg-green-900/10'
                            }`}
                          >
                            {isInThisWeek && (
                              <div
                                className="h-8 rounded flex items-center justify-center text-white text-[10px] font-semibold shadow-sm"
                                style={{ backgroundColor: primaryInitiative?.color || '#3b82f6' }}
                              >
                                {priority.completionPercentage}%
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Columna de acciones */}
                      <div className="p-2 flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setSelectedPriorityForComments(priority)}
                          className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 w-7 h-7 rounded transition text-sm"
                          title="Ver comentarios"
                        >
                          💬
                        </button>
                        {priority.status === 'COMPLETADO' || priority.status === 'REPROGRAMADO' ? (
                          <button
                            onClick={() => setSelectedPriorityForView(priority)}
                            className="text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 w-7 h-7 rounded transition text-sm"
                            title="Ver detalles"
                          >
                            🔍
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEdit(priority)}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 w-7 h-7 rounded transition text-sm"
                            title="Editar prioridad"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Leyenda */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              📌 Leyenda
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"></div>
                <span className="text-gray-600 dark:text-gray-400">Semanas pasadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"></div>
                <span className="text-gray-600 dark:text-gray-400">Semana actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"></div>
                <span className="text-gray-600 dark:text-gray-400">Semana siguiente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">E</span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200">O</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">Estratégica / Operativa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-4 h-4 transform rotate-45 bg-orange-500 dark:bg-orange-600"></div>
                  <div className="w-4 h-4 transform rotate-45 bg-green-500 dark:bg-green-600"></div>
                </div>
                <span className="text-gray-600 dark:text-gray-400">Hito pendiente / completado</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edición */}
      {showEditForm && editingPriority && (
        <PriorityFormModal
          isOpen={showEditForm}
          onClose={() => {
            setShowEditForm(false);
            setEditingPriority(null);
            setFormData(null);
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
            setClients([...clients, newClient]);
          }}
          projects={projects}
          onProjectCreated={(newProject) => {
            setProjects([...projects, newProject]);
          }}
          isEditing={true}
          weekLabel={editingPriority ? getWeekLabel(new Date(editingPriority.weekStart)) : ''}
        />
      )}

      {/* Modal de Comentarios */}
      {selectedPriorityForComments && selectedPriorityForComments._id && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPriorityForComments(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    {selectedPriorityForComments.title}
                  </h2>
                  {selectedPriorityForComments.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {selectedPriorityForComments.description}
                    </p>
                  )}
                  <StatusBadge status={selectedPriorityForComments.status} />
                </div>
                <button
                  onClick={() => setSelectedPriorityForComments(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold ml-4"
                >
                  ×
                </button>
              </div>

              <CommentsSection priorityId={selectedPriorityForComments._id} />

              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedPriorityForComments(null)}
                  className="bg-gray-600 dark:bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualización (Solo lectura) */}
      {selectedPriorityForView && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPriorityForView(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    {selectedPriorityForView.title}
                  </h2>
                  {selectedPriorityForView.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {selectedPriorityForView.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedPriorityForView.status} />
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPriorityForView(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold ml-4"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium">Porcentaje de Completado</span>
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{selectedPriorityForView.completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${selectedPriorityForView.completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Semana</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {new Date(selectedPriorityForView.weekStart).toLocaleDateString('es-MX')} - {new Date(selectedPriorityForView.weekEnd).toLocaleDateString('es-MX')}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Tipo</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    (selectedPriorityForView.type || 'ESTRATEGICA') === 'ESTRATEGICA'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                      : 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200'
                  }`}>
                    {(selectedPriorityForView.type || 'ESTRATEGICA') === 'ESTRATEGICA' ? 'Estratégica' : 'Operativa'}
                  </span>
                </div>
              </div>

              {selectedPriorityForView.checklist && selectedPriorityForView.checklist.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    ✓ Lista de Tareas
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({selectedPriorityForView.checklist.filter(item => item.completed).length}/{selectedPriorityForView.checklist.length})
                    </span>
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedPriorityForView.checklist.map((item, index) => (
                        <div
                          key={item._id || index}
                          className={`flex items-start gap-3 p-2 rounded ${
                            item.completed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            item.completed ? 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {item.completed && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm ${
                            item.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedPriorityForView.evidenceLinks && selectedPriorityForView.evidenceLinks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">🔗 Enlaces de Evidencia</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedPriorityForView.evidenceLinks.map((link, index) => (
                        <a
                          key={link._id || index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {link.title}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedPriorityForView(null)}
                  className="bg-gray-600 dark:bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Hitos */}
      {showMilestoneForm && (
        <MilestoneFormModal
          isOpen={showMilestoneForm}
          onClose={() => {
            setShowMilestoneForm(false);
            setEditingMilestone(null);
            setMilestoneFormData({ title: '', description: '', dueDate: '', deliverables: [] });
          }}
          formData={milestoneFormData}
          setFormData={setMilestoneFormData}
          handleSubmit={handleSaveMilestone}
          handleDelete={editingMilestone?._id ? () => {
            setShowMilestoneForm(false);
            handleDeleteMilestone(editingMilestone._id!);
          } : undefined}
          isEditing={!!editingMilestone}
        />
      )}

      {/* Notificaciones de Hitos */}
      <MilestoneNotifications />

      {/* Modal de Hitos Futuros */}
      {showFutureMilestonesModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFutureMilestonesModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="text-3xl">📅</span>
                Hitos Futuros
              </h2>
              <button
                onClick={() => setShowFutureMilestonesModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {milestones.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💎</div>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    No hay hitos registrados
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((milestone) => {
                      const dueDate = new Date(milestone.dueDate);
                      const now = new Date();
                      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isPast = daysUntil < 0;
                      const isToday = daysUntil === 0;
                      const isUpcoming = daysUntil > 0 && daysUntil <= 7;

                      const completedDeliverables = milestone.deliverables.filter(d => d.isCompleted).length;
                      const totalDeliverables = milestone.deliverables.length;

                      return (
                        <div
                          key={milestone._id}
                          className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition ${
                            milestone.isCompleted
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : isPast
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : isToday
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                              : isUpcoming
                              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                          }`}
                          onClick={() => {
                            setShowFutureMilestonesModal(false);
                            handleEditMilestone(milestone);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div
                                  className={`w-6 h-6 transform rotate-45 flex-shrink-0 ${
                                    milestone.isCompleted
                                      ? 'bg-green-500 dark:bg-green-600'
                                      : 'bg-orange-500 dark:bg-orange-600'
                                  }`}
                                />
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                                  {milestone.title}
                                </h3>
                                {milestone.isCompleted && (
                                  <span className="text-xs font-semibold px-2 py-1 rounded bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                                    ✓ Completado
                                  </span>
                                )}
                              </div>

                              {milestone.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 ml-9">
                                  {milestone.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 ml-9 text-sm">
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 dark:text-gray-400">📅</span>
                                  <span className={`font-medium ${
                                    isToday
                                      ? 'text-yellow-700 dark:text-yellow-400 font-bold'
                                      : isPast && !milestone.isCompleted
                                      ? 'text-red-700 dark:text-red-400'
                                      : isUpcoming
                                      ? 'text-orange-700 dark:text-orange-400'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {dueDate.toLocaleDateString('es-MX', {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  {isToday && (
                                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 ml-1">
                                      (HOY)
                                    </span>
                                  )}
                                  {!milestone.isCompleted && !isToday && (
                                    <span className={`text-xs ml-1 ${
                                      isPast
                                        ? 'text-red-600 dark:text-red-400'
                                        : isUpcoming
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      {isPast
                                        ? `(Venció hace ${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'día' : 'días'})`
                                        : `(En ${daysUntil} ${daysUntil === 1 ? 'día' : 'días'})`
                                      }
                                    </span>
                                  )}
                                </div>

                                {totalDeliverables > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500 dark:text-gray-400">📋</span>
                                    <span className={`font-medium ${
                                      completedDeliverables === totalDeliverables
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                      {completedDeliverables}/{totalDeliverables} entregables
                                    </span>
                                  </div>
                                )}
                              </div>

                              {totalDeliverables > 0 && (
                                <div className="mt-3 ml-9">
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        completedDeliverables === totalDeliverables
                                          ? 'bg-green-500 dark:bg-green-600'
                                          : 'bg-orange-500 dark:bg-orange-600'
                                      }`}
                                      style={{
                                        width: `${(completedDeliverables / totalDeliverables) * 100}%`
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <button
                  onClick={handleNewMilestone}
                  className="bg-orange-600 dark:bg-orange-700 text-white px-4 py-2 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition font-medium"
                >
                  💎 Crear Nuevo Hito
                </button>
                <button
                  onClick={() => setShowFutureMilestonesModal(false)}
                  className="bg-gray-600 dark:bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

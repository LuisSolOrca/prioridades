'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import CommentsSection from '@/components/CommentsSection';
import PriorityFormModal from '@/components/PriorityFormModal';
import MotivationalBanner from '@/components/MotivationalBanner';
import AzureSyncButton from '@/components/AzureSyncButton';
import IndividualSyncModal from '@/components/IndividualSyncModal';
import { getWeekDates, getWeekLabel } from '@/lib/utils';
import { exportPriorities } from '@/lib/exportToExcel';

interface Initiative {
  _id: string;
  name: string;
  color: string;
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
  _id?: string;
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
  checklist?: ChecklistItem[];
  evidenceLinks?: EvidenceLink[];
  wasEdited?: boolean;
  isCarriedOver?: boolean;
  azureDevOps?: {
    workItemId: number;
    workItemType: string;
    organization: string;
    project: string;
    lastSyncDate?: Date;
  } | null;
}

interface Workflow {
  _id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function PrioritiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentWeekMilestones, setCurrentWeekMilestones] = useState<any[]>([]);
  const [nextWeekMilestones, setNextWeekMilestones] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [formData, setFormData] = useState<Priority>({
    title: '',
    description: '',
    initiativeIds: [],
    completionPercentage: 0,
    status: 'EN_TIEMPO',
    type: 'ESTRATEGICA',
    userId: '',
    weekStart: '',
    weekEnd: '',
    checklist: [],
    evidenceLinks: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = current week, 1 = next week
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [selectedPriorityForComments, setSelectedPriorityForComments] = useState<Priority | null>(null);
  const [selectedPriorityForView, setSelectedPriorityForView] = useState<Priority | null>(null);
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  const [userStats, setUserStats] = useState<{
    points: number;
    currentStreak: number;
    longestStreak: number;
    badges: number;
    rank?: number;
  } | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState<string | null>(null);
  const [selectedPriorityForSync, setSelectedPriorityForSync] = useState<Priority | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const currentWeek = getWeekDates();
  const nextWeek = getWeekDates(new Date(currentWeek.monday.getTime() + 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session) {
      loadData();
      loadUserStats();
    }
  }, [status, session, router]);

  // Cerrar menú de workflows al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showWorkflowMenu && !target.closest('.relative')) {
        setShowWorkflowMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showWorkflowMenu]);

  const loadData = async () => {
    try {
      setLoading(true);

      const isAdmin = (session!.user as any)?.role === 'ADMIN';

      // Cargar prioridades de la semana actual y la siguiente, más los hitos de ambas semanas
      const promises = [
        fetch('/api/initiatives?activeOnly=true'),
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/projects'),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${currentWeek.monday.toISOString()}&weekEnd=${currentWeek.friday.toISOString()}`),
        fetch(`/api/priorities?userId=${(session!.user as any).id}&weekStart=${nextWeek.monday.toISOString()}&weekEnd=${nextWeek.friday.toISOString()}`),
        fetch('/api/workflows'),
        fetch(`/api/milestones?userId=${(session!.user as any).id}&startDate=${currentWeek.monday.toISOString()}&endDate=${currentWeek.friday.toISOString()}`),
        fetch(`/api/milestones?userId=${(session!.user as any).id}&startDate=${nextWeek.monday.toISOString()}&endDate=${nextWeek.friday.toISOString()}`)
      ];

      // Si es admin, cargar también la lista de usuarios
      if (isAdmin) {
        promises.push(fetch('/api/users'));
      }

      const responses = await Promise.all(promises);
      const [initiativesData, clientsData, projectsData, currentWeekPriorities, nextWeekPriorities, workflowsData, currentWeekMilestonesData, nextWeekMilestonesData, usersData] = await Promise.all(
        responses.map(r => r.json())
      );

      setInitiatives(Array.isArray(initiativesData) ? initiativesData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      // Combinar prioridades de ambas semanas
      const allPriorities = [
        ...(Array.isArray(currentWeekPriorities) ? currentWeekPriorities : []),
        ...(Array.isArray(nextWeekPriorities) ? nextWeekPriorities : [])
      ];
      setPriorities(allPriorities);
      setCurrentWeekMilestones(Array.isArray(currentWeekMilestonesData) ? currentWeekMilestonesData : []);
      setNextWeekMilestones(Array.isArray(nextWeekMilestonesData) ? nextWeekMilestonesData : []);

      // Filtrar solo workflows activos
      if (Array.isArray(workflowsData)) {
        const activeWorkflows = workflowsData.filter((w: Workflow) => w.isActive);
        setWorkflows(activeWorkflows);
      } else {
        setWorkflows([]);
      }

      // Si es admin, cargar usuarios
      if (isAdmin && usersData) {
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      // Cargar conteos de comentarios
      await loadCommentCounts(allPriorities);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentCounts = async (prioritiesToLoad: Priority[]) => {
    try {
      const priorityIds = prioritiesToLoad
        .filter(p => p._id)
        .map(p => p._id!)
        .join(',');

      if (!priorityIds) {
        setCommentCounts({});
        return;
      }

      const response = await fetch(`/api/comments/counts?priorityIds=${priorityIds}`);
      if (!response.ok) throw new Error('Error loading comment counts');

      const counts = await response.json();
      setCommentCounts(counts);
    } catch (error) {
      console.error('Error loading comment counts:', error);
      setCommentCounts({});
    }
  };

  const loadUserStats = async () => {
    try {
      if (!session?.user?.id) return;

      // Obtener badges
      const badgesRes = await fetch('/api/badges');
      const badges = await badgesRes.json();

      // Obtener datos del usuario (puntos y racha)
      const userRes = await fetch(`/api/users/${(session.user as any).id}`);
      const userData = await userRes.json();

      // Obtener leaderboard para saber el rank
      const leaderboardRes = await fetch('/api/leaderboard');
      const leaderboard = await leaderboardRes.json();
      const userRank = leaderboard.findIndex((entry: any) => entry.userId === (session.user as any).id) + 1;

      setUserStats({
        points: userData.gamification?.currentMonthPoints || 0,
        currentStreak: userData.gamification?.currentStreak || 0,
        longestStreak: userData.gamification?.longestStreak || 0,
        badges: Array.isArray(badges) ? badges.length : 0,
        rank: userRank > 0 ? userRank : undefined
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleNew = () => {
    const currentUserId = (session!.user as any).id;
    setFormData({
      title: '',
      description: '',
      initiativeIds: [],
      completionPercentage: 0,
      status: 'EN_TIEMPO',
      type: 'ESTRATEGICA',
      userId: currentUserId,
      weekStart: nextWeek.monday.toISOString(),
      weekEnd: nextWeek.friday.toISOString(),
      checklist: [],
      evidenceLinks: []
    });
    setSelectedUserId(currentUserId); // Establecer el usuario actual por defecto
    setSelectedWeekOffset(1); // Cambiar a siguiente semana por defecto
    setEditingPriority(null);
    setShowForm(true);
  };

  const handleEdit = (priority: Priority) => {
    // Prevenir edición de prioridades con estado final
    if (priority.status === 'COMPLETADO' || priority.status === 'REPROGRAMADO') {
      alert('No se puede editar una prioridad con estado final (Completado o Reprogramado)');
      return;
    }

    // Compatibilidad: convertir initiativeId a initiativeIds si existe
    // y agregar type por defecto si no existe (compatibilidad con prioridades antiguas)
    const editFormData = {
      ...priority,
      initiativeIds: priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []),
      type: priority.type || 'ESTRATEGICA'
    };

    setFormData(editFormData);
    setSelectedUserId(priority.userId); // Establecer el usuario de la prioridad
    setEditingPriority(priority);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir dobles clicks
    if (isSaving) return;

    // Validar que se haya seleccionado al menos una iniciativa
    if (!formData.initiativeIds || formData.initiativeIds.length === 0) {
      alert('Debes seleccionar al menos una iniciativa estratégica');
      return;
    }

    setIsSaving(true);
    try {
      // Incluir el userId del usuario seleccionado
      const dataToSave = {
        ...formData,
        userId: selectedUserId
      };

      if (editingPriority?._id) {
        // Update
        const res = await fetch(`/api/priorities/${editingPriority._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error updating priority');
        }
      } else {
        // Create
        const res = await fetch('/api/priorities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error creating priority');
        }
      }

      await loadData();
      setShowForm(false);
      setEditingPriority(null);
      setSelectedUserId('');
    } catch (error: any) {
      console.error('Error saving priority:', error);
      alert(error.message || 'Error al guardar la prioridad');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Buscar la prioridad para verificar su estado
    const priority = priorities.find(p => p._id === id);
    if (priority && (priority.status === 'COMPLETADO' || priority.status === 'REPROGRAMADO')) {
      alert('No se puede eliminar una prioridad con estado final (Completado o Reprogramado)');
      return;
    }

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

  const executeWorkflow = async (workflowId: string, workflowName: string, priorityId: string) => {
    try {
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorityId })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error ejecutando workflow');
      }

      const data = await res.json();
      const successActions = data.actionsExecuted.filter((a: any) => a.success).length;
      const failedActions = data.actionsExecuted.filter((a: any) => !a.success).length;

      alert(
        `✅ Workflow "${workflowName}" ejecutado\n\n` +
        `✓ Acciones exitosas: ${successActions}\n` +
        `${failedActions > 0 ? `✗ Acciones fallidas: ${failedActions}\n` : ''}`
      );

      setShowWorkflowMenu(null);
      await loadData();
    } catch (error: any) {
      alert(`Error ejecutando workflow: ${error.message}`);
    }
  };

  const handleExport = () => {
    const users = [{ _id: (session!.user as any).id, name: session!.user?.name || 'Usuario', email: session!.user?.email || '' }];
    const fileName = `Mis_Prioridades_${getWeekLabel(currentWeek.monday).replace(/\s/g, '_')}_y_Siguiente`;
    exportPriorities(priorities, users, initiatives, fileName);
  };

  const toggleWeekCollapse = (weekKey: string) => {
    setCollapsedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
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

  // Separar prioridades por semana
  const currentWeekPriorities = priorities.filter(p => {
    const pWeekStart = new Date(p.weekStart);
    return pWeekStart >= currentWeek.monday && pWeekStart <= currentWeek.friday;
  });

  const nextWeekPriorities = priorities.filter(p => {
    const pWeekStart = new Date(p.weekStart);
    return pWeekStart >= nextWeek.monday && pWeekStart <= nextWeek.friday;
  });

  const activePriorities = currentWeekPriorities.filter(p => p.status !== 'COMPLETADO' && p.status !== 'REPROGRAMADO');
  const hasMoreThanFive = activePriorities.length > 5;
  const currentWeekTotal = currentWeekPriorities.length;
  const nextWeekTotal = nextWeekPriorities.length;
  const currentWeekAtLimit = currentWeekTotal >= 10;
  const nextWeekAtLimit = nextWeekTotal >= 10;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              📋 Mis Prioridades
            </h1>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                className="bg-green-600 dark:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition"
                title="Exportar a Excel"
              >
                📥 Exportar a Excel
              </button>
              <button
                onClick={() => router.push('/priorities-gantt')}
                className="bg-orange-600 dark:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-700 dark:hover:bg-orange-600 transition"
                title="Ver Vista Gantt"
              >
                📊 Vista Gantt
              </button>
              <button
                onClick={() => router.push('/priorities-kanban')}
                className="bg-purple-600 dark:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 transition"
                title="Ver Vista Kanban"
              >
                📊 Vista Kanban
              </button>
              <button
                onClick={handleNew}
                className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition"
              >
                + Nueva Prioridad
              </button>
            </div>
          </div>

          {/* Motivational Banner */}
          {userStats && <MotivationalBanner userStats={userStats} compact />}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">ℹ️</span>
              <div className="flex-1">
                <div className="font-semibold text-blue-900 dark:text-blue-200">Semana actual: {getWeekLabel(currentWeek.monday)}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {currentWeekPriorities.length}/10 prioridades esta semana • {nextWeekPriorities.length}/10 prioridades siguiente semana
                </div>
                {currentWeekMilestones.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">💎</span>
                      <div>
                        <div className="font-semibold text-orange-700 dark:text-orange-300 text-sm">
                          {currentWeekMilestones.length} {currentWeekMilestones.length === 1 ? 'hito' : 'hitos'} esta semana
                        </div>
                        <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 space-y-1">
                          {currentWeekMilestones.map((milestone: any) => {
                            const completedDeliverables = milestone.deliverables?.filter((d: any) => d.isCompleted).length || 0;
                            const totalDeliverables = milestone.deliverables?.length || 0;
                            return (
                              <div key={milestone._id} className="flex items-center gap-2">
                                <span className={milestone.isCompleted ? 'line-through' : ''}>
                                  {milestone.title}
                                </span>
                                <span className="text-xs">
                                  ({new Date(milestone.dueDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })})
                                </span>
                                {totalDeliverables > 0 && (
                                  <span className="text-xs">
                                    • {completedDeliverables}/{totalDeliverables} entregables
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          💡 Considera crear prioridades para cumplir con estos hitos
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(currentWeekAtLimit || nextWeekAtLimit) && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-4 rounded-lg">
              <div className="flex items-start">
                <span className="text-red-600 dark:text-red-400 text-xl mr-3 mt-1">🚫</span>
                <div>
                  <h3 className="font-bold text-red-900 dark:text-red-200 mb-1">
                    Límite Alcanzado
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {currentWeekAtLimit && 'Has alcanzado el límite de 10 prioridades para la semana actual.'}
                    {currentWeekAtLimit && nextWeekAtLimit && ' '}
                    {nextWeekAtLimit && 'Has alcanzado el límite de 10 prioridades para la siguiente semana.'}
                    {' '}Para agregar una nueva prioridad, elimina alguna existente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasMoreThanFive && !currentWeekAtLimit && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg">
              <div className="flex items-start">
                <span className="text-yellow-600 dark:text-yellow-400 text-xl mr-3 mt-1">⚠️</span>
                <div>
                  <h3 className="font-bold text-yellow-900 dark:text-yellow-200 mb-1">
                    Advertencia: Más de 5 prioridades activas
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Tienes {activePriorities.length} prioridades activas esta semana (sin contar las completadas). Se recomienda mantener máximo 5 para asegurar el foco y cumplimiento. El límite máximo es de 10 prioridades por semana.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!showForm && (
            <div className="space-y-6">
              {/* Semana Actual */}
              <div>
                <div
                  className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition"
                  onClick={() => toggleWeekCollapse('current')}
                >
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                    <span className="mr-2">{collapsedWeeks.has('current') ? '▶' : '▼'}</span>
                    📅 Semana Actual ({getWeekLabel(currentWeek.monday)})
                    <span className="ml-3 text-sm font-normal text-gray-600 dark:text-gray-400">
                      {currentWeekPriorities.length} {currentWeekPriorities.length === 1 ? 'prioridad' : 'prioridades'}
                    </span>
                  </h2>
                </div>
                {!collapsedWeeks.has('current') && (
                  <div className="grid grid-cols-1 gap-4">
                    {currentWeekPriorities.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-500 dark:text-gray-400">No tienes prioridades esta semana</p>
                      </div>
                    ) : (
                    currentWeekPriorities.map(priority => {
                      // Obtener iniciativas (compatibilidad con ambos campos)
                      const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      const primaryInitiative = priorityInitiatives[0];

                      return (
                        <div key={priority._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: primaryInitiative?.color || '#ccc' }}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{priority.title}</h3>
                                {priority.isCarriedOver && (
                                  <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 text-xs px-2 py-1 rounded flex items-center gap-1">
                                    🔄 Traído de semana anterior
                                  </span>
                                )}
                                {priority.wasEdited && (
                                  <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 text-xs px-2 py-1 rounded">
                                    ✏️ Editado
                                  </span>
                                )}
                                {(priority as any).azureDevOps && (
                                  <>
                                    <a
                                      href={`https://dev.azure.com/${(priority as any).azureDevOps.organization}/${(priority as any).azureDevOps.project}/_workitems/edit/${(priority as any).azureDevOps.workItemId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                                      title={`Sincronizado con Azure DevOps (WI #${(priority as any).azureDevOps.workItemId})`}
                                    >
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M0 4.5v15l6.5 3.5v-3.5l-3-1.5v-13l3-1.5v-3.5l-6.5 3.5zm10.5-4.5v4.5l3 1.5v13l-3 1.5v4.5l6.5-3.5v-19l-6.5 3.5zm7 0v4.5l6.5 3.5v-8l-6.5 0z"/>
                                      </svg>
                                    </a>
                                    <AzureSyncButton
                                      priority={priority}
                                      onOpenModal={setSelectedPriorityForSync}
                                    />
                                  </>
                                )}
                              </div>
                              {priority.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{priority.description}</p>
                              )}
                              <div className="flex items-center flex-wrap gap-2 text-sm mb-2">
                                {priorityInitiatives.map(initiative => (
                                  <span key={initiative._id} className="inline-flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    <span style={{ color: initiative.color }}>●</span>
                                    <span className="text-gray-700 dark:text-gray-300">{initiative.name}</span>
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center space-x-4 text-sm">
                                <StatusBadge status={priority.status} />
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              {/* Botón de workflows */}
                              {workflows.length > 0 && priority.status !== 'COMPLETADO' && (
                                <div className="relative">
                                  <button
                                    onClick={() => setShowWorkflowMenu(showWorkflowMenu === priority._id ? null : priority._id!)}
                                    className="text-purple-600 hover:bg-purple-50 w-10 h-10 rounded-lg transition"
                                    title="Ejecutar workflow"
                                  >
                                    ⚡
                                  </button>
                                  {showWorkflowMenu === priority._id && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                                      <div className="p-2">
                                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                                          Ejecutar workflow:
                                        </div>
                                        {workflows.map((workflow) => (
                                          <button
                                            key={workflow._id}
                                            onClick={() => executeWorkflow(workflow._id, workflow.name, priority._id!)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                                          >
                                            {workflow.name}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <button
                                onClick={() => setSelectedPriorityForComments(priority)}
                                className="text-purple-600 hover:bg-purple-50 w-10 h-10 rounded-lg transition relative"
                                title="Ver comentarios"
                              >
                                💬
                                {priority._id && commentCounts[priority._id] > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ zIndex: 10 }}>
                                    {commentCounts[priority._id]}
                                  </span>
                                )}
                              </button>
                              {priority.status === 'COMPLETADO' || priority.status === 'REPROGRAMADO' ? (
                                <>
                                  <button
                                    onClick={() => setSelectedPriorityForView(priority)}
                                    className="text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 w-10 h-10 rounded-lg transition"
                                    title="Ver detalles"
                                  >
                                    🔍
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(priority)}
                                    className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 w-10 h-10 rounded-lg transition"
                                    title="Editar prioridad"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDelete(priority._id!)}
                                    className="text-red-600 hover:bg-red-50 w-10 h-10 rounded-lg transition"
                                    title="Eliminar prioridad"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <span className="font-medium">Porcentaje de Completado</span>
                                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{priority.completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                                <div
                                  className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                                  style={{ width: `${priority.completionPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Siguiente Semana */}
              <div>
                <div
                  className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition"
                  onClick={() => toggleWeekCollapse('next')}
                >
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                    <span className="mr-2">{collapsedWeeks.has('next') ? '▶' : '▼'}</span>
                    📅 Siguiente Semana ({getWeekLabel(nextWeek.monday)})
                    <span className="ml-3 text-sm font-normal text-gray-600 dark:text-gray-400">
                      {nextWeekPriorities.length} {nextWeekPriorities.length === 1 ? 'prioridad' : 'prioridades'}
                    </span>
                  </h2>
                </div>

                {!collapsedWeeks.has('next') && nextWeekMilestones.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">💎</span>
                      <div className="flex-1">
                        <div className="font-semibold text-green-900 dark:text-green-200 text-sm">
                          {nextWeekMilestones.length} {nextWeekMilestones.length === 1 ? 'hito' : 'hitos'} la siguiente semana
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1 space-y-1">
                          {nextWeekMilestones.map((milestone: any) => {
                            const completedDeliverables = milestone.deliverables?.filter((d: any) => d.isCompleted).length || 0;
                            const totalDeliverables = milestone.deliverables?.length || 0;
                            return (
                              <div key={milestone._id} className="flex items-center gap-2">
                                <span className={milestone.isCompleted ? 'line-through' : ''}>
                                  {milestone.title}
                                </span>
                                <span className="text-xs">
                                  ({new Date(milestone.dueDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })})
                                </span>
                                {totalDeliverables > 0 && (
                                  <span className="text-xs">
                                    • {completedDeliverables}/{totalDeliverables} entregables
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-400 mt-1">
                          💡 Planifica prioridades para cumplir con estos hitos
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!collapsedWeeks.has('next') && (
                  <div className="grid grid-cols-1 gap-4">
                    {nextWeekPriorities.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                        <div className="text-4xl mb-2">📋</div>
                        <p className="text-gray-500 dark:text-gray-400">No tienes prioridades planificadas para la siguiente semana</p>
                      </div>
                    ) : (
                    nextWeekPriorities.map(priority => {
                      // Obtener iniciativas (compatibilidad con ambos campos)
                      const priorityInitiativeIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      const primaryInitiative = priorityInitiatives[0];

                      return (
                        <div key={priority._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: primaryInitiative?.color || '#ccc' }}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{priority.title}</h3>
                                {priority.isCarriedOver && (
                                  <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 text-xs px-2 py-1 rounded flex items-center gap-1">
                                    🔄 Traído de semana anterior
                                  </span>
                                )}
                                {priority.wasEdited && (
                                  <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 text-xs px-2 py-1 rounded">
                                    ✏️ Editado
                                  </span>
                                )}
                                {(priority as any).azureDevOps && (
                                  <>
                                    <a
                                      href={`https://dev.azure.com/${(priority as any).azureDevOps.organization}/${(priority as any).azureDevOps.project}/_workitems/edit/${(priority as any).azureDevOps.workItemId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                                      title={`Sincronizado con Azure DevOps (WI #${(priority as any).azureDevOps.workItemId})`}
                                    >
                                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M0 4.5v15l6.5 3.5v-3.5l-3-1.5v-13l3-1.5v-3.5l-6.5 3.5zm10.5-4.5v4.5l3 1.5v13l-3 1.5v4.5l6.5-3.5v-19l-6.5 3.5zm7 0v4.5l6.5 3.5v-8l-6.5 0z"/>
                                      </svg>
                                    </a>
                                    <AzureSyncButton
                                      priority={priority}
                                      onOpenModal={setSelectedPriorityForSync}
                                    />
                                  </>
                                )}
                              </div>
                              {priority.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{priority.description}</p>
                              )}
                              <div className="flex items-center flex-wrap gap-2 text-sm mb-2">
                                {priorityInitiatives.map(initiative => (
                                  <span key={initiative._id} className="inline-flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    <span style={{ color: initiative.color }}>●</span>
                                    <span className="text-gray-700 dark:text-gray-300">{initiative.name}</span>
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center space-x-4 text-sm">
                                <StatusBadge status={priority.status} />
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              {/* Botón de workflows */}
                              {workflows.length > 0 && priority.status !== 'COMPLETADO' && (
                                <div className="relative">
                                  <button
                                    onClick={() => setShowWorkflowMenu(showWorkflowMenu === priority._id ? null : priority._id!)}
                                    className="text-purple-600 hover:bg-purple-50 w-10 h-10 rounded-lg transition"
                                    title="Ejecutar workflow"
                                  >
                                    ⚡
                                  </button>
                                  {showWorkflowMenu === priority._id && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                                      <div className="p-2">
                                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                                          Ejecutar workflow:
                                        </div>
                                        {workflows.map((workflow) => (
                                          <button
                                            key={workflow._id}
                                            onClick={() => executeWorkflow(workflow._id, workflow.name, priority._id!)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                                          >
                                            {workflow.name}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <button
                                onClick={() => setSelectedPriorityForComments(priority)}
                                className="text-purple-600 hover:bg-purple-50 w-10 h-10 rounded-lg transition relative"
                                title="Ver comentarios"
                              >
                                💬
                                {priority._id && commentCounts[priority._id] > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ zIndex: 10 }}>
                                    {commentCounts[priority._id]}
                                  </span>
                                )}
                              </button>
                              {priority.status === 'COMPLETADO' || priority.status === 'REPROGRAMADO' ? (
                                <>
                                  <button
                                    onClick={() => setSelectedPriorityForView(priority)}
                                    className="text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 w-10 h-10 rounded-lg transition"
                                    title="Ver detalles"
                                  >
                                    🔍
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(priority)}
                                    className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 w-10 h-10 rounded-lg transition"
                                    title="Editar prioridad"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDelete(priority._id!)}
                                    className="text-red-600 hover:bg-red-50 w-10 h-10 rounded-lg transition"
                                    title="Eliminar prioridad"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <span className="font-medium">Porcentaje de Completado</span>
                                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{priority.completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                                <div
                                  className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                                  style={{ width: `${priority.completionPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Formulario */}
      <PriorityFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPriority(null);
          setSelectedUserId('');
        }}
        formData={{
          title: formData.title,
          description: formData.description,
          initiativeIds: formData.initiativeIds || [],
          clientId: formData.clientId,
          projectId: formData.projectId,
          completionPercentage: formData.completionPercentage,
          status: formData.status,
          type: formData.type || 'ESTRATEGICA',
          checklist: formData.checklist || [],
          evidenceLinks: formData.evidenceLinks || [],
          weekStart: formData.weekStart,
          weekEnd: formData.weekEnd
        }}
        setFormData={(data) => setFormData({ ...formData, ...data })}
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
        isEditing={!!editingPriority}
        weekLabel={editingPriority
          ? getWeekLabel(new Date(formData.weekStart))
          : selectedWeekOffset === 0
            ? getWeekLabel(currentWeek.monday)
            : getWeekLabel(nextWeek.monday)
        }
        currentWeek={currentWeek}
        nextWeek={nextWeek}
        selectedWeekOffset={selectedWeekOffset}
        setSelectedWeekOffset={setSelectedWeekOffset}
        hasAzureDevOpsLink={!!(editingPriority?.azureDevOps)}
        allowUserReassignment={(session?.user as any)?.role === 'ADMIN'}
        users={users}
        selectedUserId={selectedUserId}
        onUserChange={setSelectedUserId}
      />

      {/* Modal de Comentarios */}
      {selectedPriorityForComments && selectedPriorityForComments._id && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedPriorityForComments(null);
            loadCommentCounts(priorities);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
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
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={selectedPriorityForComments.status} />
                    {(() => {
                      const priorityInitiativeIds = selectedPriorityForComments.initiativeIds ||
                        (selectedPriorityForComments.initiativeId ? [selectedPriorityForComments.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      return priorityInitiatives.map(initiative => (
                        <span key={initiative._id} className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center">
                          <span style={{ color: initiative.color }}>●</span> {initiative.name}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPriorityForComments(null);
                    loadCommentCounts(priorities);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold ml-4"
                >
                  ×
                </button>
              </div>

              {/* Comments Section */}
              <CommentsSection priorityId={selectedPriorityForComments._id} />

              {/* Close Button */}
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setSelectedPriorityForComments(null);
                    loadCommentCounts(priorities);
                  }}
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
              {/* Header */}
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
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={selectedPriorityForView.status} />
                    {(() => {
                      const priorityInitiativeIds = selectedPriorityForView.initiativeIds ||
                        (selectedPriorityForView.initiativeId ? [selectedPriorityForView.initiativeId] : []);
                      const priorityInitiatives = priorityInitiativeIds
                        .map(id => initiatives.find(i => i._id === id))
                        .filter((init): init is Initiative => init !== undefined);
                      return priorityInitiatives.map(initiative => (
                        <span key={initiative._id} className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center">
                          <span style={{ color: initiative.color }}>●</span> {initiative.name}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPriorityForView(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold ml-4"
                >
                  ×
                </button>
              </div>

              {/* Completion Percentage */}
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

              {/* Información adicional */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Usuario</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {session?.user?.name || 'Usuario actual'}
                  </p>
                </div>

                {selectedPriorityForView.clientId && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Cliente</h3>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {clients.find(c => c._id === selectedPriorityForView.clientId)?.name || 'No especificado'}
                    </p>
                  </div>
                )}

                {selectedPriorityForView.projectId && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Proyecto</h3>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {projects.find(p => p._id === selectedPriorityForView.projectId)?.name || 'No especificado'}
                    </p>
                  </div>
                )}

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

              {/* Checklist */}
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
                          <div className="flex-1">
                            <span className={`text-sm ${
                              item.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {item.text}
                            </span>
                            {item.completed && item.completedHours && (
                              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                ⏱️ {item.completedHours} hrs trabajadas
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence Links */}
              {selectedPriorityForView.evidenceLinks && selectedPriorityForView.evidenceLinks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">🔗 Enlaces de Evidencia</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedPriorityForView.evidenceLinks.map((link, index) => (
                        <div key={link._id || index} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {link.title}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
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

      {/* Modal de sincronización individual */}
      {selectedPriorityForSync && (
        <IndividualSyncModal
          priority={selectedPriorityForSync}
          onClose={() => setSelectedPriorityForSync(null)}
          onSyncComplete={loadData}
        />
      )}
    </div>
  );
}

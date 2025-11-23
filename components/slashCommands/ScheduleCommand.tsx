'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, XCircle, ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';

interface Milestone {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  isCompleted: boolean;
  deliverables: Array<{
    title: string;
    isCompleted: boolean;
  }>;
}

interface Project {
  _id: string;
  name: string;
  milestones: Milestone[];
}

interface ScheduleCommandProps {
  projectId: string;
  view?: 'week' | 'month';
  onClose: () => void;
}

export default function ScheduleCommand({ projectId, view = 'month', onClose }: ScheduleCommandProps) {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<'week' | 'month'>(view);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadSchedule();
  }, [projectId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);

      if (!response.ok) {
        throw new Error('Error al cargar calendario');
      }

      const data = await response.json();
      setProject(data);
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMilestoneStatus = (milestone: Milestone) => {
    const dueDate = new Date(milestone.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (milestone.isCompleted) {
      return { status: 'completed', label: 'Completado', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' };
    } else if (dueDate < today) {
      return { status: 'overdue', label: 'Vencido', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' };
    } else if (dueDate.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000) {
      return { status: 'upcoming', label: 'Próximo', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' };
    } else {
      return { status: 'future', label: 'Planificado', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
    }
  };

  const filterMilestones = (milestones: Milestone[]) => {
    if (!milestones || milestones.length === 0) return [];

    const today = new Date();
    const filtered = milestones.filter(m => {
      const dueDate = new Date(m.dueDate);

      if (currentView === 'week') {
        // Próximos 7 días
        const weekFromNow = new Date(today);
        weekFromNow.setDate(today.getDate() + 7);
        return dueDate >= today || (dueDate < today && !m.isCompleted);
      } else {
        // Próximos 30 días
        const monthFromNow = new Date(today);
        monthFromNow.setDate(today.getDate() + 30);
        return dueDate >= today || (dueDate < today && !m.isCompleted);
      }
    });

    // Ordenar por fecha
    return filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    if (diffDays > 0 && diffDays <= 7) return `En ${diffDays} días`;
    if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`;

    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const milestones = project?.milestones || [];
  const filteredMilestones = filterMilestones(milestones);

  // Estadísticas
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.isCompleted).length;
  const overdueMilestones = milestones.filter(m => {
    const dueDate = new Date(m.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !m.isCompleted && dueDate < today;
  }).length;
  const upcomingMilestones = filteredMilestones.filter(m => {
    const status = getMilestoneStatus(m);
    return status.status === 'upcoming';
  }).length;

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-cyan-300 dark:border-cyan-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
            <CalendarDays className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
              Calendario de Hitos
              <Calendar className="text-cyan-600 dark:text-cyan-400" size={16} />
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {project?.name}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center">
          <Calendar className="animate-pulse mx-auto mb-3 text-cyan-600" size={48} />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Cargando calendario...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Vista Toggle */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('week')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  currentView === 'week'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setCurrentView('month')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  currentView === 'month'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                Mensual
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {currentView === 'week' ? 'Próximos 7 días' : 'Próximos 30 días'}
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
              <CalendarDays className="mx-auto mb-1 text-cyan-600 dark:text-cyan-400" size={20} />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalMilestones}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Hitos</div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
              <CheckCircle2 className="mx-auto mb-1 text-green-600 dark:text-green-400" size={20} />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{completedMilestones}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Completados</div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
              <AlertCircle className="mx-auto mb-1 text-yellow-600 dark:text-yellow-400" size={20} />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{upcomingMilestones}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Próximos</div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
              <XCircle className="mx-auto mb-1 text-red-600 dark:text-red-400" size={20} />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{overdueMilestones}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Vencidos</div>
            </div>
          </div>

          {/* Timeline de Hitos */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-cyan-600 dark:text-cyan-400" />
              {currentView === 'week' ? 'Esta Semana' : 'Este Mes'}
            </h4>

            {filteredMilestones.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="mx-auto mb-3 text-gray-400" size={48} />
                <p className="text-gray-600 dark:text-gray-400">
                  No hay hitos programados para este período
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMilestones.map((milestone, index) => {
                  const status = getMilestoneStatus(milestone);
                  const completedDeliverables = milestone.deliverables?.filter(d => d.isCompleted).length || 0;
                  const totalDeliverables = milestone.deliverables?.length || 0;

                  return (
                    <div key={milestone._id} className="relative">
                      {/* Timeline line */}
                      {index < filteredMilestones.length - 1 && (
                        <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600 -mb-4"></div>
                      )}

                      <div className="flex gap-4">
                        {/* Timeline dot */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${status.bgColor}`}>
                          {milestone.isCompleted ? (
                            <CheckCircle2 className={status.color} size={20} />
                          ) : status.status === 'overdue' ? (
                            <XCircle className={status.color} size={20} />
                          ) : (
                            <Clock className={status.color} size={20} />
                          )}
                        </div>

                        {/* Milestone card */}
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                {milestone.title}
                              </h5>
                              {milestone.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {milestone.description}
                                </p>
                              )}
                            </div>
                            <span className={`ml-2 text-xs px-2 py-1 rounded-full flex-shrink-0 ${status.bgColor} ${status.color} font-medium`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Calendar size={14} />
                              <span className="font-medium">
                                {new Date(milestone.dueDate).toLocaleDateString('es-MX', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-xs">({getRelativeTime(milestone.dueDate)})</span>
                            </div>

                            {totalDeliverables > 0 && (
                              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                <CheckCircle2 size={14} />
                                <span>
                                  {completedDeliverables}/{totalDeliverables} entregables
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Progress bar para deliverables */}
                          {totalDeliverables > 0 && (
                            <div className="mt-3">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    milestone.isCompleted
                                      ? 'bg-green-500'
                                      : status.status === 'overdue'
                                      ? 'bg-red-500'
                                      : 'bg-cyan-500'
                                  }`}
                                  style={{ width: `${totalDeliverables > 0 ? (completedDeliverables / totalDeliverables) * 100 : 0}%` }}
                                ></div>
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
          </div>

          {/* Consejo */}
          {overdueMilestones > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                ⚠️ <strong>Atención:</strong> Tienes {overdueMilestones} hito{overdueMilestones > 1 ? 's' : ''} vencido{overdueMilestones > 1 ? 's' : ''}. Considera reprogramar o marcar como completado{overdueMilestones > 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/schedule {currentView}</code>
      </div>
    </div>
  );
}

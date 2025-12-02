'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ActivityModal from '@/components/crm/ActivityModal';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Users,
  FileText,
  CheckSquare,
  Clock,
  Calendar,
  Building2,
  Briefcase,
  User,
  Check,
  Filter,
  X,
  MessageSquare,
} from 'lucide-react';

interface Activity {
  _id: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task' | 'channel_message';
  title: string;
  description?: string;
  clientId?: { _id: string; name: string };
  contactId?: { _id: string; firstName: string; lastName: string };
  dealId?: { _id: string; title: string; value: number };
  dueDate?: string;
  completedAt?: string;
  isCompleted: boolean;
  duration?: number;
  outcome?: string;
  createdBy: { _id: string; name: string };
  assignedTo?: { _id: string; name: string };
  createdAt: string;
}

interface UserOption {
  _id: string;
  name: string;
}

const ACTIVITY_CONFIG = {
  note: {
    label: 'Nota',
    icon: FileText,
    color: '#6b7280',
    bgLight: 'bg-slate-100',
    bgDark: 'dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-700 dark:text-slate-300'
  },
  call: {
    label: 'Llamada',
    icon: Phone,
    color: '#3b82f6',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-700 dark:text-blue-300'
  },
  email: {
    label: 'Email',
    icon: Mail,
    color: '#8b5cf6',
    bgLight: 'bg-violet-50',
    bgDark: 'dark:bg-violet-900/30',
    border: 'border-violet-300 dark:border-violet-700',
    text: 'text-violet-700 dark:text-violet-300'
  },
  meeting: {
    label: 'Reunion',
    icon: Users,
    color: '#10b981',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-900/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-300'
  },
  task: {
    label: 'Tarea',
    icon: CheckSquare,
    color: '#f59e0b',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300'
  },
  channel_message: {
    label: 'Mensaje',
    icon: MessageSquare,
    color: '#ec4899',
    bgLight: 'bg-pink-50',
    bgDark: 'dark:bg-pink-900/30',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-700 dark:text-pink-300'
  },
};

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export default function CrmCalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.viewCRM) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, permissions.viewCRM, permissionsLoading]);

  useEffect(() => {
    if (status === 'authenticated' && permissions.viewCRM) {
      loadActivities();
    }
  }, [currentDate, typeFilter, assignedToFilter, showCompletedTasks]);

  const loadData = async () => {
    await Promise.all([loadActivities(), loadUsers()]);
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users?activeOnly=true');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);

      // Get month range
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      // Also include a week before and after for calendar display
      const startDate = new Date(startOfMonth);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(endOfMonth);
      endDate.setDate(endDate.getDate() + 7);

      const params = new URLSearchParams();
      params.set('startDate', startDate.toISOString());
      params.set('endDate', endDate.toISOString());
      params.set('limit', '500');

      if (typeFilter.length > 0) {
        params.set('types', typeFilter.join(','));
      }
      if (assignedToFilter) {
        params.set('assignedTo', assignedToFilter);
      }

      const res = await fetch('/api/crm/activities/calendar?' + params.toString());
      let data = await res.json();

      if (!Array.isArray(data)) data = [];

      // Filter completed tasks if needed
      if (!showCompletedTasks) {
        data = data.filter((a: Activity) => !(a.type === 'task' && a.isCompleted));
      }

      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    try {
      await fetch('/api/crm/activities/' + activityId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: true, completedAt: new Date().toISOString() }),
      });
      loadActivities();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days (fill to 42 for 6 weeks)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const grouped: { [key: string]: Activity[] } = {};

    activities.forEach(activity => {
      // Use dueDate for tasks, createdAt for others
      const dateStr = activity.type === 'task' && activity.dueDate
        ? new Date(activity.dueDate).toDateString()
        : new Date(activity.createdAt).toDateString();

      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(activity);
    });

    return grouped;
  }, [activities]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilter(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setTypeFilter([]);
    setAssignedToFilter('');
    setShowCompletedTasks(true);
  };

  const hasActiveFilters = typeFilter.length > 0 || assignedToFilter || !showCompletedTasks;

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  if (status === 'loading' || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/25">
                <Calendar size={24} />
              </div>
              Calendario de Actividades
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Vista mensual de todas las actividades del CRM
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                hasActiveFilters
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Filter size={18} />
              Filtros
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {typeFilter.length + (assignedToFilter ? 1 : 0) + (!showCompletedTasks ? 1 : 0)}
                </span>
              )}
            </button>

            {/* New Activity Button */}
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 font-medium"
            >
              <Plus size={20} />
              Nueva Actividad
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Filtros</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <X size={14} />
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de actividad
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => {
                    const Icon = config.icon;
                    const isSelected = typeFilter.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleTypeFilter(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? `${config.bgLight} ${config.bgDark} ${config.border} border-2`
                            : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <Icon size={14} style={{ color: config.color }} />
                        <span className={isSelected ? config.text : 'text-gray-600 dark:text-gray-300'}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Asignado a
                </label>
                <select
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todos los vendedores</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.name}</option>
                  ))}
                </select>
              </div>

              {/* Show Completed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Opciones
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCompletedTasks}
                    onChange={(e) => setShowCompletedTasks(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Mostrar tareas completadas</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
              >
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
              >
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 ml-2">
                {MONTHS_ES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
            </div>

            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
            >
              Hoy
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Days Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS_ES.map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  const dayActivities = activitiesByDate[day.date.toDateString()] || [];
                  const isCurrentDay = isToday(day.date);

                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(day.date)}
                      className={`min-h-[120px] p-2 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                        day.isCurrentMonth
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                          : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-50'
                      } ${isCurrentDay ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
                    >
                      {/* Date Number */}
                      <div className={`text-sm font-semibold mb-1 ${
                        isCurrentDay
                          ? 'text-blue-600 dark:text-blue-400'
                          : day.isCurrentMonth
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {day.date.getDate()}
                        {isCurrentDay && (
                          <span className="ml-1 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                            Hoy
                          </span>
                        )}
                      </div>

                      {/* Activities */}
                      <div className="space-y-1 overflow-hidden">
                        {dayActivities.slice(0, 3).map(activity => {
                          const config = ACTIVITY_CONFIG[activity.type];
                          const Icon = config.icon;
                          const isOverdue = activity.type === 'task' && !activity.isCompleted &&
                            activity.dueDate && new Date(activity.dueDate) < new Date();

                          return (
                            <div
                              key={activity._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedActivity(activity);
                              }}
                              className={`group flex items-center gap-1.5 p-1.5 rounded-lg text-xs font-medium truncate transition-all hover:scale-[1.02] ${config.bgLight} ${config.bgDark} ${
                                isOverdue ? 'ring-1 ring-red-400' : ''
                              } ${activity.isCompleted ? 'opacity-60' : ''}`}
                            >
                              <Icon size={12} style={{ color: config.color }} className="flex-shrink-0" />
                              <span className={`truncate ${config.text}`}>
                                {activity.title}
                              </span>
                              {activity.type === 'task' && !activity.isCompleted && (
                                <button
                                  onClick={(e) => handleCompleteTask(e, activity._id)}
                                  className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-all"
                                >
                                  <Check size={12} className="text-emerald-600" />
                                </button>
                              )}
                              {activity.isCompleted && (
                                <Check size={12} className="ml-auto text-emerald-500 flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                        {dayActivities.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium pl-1">
                            +{dayActivities.length - 3} mas
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`p-1 rounded ${config.bgLight} ${config.bgDark}`}>
                      <Icon size={12} style={{ color: config.color }} />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity Detail Modal */}
        {selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${ACTIVITY_CONFIG[selectedActivity.type].bgLight} ${ACTIVITY_CONFIG[selectedActivity.type].bgDark}`}>
                    {(() => {
                      const Icon = ACTIVITY_CONFIG[selectedActivity.type].icon;
                      return <Icon size={24} style={{ color: ACTIVITY_CONFIG[selectedActivity.type].color }} />;
                    })()}
                  </div>
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${ACTIVITY_CONFIG[selectedActivity.type].text}`}>
                      {ACTIVITY_CONFIG[selectedActivity.type].label}
                    </span>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {selectedActivity.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {selectedActivity.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {selectedActivity.description}
                </p>
              )}

              <div className="space-y-3 text-sm">
                {/* Deal */}
                {selectedActivity.dealId && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <Briefcase size={16} className="text-emerald-600" />
                    <span className="text-gray-600 dark:text-gray-400">Deal:</span>
                    <Link
                      href={`/crm/deals/${selectedActivity.dealId._id}`}
                      className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {selectedActivity.dealId.title}
                    </Link>
                    {selectedActivity.dealId.value > 0 && (
                      <span className="ml-auto font-semibold text-emerald-700 dark:text-emerald-300">
                        ${selectedActivity.dealId.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Client */}
                {selectedActivity.clientId && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Building2 size={16} className="text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                    <Link
                      href={`/crm/clients/${selectedActivity.clientId._id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selectedActivity.clientId.name}
                    </Link>
                  </div>
                )}

                {/* Contact */}
                {selectedActivity.contactId && (
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <User size={16} className="text-purple-600" />
                    <span className="text-gray-600 dark:text-gray-400">Contacto:</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {selectedActivity.contactId.firstName} {selectedActivity.contactId.lastName}
                    </span>
                  </div>
                )}

                {/* Assigned To */}
                {selectedActivity.assignedTo && (
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Asignado a:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedActivity.assignedTo.name}
                    </span>
                  </div>
                )}

                {/* Due Date */}
                {selectedActivity.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Fecha limite:</span>
                    <span className={`font-medium ${
                      new Date(selectedActivity.dueDate) < new Date() && !selectedActivity.isCompleted
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {new Date(selectedActivity.dueDate).toLocaleDateString('es-MX', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>
                )}

                {/* Duration */}
                {selectedActivity.duration && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Duracion:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedActivity.duration} minutos
                    </span>
                  </div>
                )}

                {/* Status for tasks */}
                {selectedActivity.type === 'task' && (
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Estado:</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                      selectedActivity.isCompleted
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    }`}>
                      {selectedActivity.isCompleted ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                )}

                {/* Created By */}
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Creado por {selectedActivity.createdBy?.name}</span>
                  <span>-</span>
                  <span>
                    {new Date(selectedActivity.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {selectedActivity.type === 'task' && !selectedActivity.isCompleted && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={(e) => {
                      handleCompleteTask(e, selectedActivity._id);
                      setSelectedActivity(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Check size={20} />
                    Marcar como completada
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity Modal */}
      <ActivityModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedDate(null);
        }}
        onSuccess={() => {
          loadActivities();
          setShowModal(false);
          setSelectedDate(null);
        }}
      />
    </div>
  );
}

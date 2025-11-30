'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ActivityModal from '@/components/crm/ActivityModal';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Loader2,
  Plus,
  Search,
  Filter,
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
  ArrowRight,
  MessageSquare,
  Trash2
} from 'lucide-react';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

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

const ACTIVITY_CONFIG = {
  note: { label: 'Nota', icon: FileText, color: '#6b7280', bg: 'bg-gray-100 dark:bg-gray-700' },
  call: { label: 'Llamada', icon: Phone, color: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  email: { label: 'Email', icon: Mail, color: '#8b5cf6', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  meeting: { label: 'Reunion', icon: Users, color: '#10b981', bg: 'bg-green-100 dark:bg-green-900/30' },
  task: { label: 'Tarea', icon: CheckSquare, color: '#f59e0b', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  channel_message: { label: 'Mensaje', icon: MessageSquare, color: '#ec4899', bg: 'bg-pink-100 dark:bg-pink-900/30' },
};

export default function ActivitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<any>('note');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    // Wait for permissions to load before checking access
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.viewCRM) {
        router.push('/dashboard');
        return;
      }
      loadActivities();
    }
  }, [status, router, permissions.viewCRM, permissionsLoading]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (showPendingOnly) params.set('pendingOnly', 'true');
      params.set('limit', '100');

      const res = await fetch('/api/crm/activities?' + params.toString());
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && permissions.viewCRM) {
      loadActivities();
    }
  }, [typeFilter, showPendingOnly]);

  const handleCompleteTask = async (activityId: string) => {
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

  const handleDeleteActivity = async (activityId: string, activityTitle: string) => {
    if (!confirm(`¿Estás seguro de eliminar la actividad "${activityTitle}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetch('/api/crm/activities/' + activityId, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al eliminar la actividad');
        return;
      }
      loadActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Error al eliminar la actividad');
    }
  };

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(search.toLowerCase()) ||
    activity.clientId?.name?.toLowerCase().includes(search.toLowerCase()) ||
    activity.dealId?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingTasks = activities.filter(a => a.type === 'task' && !a.isCompleted);
  const todayActivities = activities.filter(a => {
    const today = new Date().toDateString();
    return new Date(a.createdAt).toDateString() === today;
  });

  const openModalWithType = (type: any) => {
    setSelectedType(type);
    setShowModal(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Hoy ' + date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer ' + date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return date.toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Clock className="text-blue-500" />
              Actividades
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {todayActivities.length} actividades hoy | {pendingTasks.length} tareas pendientes
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar actividades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus size={20} />
              Nueva Actividad
            </button>
          </div>
        </div>

        {/* Help Card */}
        <CrmHelpCard
          id="crm-activities-guide"
          title="Registro de actividades comerciales"
          variant="tip"
          className="mb-4"
          defaultCollapsed={true}
          tips={[
            'Registra notas, llamadas, emails y reuniones para documentar el seguimiento',
            'Las tareas te ayudan a planificar y no olvidar pendientes importantes',
            'Asocia actividades a clientes, contactos o deals para mantener el contexto',
            'Usa los botones rápidos arriba para crear actividades de cada tipo',
          ]}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {Object.entries(ACTIVITY_CONFIG).filter(([key]) => key !== 'channel_message').map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => openModalWithType(type)}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition"
              >
                <div className={'p-2 rounded-lg ' + config.bg}>
                  <Icon size={20} style={{ color: config.color }} />
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => (
              <option key={type} value={type}>{config.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showPendingOnly}
              onChange={(e) => setShowPendingOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Solo pendientes</span>
          </label>
        </div>

        {/* Activities List */}
        <div className="space-y-3">
          {filteredActivities.map(activity => {
            const config = ACTIVITY_CONFIG[activity.type];
            const Icon = config.icon;
            const isOverdue = activity.type === 'task' && !activity.isCompleted && activity.dueDate && new Date(activity.dueDate) < new Date();

            return (
              <div
                key={activity._id}
                className={'bg-white dark:bg-gray-800 rounded-lg border p-4 transition ' +
                  (isOverdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700')}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={'p-2 rounded-lg flex-shrink-0 ' + config.bg}>
                    <Icon size={20} style={{ color: config.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-100">
                          {activity.title}
                        </h3>
                        {activity.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                      </div>

                      {/* Task completion */}
                      <div className="flex items-center gap-1">
                        {activity.type === 'task' && !activity.isCompleted && (
                          <button
                            onClick={() => handleCompleteTask(activity._id)}
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
                            title="Marcar como completada"
                          >
                            <Check size={20} />
                          </button>
                        )}
                        {activity.type === 'task' && activity.isCompleted && (
                          <span className="flex-shrink-0 p-2 text-green-600">
                            <Check size={20} />
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteActivity(activity._id, activity.title)}
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                            title="Eliminar actividad"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Associations */}
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      {activity.clientId && (
                        <Link
                          href={'/crm/clients/' + activity.clientId._id}
                          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Building2 size={14} />
                          {activity.clientId.name}
                        </Link>
                      )}
                      {activity.dealId && (
                        <Link
                          href={'/crm/deals/' + activity.dealId._id}
                          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <Briefcase size={14} />
                          {activity.dealId.title}
                        </Link>
                      )}
                      {activity.contactId && (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <User size={14} />
                          {activity.contactId.firstName} {activity.contactId.lastName}
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(activity.createdAt)}</span>
                      <span>por {activity.createdBy?.name}</span>
                      {activity.duration && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {activity.duration} min
                        </span>
                      )}
                      {activity.dueDate && (
                        <span className={'flex items-center gap-1 ' + (isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : '')}>
                          <Calendar size={12} />
                          Vence: {new Date(activity.dueDate).toLocaleDateString('es-MX')}
                        </span>
                      )}
                      {activity.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          Asignado a: {activity.assignedTo.name}
                        </span>
                      )}
                      {activity.outcome && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ArrowRight size={12} />
                          {activity.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredActivities.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No se encontraron actividades
            </div>
          )}
        </div>
      </div>

      {/* Activity Modal */}
      <ActivityModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadActivities}
        defaultType={selectedType}
      />
    </div>
  );
}

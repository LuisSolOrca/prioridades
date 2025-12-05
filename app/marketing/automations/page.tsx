'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit2,
  Copy,
  BarChart3,
  Mail,
  FileText,
  MousePointer,
  Users,
  Tag,
  Globe,
  Calendar,
  Webhook,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface Automation {
  _id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger: {
    type: string;
    config: Record<string, any>;
  };
  actions: any[];
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecutedAt?: string;
    contactsEnrolled: number;
  };
  createdBy: { name: string };
  createdAt: string;
  updatedAt: string;
}

const TRIGGER_ICONS: Record<string, typeof Mail> = {
  form_submission: FileText,
  landing_page_visit: Globe,
  email_opened: Mail,
  email_clicked: MousePointer,
  contact_created: Users,
  contact_updated: Users,
  tag_added: Tag,
  deal_stage_changed: BarChart3,
  deal_won: CheckCircle,
  date_based: Calendar,
  webhook: Webhook,
};

const TRIGGER_LABELS: Record<string, string> = {
  form_submission: 'Envío de formulario',
  landing_page_visit: 'Visita a landing page',
  email_opened: 'Email abierto',
  email_clicked: 'Clic en email',
  contact_created: 'Contacto creado',
  contact_updated: 'Contacto actualizado',
  tag_added: 'Tag agregado',
  deal_stage_changed: 'Cambio de etapa',
  deal_won: 'Deal ganado',
  date_based: 'Programado',
  webhook: 'Webhook externo',
};

const STATUS_BADGES: Record<string, { color: string; label: string; icon: typeof Play }> = {
  draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'Borrador', icon: Edit2 },
  active: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Activo', icon: Play },
  paused: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pausado', icon: Pause },
  archived: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Archivado', icon: Trash2 },
};

export default function AutomationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggerFilter, setTriggerFilter] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAutomations();
    }
  }, [status, statusFilter, triggerFilter]);

  const fetchAutomations = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (triggerFilter) params.set('triggerType', triggerFilter);

      const res = await fetch(`/api/marketing/automations?${params}`);
      const data = await res.json();
      setAutomations(data.automations || []);
    } catch (error) {
      console.error('Error fetching automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, action: 'activate' | 'pause') => {
    try {
      const res = await fetch(`/api/marketing/automations/${id}/${action}`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error('Error changing status:', error);
    }
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta automatización?')) return;

    try {
      const res = await fetch(`/api/marketing/automations/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error('Error deleting automation:', error);
    }
    setMenuOpen(null);
  };

  const filteredAutomations = automations.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-500" />
              Automatizaciones
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Crea flujos automatizados para tus campañas de marketing
            </p>
          </div>
          <Link
            href="/marketing/automations/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Automatización
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar automatizaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="paused">Pausadas</option>
              <option value="draft">Borradores</option>
            </select>
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos los triggers</option>
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {automations.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Activas</p>
            <p className="text-2xl font-bold text-green-600">
              {automations.filter((a) => a.status === 'active').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Ejecuciones Totales</p>
            <p className="text-2xl font-bold text-purple-600">
              {automations.reduce((sum, a) => sum + a.stats.totalExecutions, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Contactos Activos</p>
            <p className="text-2xl font-bold text-blue-600">
              {automations.reduce((sum, a) => sum + a.stats.contactsEnrolled, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Automations List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {filteredAutomations.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay automatizaciones
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Crea tu primera automatización para comenzar
              </p>
              <Link
                href="/marketing/automations/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Nueva Automatización
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAutomations.map((automation) => {
                const TriggerIcon = TRIGGER_ICONS[automation.trigger.type] || Zap;
                const statusBadge = STATUS_BADGES[automation.status];
                const StatusIcon = statusBadge.icon;

                return (
                  <div
                    key={automation._id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <TriggerIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/marketing/automations/${automation._id}`}
                              className="font-medium text-gray-900 dark:text-white hover:text-purple-600"
                            >
                              {automation.name}
                            </Link>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusBadge.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <TriggerIcon className="w-3 h-3" />
                              {TRIGGER_LABELS[automation.trigger.type]}
                            </span>
                            <span>{automation.actions.length} acciones</span>
                            {automation.stats.lastExecutedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Última: {new Date(automation.stats.lastExecutedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {automation.stats.totalExecutions}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">Ejecuciones</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-green-600">
                              {automation.stats.totalExecutions > 0
                                ? ((automation.stats.successfulExecutions / automation.stats.totalExecutions) * 100).toFixed(0)
                                : 0}%
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">Éxito</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-blue-600">
                              {automation.stats.contactsEnrolled}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">Activos</p>
                          </div>
                        </div>

                        {/* Actions menu */}
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === automation._id ? null : automation._id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>

                          {menuOpen === automation._id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                              <Link
                                href={`/marketing/automations/${automation._id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Edit2 className="w-4 h-4" />
                                Editar
                              </Link>
                              {automation.status === 'active' ? (
                                <button
                                  onClick={() => handleStatusChange(automation._id, 'pause')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Pause className="w-4 h-4" />
                                  Pausar
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(automation._id, 'activate')}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Play className="w-4 h-4" />
                                  Activar
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(automation._id)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </button>
                            </div>
                          )}
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
    </div>
  );
}

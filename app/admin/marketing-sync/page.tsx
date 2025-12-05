'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  Calendar,
  Filter,
  Trash2,
  Play,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Zap,
} from 'lucide-react';

interface SyncLog {
  _id: string;
  platform: string;
  syncType: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  apiCallsMade: number;
  triggerType: string;
  triggeredBy?: { name: string; email: string };
  errors?: { error: string; timestamp: string }[];
}

interface Stats {
  total: number;
  success: number;
  failed: number;
  partial: number;
  inProgress: number;
  pending: number;
}

interface PlatformStats {
  _id: string;
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  META: '#1877F2',
  LINKEDIN: '#0A66C2',
  TWITTER: '#1DA1F2',
  TIKTOK: '#000000',
  YOUTUBE: '#FF0000',
  WHATSAPP: '#25D366',
  GA4: '#E37400',
};

const PLATFORM_NAMES: Record<string, string> = {
  META: 'Meta',
  LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  WHATSAPP: 'WhatsApp',
  GA4: 'Google Analytics',
};

const STATUS_BADGES: Record<string, { color: string; icon: any; label: string }> = {
  PENDING: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: Clock, label: 'Pendiente' },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: RefreshCw, label: 'En progreso' },
  SUCCESS: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Exitoso' },
  PARTIAL: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertTriangle, label: 'Parcial' },
  FAILED: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Fallido' },
};

export default function MarketingSyncPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });

  // Filters
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Actions
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.canConfigureMarketingIntegrations) {
        router.push('/dashboard');
        return;
      }
      loadLogs();
    }
  }, [status, router, permissions.canConfigureMarketingIntegrations, permissionsLoading]);

  useEffect(() => {
    if (status === 'authenticated' && permissions.canConfigureMarketingIntegrations) {
      loadLogs();
    }
  }, [platformFilter, statusFilter, dateRange, pagination.page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (platformFilter) params.set('platform', platformFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);

      const response = await fetch(`/api/marketing/sync/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setStats(data.stats);
        setPlatformStats(data.platformStats || []);
        setRecentErrors(data.recentErrors || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error loading sync logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncPlatform = async (platform: string) => {
    try {
      setSyncing(platform);
      const response = await fetch(`/api/marketing/sync/${platform.toLowerCase()}`, {
        method: 'POST',
      });
      if (response.ok) {
        await loadLogs();
      }
    } catch (error) {
      console.error('Error syncing platform:', error);
    } finally {
      setSyncing(null);
    }
  };

  const clearOldLogs = async (days: number) => {
    if (!confirm(`¿Eliminar logs de más de ${days} días?`)) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/marketing/sync/logs?daysOld=${days}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadLogs();
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
    } finally {
      setDeleting(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg">
                <Activity size={24} />
              </div>
              Sincronización de Marketing
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitorea y gestiona la sincronización de plataformas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={() => clearOldLogs(30)}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <Trash2 size={18} />
              Limpiar +30d
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-xs text-gray-500">Exitosos</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.success}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-xs text-gray-500">Fallidos</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-xs text-gray-500">Parciales</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.partial}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-gray-500">En progreso</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-500" />
                <span className="text-xs text-gray-500">Tasa éxito</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        )}

        {/* Platform Quick Sync */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-green-500" />
            Sincronización Manual
          </h3>
          <div className="flex flex-wrap gap-3">
            {['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'GA4'].map((platform) => {
              const platformStat = platformStats.find((p) => p._id === platform);
              return (
                <button
                  key={platform}
                  onClick={() => syncPlatform(platform)}
                  disabled={syncing === platform}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                  style={{ borderLeftColor: PLATFORM_COLORS[platform], borderLeftWidth: '3px' }}
                >
                  {syncing === platform ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  <span className="font-medium">{PLATFORM_NAMES[platform]}</span>
                  {platformStat && (
                    <span className="text-xs text-gray-500">
                      ({platformStat.success}/{platformStat.total})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Errors */}
        {recentErrors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800 mb-6">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Errores Recientes
            </h3>
            <div className="space-y-2">
              {recentErrors.slice(0, 5).map((error, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-100 dark:border-red-900"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="px-2 py-0.5 rounded text-xs text-white"
                      style={{ backgroundColor: PLATFORM_COLORS[error.platform] }}
                    >
                      {PLATFORM_NAMES[error.platform]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(error.startedAt).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error.errors?.[0]?.error || 'Error desconocido'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="">Todas las plataformas</option>
              {['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'GA4'].map((p) => (
                <option key={p} value={p}>{PLATFORM_NAMES[p]}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="SUCCESS">Exitoso</option>
              <option value="FAILED">Fallido</option>
              <option value="PARTIAL">Parcial</option>
              <option value="IN_PROGRESS">En progreso</option>
            </select>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Plataforma</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Inicio</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Duración</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Procesados</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">API Calls</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => {
                  const statusInfo = STATUS_BADGES[log.status] || STATUS_BADGES.PENDING;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded text-xs text-white font-medium"
                          style={{ backgroundColor: PLATFORM_COLORS[log.platform] }}
                        >
                          {PLATFORM_NAMES[log.platform]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {log.syncType}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${statusInfo.color}`}>
                          <StatusIcon size={12} className={log.status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(log.startedAt).toLocaleString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                        {log.durationMs ? formatDuration(log.durationMs) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-gray-900 dark:text-white">{log.recordsProcessed}</span>
                        {log.recordsFailed > 0 && (
                          <span className="text-red-500 ml-1">({log.recordsFailed} err)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                        {log.apiCallsMade}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {log.triggerType === 'MANUAL' ? 'Manual' : 'Programado'}
                        {log.triggeredBy && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({log.triggeredBy.name})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {logs.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No hay logs de sincronización
          </div>
        )}

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Detalle de Sincronización
                  </h2>
                  <span
                    className="px-3 py-1 rounded text-sm text-white"
                    style={{ backgroundColor: PLATFORM_COLORS[selectedLog.platform] }}
                  >
                    {PLATFORM_NAMES[selectedLog.platform]}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Estado</p>
                    <span className={`px-2 py-1 rounded-full text-sm ${STATUS_BADGES[selectedLog.status]?.color}`}>
                      {STATUS_BADGES[selectedLog.status]?.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tipo</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedLog.syncType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Inicio</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedLog.startedAt).toLocaleString('es-MX')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Duración</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedLog.durationMs ? formatDuration(selectedLog.durationMs) : '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 py-4 border-y border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedLog.recordsProcessed}</p>
                    <p className="text-xs text-gray-500">Procesados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{selectedLog.recordsCreated}</p>
                    <p className="text-xs text-gray-500">Creados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{selectedLog.recordsUpdated}</p>
                    <p className="text-xs text-gray-500">Actualizados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-600">{selectedLog.recordsFailed}</p>
                    <p className="text-xs text-gray-500">Fallidos</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Trigger</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedLog.triggerType === 'MANUAL' ? 'Manual' : 'Programado'}
                    {selectedLog.triggeredBy && ` por ${selectedLog.triggeredBy.name}`}
                  </p>
                </div>

                {selectedLog.errors && selectedLog.errors.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Errores</p>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-2">
                      {selectedLog.errors.map((err, idx) => (
                        <div key={idx} className="text-sm text-red-700 dark:text-red-400">
                          <p className="font-medium">{err.error}</p>
                          <p className="text-xs opacity-70">
                            {new Date(err.timestamp).toLocaleString('es-MX')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

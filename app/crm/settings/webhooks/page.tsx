'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Webhook,
  Plus,
  Edit,
  Trash2,
  Play,
  Power,
  PowerOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
  Clock,
  Send,
  Eye,
  Copy,
  Key,
  Link2,
  Filter,
  Settings,
  History,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface WebhookLog {
  _id: string;
  event: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  responseStatus?: number;
  responseTime?: number;
  error?: string;
  entityType?: string;
  entityName?: string;
  attempts: number;
  createdAt: string;
  responseBody?: string;
  payload?: any;
}

interface WebhookData {
  _id: string;
  name: string;
  description?: string;
  url: string;
  secret: string;
  events: string[];
  filters?: {
    pipelineId?: { _id: string; name: string };
    stageId?: { _id: string; name: string };
    ownerId?: { _id: string; name: string };
    minValue?: number;
    maxValue?: number;
  };
  headers?: Record<string, string>;
  isActive: boolean;
  maxRetries: number;
  timeoutMs: number;
  lastTriggeredAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  totalSent: number;
  totalFailed: number;
  consecutiveFailures: number;
  createdBy: { name: string; email: string };
  createdAt: string;
}

interface WebhookEvent {
  value: string;
  label: string;
  category: string;
}

const EVENT_CATEGORIES: Record<string, { color: string; bgColor: string }> = {
  'Deals': { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  'Contactos': { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  'Clientes': { color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  'Actividades': { color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  'Cotizaciones': { color: 'text-pink-700 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
};

export default function WebhooksPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsWebhook, setLogsWebhook] = useState<WebhookData | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showSecretId, setShowSecretId] = useState<string | null>(null);

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/crm/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks);
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebhook = async (webhookData: any) => {
    setSaving(true);
    try {
      const url = editingWebhook
        ? `/api/crm/webhooks/${editingWebhook._id}`
        : '/api/crm/webhooks';
      const method = editingWebhook ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      });

      if (res.ok) {
        fetchWebhooks();
        setShowModal(false);
        setEditingWebhook(null);
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error saving webhook:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('¿Eliminar este webhook? Se eliminarán también todos los logs asociados.')) return;

    try {
      const res = await fetch(`/api/crm/webhooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  const handleToggleActive = async (webhook: WebhookData) => {
    try {
      const res = await fetch(`/api/crm/webhooks/${webhook._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });

      if (res.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Error toggling webhook:', error);
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/crm/webhooks/${id}/test`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        alert('Webhook de prueba enviado correctamente');
        fetchWebhooks();
      } else {
        alert(`Error: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert('Error al probar webhook');
    } finally {
      setTestingId(null);
    }
  };

  const handleViewLogs = async (webhook: WebhookData) => {
    setLogsWebhook(webhook);
    setShowLogsModal(true);
    setLogsLoading(true);

    try {
      const res = await fetch(`/api/crm/webhooks/${webhook._id}/logs?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRetryWebhook = async (webhookId: string, logId?: string) => {
    try {
      const res = await fetch(`/api/crm/webhooks/${webhookId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logId ? { logId } : {}),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Reintentados: ${data.retried}. Exitosos: ${data.results?.success || 0}, Fallidos: ${data.results?.failed || 0}`);
        if (logsWebhook) {
          handleViewLogs(logsWebhook);
        }
        fetchWebhooks();
      } else {
        alert(data.error || 'Error al reintentar');
      }
    } catch (error) {
      console.error('Error retrying webhook:', error);
      alert('Error al reintentar');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content p-8 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Acceso Denegado</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Solo administradores pueden gestionar webhooks</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Webhook className="w-7 h-7 text-indigo-600" />
                Webhooks Salientes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configura notificaciones HTTP cuando ocurran eventos en el CRM
              </p>
            </div>
            <button
              onClick={() => {
                setEditingWebhook(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Nuevo Webhook
            </button>
          </div>

          {/* Webhooks List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay webhooks configurados
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Los webhooks te permiten notificar a sistemas externos cuando ocurren eventos en el CRM
              </p>
              <button
                onClick={() => {
                  setEditingWebhook(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Crear primer webhook
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <WebhookCard
                  key={webhook._id}
                  webhook={webhook}
                  events={events}
                  showSecret={showSecretId === webhook._id}
                  testingId={testingId}
                  onToggleSecret={() => setShowSecretId(showSecretId === webhook._id ? null : webhook._id)}
                  onEdit={() => {
                    setEditingWebhook(webhook);
                    setShowModal(true);
                  }}
                  onDelete={() => handleDeleteWebhook(webhook._id)}
                  onToggleActive={() => handleToggleActive(webhook)}
                  onTest={() => handleTestWebhook(webhook._id)}
                  onViewLogs={() => handleViewLogs(webhook)}
                  onCopySecret={() => copyToClipboard(webhook.secret)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <WebhookModal
          webhook={editingWebhook}
          events={events}
          saving={saving}
          onSave={handleSaveWebhook}
          onClose={() => {
            setShowModal(false);
            setEditingWebhook(null);
          }}
        />
      )}

      {/* Logs Modal */}
      {showLogsModal && logsWebhook && (
        <LogsModal
          webhook={logsWebhook}
          logs={logs}
          loading={logsLoading}
          onClose={() => {
            setShowLogsModal(false);
            setLogsWebhook(null);
            setLogs([]);
          }}
          onRetry={(logId) => handleRetryWebhook(logsWebhook._id, logId)}
          onRetryAll={() => handleRetryWebhook(logsWebhook._id)}
        />
      )}
    </div>
  );
}

// Webhook Card Component
function WebhookCard({
  webhook,
  events,
  showSecret,
  testingId,
  onToggleSecret,
  onEdit,
  onDelete,
  onToggleActive,
  onTest,
  onViewLogs,
  onCopySecret,
}: {
  webhook: WebhookData;
  events: WebhookEvent[];
  showSecret: boolean;
  testingId: string | null;
  onToggleSecret: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onTest: () => void;
  onViewLogs: () => void;
  onCopySecret: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isTesting = testingId === webhook._id;

  const getEventsByCategory = () => {
    const grouped: Record<string, string[]> = {};
    webhook.events.forEach((event) => {
      const eventInfo = events.find((e) => e.value === event);
      if (eventInfo) {
        if (!grouped[eventInfo.category]) grouped[eventInfo.category] = [];
        grouped[eventInfo.category].push(eventInfo.label);
      }
    });
    return grouped;
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const successRate = webhook.totalSent > 0
    ? Math.round(((webhook.totalSent - webhook.totalFailed) / webhook.totalSent) * 100)
    : 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${
      webhook.isActive
        ? 'border-gray-200 dark:border-gray-700'
        : 'border-gray-300 dark:border-gray-600 opacity-60'
    }`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${
            webhook.isActive
              ? webhook.consecutiveFailures > 0
                ? 'bg-yellow-100 dark:bg-yellow-900/30'
                : 'bg-green-100 dark:bg-green-900/30'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            {webhook.isActive ? (
              webhook.consecutiveFailures > 0 ? (
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Webhook className="w-5 h-5 text-green-600 dark:text-green-400" />
              )
            ) : (
              <PowerOff className="w-5 h-5 text-gray-500" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {webhook.name}
              </h3>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                webhook.isActive
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {webhook.isActive ? 'Activo' : 'Inactivo'}
              </span>
              {webhook.consecutiveFailures > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                  {webhook.consecutiveFailures} fallo(s)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                {webhook.url}
              </code>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTest}
            disabled={!webhook.isActive || isTesting}
            className={`p-2 rounded-lg ${
              webhook.isActive && !isTesting
                ? 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            title="Probar webhook"
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onViewLogs}
            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            title="Ver logs"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleActive}
            className={`p-2 rounded-lg ${
              webhook.isActive
                ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
            title={webhook.isActive ? 'Desactivar' : 'Activar'}
          >
            {webhook.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 pb-3 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Send className="w-3.5 h-3.5" />
          <span>{webhook.totalSent} enviados</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>{successRate}% éxito</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Último: {formatDate(webhook.lastTriggeredAt)}</span>
        </div>
      </div>

      {/* Events Row */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {Object.entries(getEventsByCategory()).map(([category, eventsList]) => {
          const categoryStyle = EVENT_CATEGORIES[category] || { color: 'text-gray-700', bgColor: 'bg-gray-100' };
          return (
            <div
              key={category}
              className={`px-2 py-1 rounded-md text-xs ${categoryStyle.bgColor} ${categoryStyle.color}`}
            >
              {category}: {eventsList.length}
            </div>
          );
        })}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Description */}
          {webhook.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{webhook.description}</p>
            </div>
          )}

          {/* Secret */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Secret (HMAC-SHA256)
            </h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded font-mono">
                {showSecret ? webhook.secret : '•'.repeat(32)}
              </code>
              <button
                onClick={onToggleSecret}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={showSecret ? 'Ocultar' : 'Mostrar'}
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={onCopySecret}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Copiar"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Events List */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eventos suscritos</h4>
            <div className="flex flex-wrap gap-1.5">
              {webhook.events.map((event) => {
                const eventInfo = events.find((e) => e.value === event);
                const category = eventInfo?.category || 'Otros';
                const categoryStyle = EVENT_CATEGORIES[category] || { color: 'text-gray-700', bgColor: 'bg-gray-100' };
                return (
                  <span
                    key={event}
                    className={`px-2 py-1 rounded text-xs ${categoryStyle.bgColor} ${categoryStyle.color}`}
                  >
                    {eventInfo?.label || event}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          {webhook.filters && Object.keys(webhook.filters).some(k => (webhook.filters as any)[k]) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </h4>
              <div className="flex flex-wrap gap-2 text-sm">
                {webhook.filters.pipelineId && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                    Pipeline: {(webhook.filters.pipelineId as any).name || webhook.filters.pipelineId}
                  </span>
                )}
                {webhook.filters.stageId && (
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded">
                    Etapa: {(webhook.filters.stageId as any).name || webhook.filters.stageId}
                  </span>
                )}
                {webhook.filters.ownerId && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                    Owner: {(webhook.filters.ownerId as any).name || webhook.filters.ownerId}
                  </span>
                )}
                {webhook.filters.minValue && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                    Min: ${webhook.filters.minValue.toLocaleString()}
                  </span>
                )}
                {webhook.filters.maxValue && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                    Max: ${webhook.filters.maxValue.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Configuration */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuración
            </h4>
            <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Reintentos: {webhook.maxRetries}</span>
              <span>Timeout: {webhook.timeoutMs / 1000}s</span>
            </div>
          </div>

          {/* Last Error */}
          {webhook.lastError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Último error ({formatDate(webhook.lastErrorAt)})
              </h4>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">{webhook.lastError}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            Creado por {webhook.createdBy?.name || 'Usuario'} el {new Date(webhook.createdAt).toLocaleDateString('es-MX')}
          </div>
        </div>
      )}
    </div>
  );
}

// Webhook Modal Component
function WebhookModal({
  webhook,
  events,
  saving,
  onSave,
  onClose,
}: {
  webhook: WebhookData | null;
  events: WebhookEvent[];
  saving: boolean;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: webhook?.name || '',
    description: webhook?.description || '',
    url: webhook?.url || '',
    events: webhook?.events || [],
    maxRetries: webhook?.maxRetries ?? 3,
    timeoutMs: webhook?.timeoutMs ?? 10000,
    isActive: webhook?.isActive ?? true,
    regenerateSecret: false,
  });

  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [headers, setHeaders] = useState<Record<string, string>>(
    webhook?.headers || {}
  );

  // Group events by category
  const eventsByCategory = events.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, WebhookEvent[]>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.events.length === 0) {
      alert('Selecciona al menos un evento');
      return;
    }

    onSave({
      ...form,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  };

  const toggleEvent = (event: string) => {
    setForm({
      ...form,
      events: form.events.includes(event)
        ? form.events.filter((e) => e !== event)
        : [...form.events, event],
    });
  };

  const toggleCategory = (category: string) => {
    const categoryEvents = eventsByCategory[category].map((e) => e.value);
    const allSelected = categoryEvents.every((e) => form.events.includes(e));

    if (allSelected) {
      setForm({
        ...form,
        events: form.events.filter((e) => !categoryEvents.includes(e)),
      });
    } else {
      setForm({
        ...form,
        events: [...new Set([...form.events, ...categoryEvents])],
      });
    }
  };

  const addHeader = () => {
    if (!headerKey.trim()) return;
    setHeaders({ ...headers, [headerKey.trim()]: headerValue });
    setHeaderKey('');
    setHeaderValue('');
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    setHeaders(newHeaders);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Webhook className="w-6 h-6 text-indigo-600" />
            {webhook ? 'Editar Webhook' : 'Nuevo Webhook'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Ej: Notificación a Zapier"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción opcional"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL del Endpoint *
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required
                placeholder="https://api.ejemplo.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
            </div>
          </div>

          {/* Events */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Eventos a notificar *
            </label>
            <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {Object.entries(eventsByCategory).map(([category, categoryEvents]) => {
                const categoryStyle = EVENT_CATEGORIES[category] || { color: 'text-gray-700', bgColor: 'bg-gray-100' };
                const allSelected = categoryEvents.every((e) => form.events.includes(e.value));
                const someSelected = categoryEvents.some((e) => form.events.includes(e.value));

                return (
                  <div key={category} className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={() => toggleCategory(category)}
                        className="rounded"
                      />
                      <span className={`text-sm font-medium ${categoryStyle.color}`}>
                        {category}
                      </span>
                    </label>
                    <div className="ml-6 grid grid-cols-2 gap-1">
                      {categoryEvents.map((event) => (
                        <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.events.includes(event.value)}
                            onChange={() => toggleEvent(event.value)}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {event.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {form.events.length} evento(s) seleccionado(s)
            </p>
          </div>

          {/* Custom Headers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Headers personalizados
            </label>
            <div className="space-y-2">
              {Object.entries(headers).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    {key}: {value}
                  </code>
                  <button
                    type="button"
                    onClick={() => removeHeader(key)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  placeholder="Header"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
                <input
                  type="text"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  placeholder="Valor"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
                <button
                  type="button"
                  onClick={addHeader}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max reintentos
              </label>
              <input
                type="number"
                value={form.maxRetries}
                onChange={(e) => setForm({ ...form, maxRetries: parseInt(e.target.value) || 0 })}
                min="0"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={form.timeoutMs}
                onChange={(e) => setForm({ ...form, timeoutMs: parseInt(e.target.value) || 10000 })}
                min="1000"
                max="30000"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Webhook activo</span>
            </label>

            {webhook && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.regenerateSecret}
                  onChange={(e) => setForm({ ...form, regenerateSecret: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Regenerar secret (invalidará el anterior)
                </span>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Logs Modal Component
function LogsModal({
  webhook,
  logs,
  loading,
  onClose,
  onRetry,
  onRetryAll,
}: {
  webhook: WebhookData;
  logs: WebhookLog[];
  loading: boolean;
  onClose: () => void;
  onRetry: (logId: string) => void;
  onRetryAll: () => void;
}) {
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const failedLogs = logs.filter((l) => l.status === 'failed' || l.status === 'retrying');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'retrying':
        return <RefreshCw className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'retrying':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-600" />
              Logs: {webhook.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{webhook.url}</p>
          </div>
          <div className="flex items-center gap-2">
            {failedLogs.length > 0 && (
              <button
                onClick={onRetryAll}
                className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
              >
                <RotateCcw className="w-4 h-4" />
                Reintentar fallidos ({failedLogs.length})
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Logs List */}
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>No hay logs para este webhook</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <div
                    key={log._id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 ${
                      selectedLog?._id === log._id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                        {log.responseStatus && (
                          <span className={`text-xs font-mono ${
                            log.responseStatus >= 200 && log.responseStatus < 300
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            HTTP {log.responseStatus}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">{log.event}</span>
                      {log.entityName && (
                        <>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400 truncate">
                            {log.entityName}
                          </span>
                        </>
                      )}
                    </div>
                    {log.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
                        {log.error}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Intentos: {log.attempts}</span>
                      {log.responseTime && <span>{log.responseTime}ms</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log Detail */}
          <div className="w-1/2 overflow-y-auto p-4">
            {selectedLog ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Detalle del Log</h3>
                  {(selectedLog.status === 'failed' || selectedLog.status === 'retrying') && (
                    <button
                      onClick={() => onRetry(selectedLog._id)}
                      className="flex items-center gap-1 px-2 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reintentar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Evento:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedLog.event}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Estado:</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Intentos:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedLog.attempts}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tiempo:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {selectedLog.responseTime ? `${selectedLog.responseTime}ms` : '-'}
                    </span>
                  </div>
                  {selectedLog.responseStatus && (
                    <div className="col-span-2">
                      <span className="text-gray-500">HTTP Status:</span>
                      <span className={`ml-2 font-mono ${
                        selectedLog.responseStatus >= 200 && selectedLog.responseStatus < 300
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {selectedLog.responseStatus}
                      </span>
                    </div>
                  )}
                </div>

                {selectedLog.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Error</h4>
                    <p className="text-sm text-red-600 dark:text-red-300">{selectedLog.error}</p>
                  </div>
                )}

                {selectedLog.payload && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payload enviado</h4>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.responseBody && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Respuesta</h4>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto max-h-40">
                      {selectedLog.responseBody}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>Selecciona un log para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

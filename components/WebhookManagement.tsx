'use client';

import { useState, useEffect } from 'react';
import { Webhook as WebhookIcon, Plus, Edit2, Trash2, Copy, Check, AlertCircle, ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';

interface Channel {
  _id: string;
  name: string;
}

interface Webhook {
  _id: string;
  name: string;
  description?: string;
  type: 'INCOMING' | 'OUTGOING';
  url?: string;
  secret: string;
  isActive: boolean;
  events: string[];
  channelId?: {
    _id: string;
    name: string;
  } | null;
  createdBy?: {
    name: string;
    email: string;
  };
  lastTriggered?: string;
  createdAt: string;
}

interface WebhookManagementProps {
  projectId: string;
}

const AVAILABLE_EVENTS = [
  { value: 'message.created', label: 'Mensaje creado' },
  { value: 'message.updated', label: 'Mensaje editado' },
  { value: 'message.deleted', label: 'Mensaje eliminado' },
  { value: 'message.pinned', label: 'Mensaje fijado' },
  { value: 'message.reaction', label: 'Reacción agregada' },
];

export default function WebhookManagement({ projectId }: WebhookManagementProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'OUTGOING' as 'INCOMING' | 'OUTGOING',
    url: '',
    events: [] as string[],
    channelId: null as string | null,
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [webhooksRes, channelsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/webhooks`),
        fetch(`/api/projects/${projectId}/channels`),
      ]);

      const [webhooksData, channelsData] = await Promise.all([
        webhooksRes.json(),
        channelsRes.json(),
      ]);

      setWebhooks(webhooksData || []);
      // Flatten channels (incluir padre e hijos)
      const allChannels: Channel[] = [];
      (channelsData.channels || []).forEach((ch: any) => {
        allChannels.push({ _id: ch._id, name: ch.name });
        if (ch.children && ch.children.length > 0) {
          ch.children.forEach((child: any) => {
            allChannels.push({ _id: child._id, name: `  └─ ${child.name}` });
          });
        }
      });
      setChannels(allChannels);
    } catch (error) {
      console.error('Error loading webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadData();
        setShowForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear webhook');
      }
    } catch (error) {
      console.error('Error creating webhook:', error);
      alert('Error al crear webhook');
    }
  };

  const handleUpdate = async () => {
    if (!editingWebhook) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks/${editingWebhook._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadData();
        setEditingWebhook(null);
        setShowForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar webhook');
      }
    } catch (error) {
      console.error('Error updating webhook:', error);
      alert('Error al actualizar webhook');
    }
  };

  const handleDelete = async (webhookId: string, webhookName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el webhook "${webhookName}"?`)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadData();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar webhook');
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      alert('Error al eliminar webhook');
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks/${webhook._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });

      if (response.ok) {
        await loadData();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar webhook');
      }
    } catch (error) {
      console.error('Error toggling webhook:', error);
      alert('Error al actualizar webhook');
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSecret(id);
      setTimeout(() => setCopiedSecret(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const getIncomingWebhookUrl = (secret: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/api/webhooks/incoming/${secret}`;
  };

  const startEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      description: webhook.description || '',
      type: webhook.type,
      url: webhook.url || '',
      events: webhook.events || [],
      channelId: webhook.channelId?._id || null,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'OUTGOING',
      url: '',
      events: [],
      channelId: null,
    });
    setEditingWebhook(null);
  };

  const toggleEvent = (event: string) => {
    if (formData.events.includes(event)) {
      setFormData({ ...formData, events: formData.events.filter(e => e !== event) });
    } else {
      setFormData({ ...formData, events: [...formData.events, event] });
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-600 dark:text-gray-400">Cargando webhooks...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <WebhookIcon size={24} />
            Webhooks
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Integra sistemas externos con tus canales
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Nuevo Webhook
        </button>
      </div>

      {/* Lista de webhooks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {webhooks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <WebhookIcon size={48} className="mx-auto mb-3 opacity-30" />
            <p>No hay webhooks configurados</p>
            <p className="text-sm mt-1">Crea tu primer webhook para empezar a integrar sistemas externos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {webhooks.map((webhook) => (
              <div key={webhook._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${webhook.type === 'INCOMING' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                        {webhook.type === 'INCOMING' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{webhook.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {webhook.type === 'INCOMING' ? 'Webhook Entrante' : 'Webhook Saliente'}
                          {webhook.channelId && ` • Canal: ${webhook.channelId.name}`}
                          {!webhook.channelId && ' • Todos los canales'}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${webhook.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                        {webhook.isActive ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>

                    {webhook.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{webhook.description}</p>
                    )}

                    {webhook.type === 'OUTGOING' && webhook.url && (
                      <div className="flex items-center gap-2 mb-2">
                        <ExternalLink size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate">{webhook.url}</span>
                      </div>
                    )}

                    {webhook.type === 'OUTGOING' && webhook.events.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {webhook.events.map(event => (
                          <span key={event} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">
                            {AVAILABLE_EVENTS.find(e => e.value === event)?.label || event}
                          </span>
                        ))}
                      </div>
                    )}

                    {webhook.type === 'INCOMING' && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-2 mb-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">URL del Webhook:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 font-mono truncate">
                            {getIncomingWebhookUrl(webhook.secret)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(getIncomingWebhookUrl(webhook.secret), `url-${webhook._id}`)}
                            className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title="Copiar URL"
                          >
                            {copiedSecret === `url-${webhook._id}` ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-800 dark:text-yellow-400 mb-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Secret Token:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-yellow-300 dark:border-yellow-700 font-mono truncate">
                          {webhook.secret}
                        </code>
                        <button
                          onClick={() => copyToClipboard(webhook.secret, webhook._id)}
                          className="flex-shrink-0 p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded"
                          title="Copiar token"
                        >
                          {copiedSecret === webhook._id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    {webhook.lastTriggered && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Última activación: {new Date(webhook.lastTriggered).toLocaleString('es-ES')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleToggleActive(webhook)}
                      className={`px-3 py-1 rounded text-sm ${webhook.isActive ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300' : 'bg-green-600 text-white'}`}
                    >
                      {webhook.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => startEdit(webhook)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(webhook._id, webhook.name)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingWebhook ? 'Editar Webhook' : 'Nuevo Webhook'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INCOMING' | 'OUTGOING' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!!editingWebhook} // No permitir cambiar tipo al editar
                  >
                    <option value="OUTGOING">Saliente (enviar datos a sistemas externos)</option>
                    <option value="INCOMING">Entrante (recibir datos de sistemas externos)</option>
                  </select>
                </div>

                {formData.type === 'OUTGOING' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        URL de destino *
                      </label>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="https://ejemplo.com/webhook"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Eventos que disparan el webhook
                      </label>
                      <div className="space-y-2">
                        {AVAILABLE_EVENTS.map(event => (
                          <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.events.includes(event.value)}
                              onChange={() => toggleEvent(event.value)}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{event.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Canal (opcional)
                  </label>
                  <select
                    value={formData.channelId || ''}
                    onChange={(e) => setFormData({ ...formData, channelId: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Todos los canales</option>
                    {channels.map(channel => (
                      <option key={channel._id} value={channel._id}>{channel.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Si no se selecciona, el webhook se activará para eventos en cualquier canal del proyecto
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editingWebhook ? handleUpdate : handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingWebhook ? 'Guardar Cambios' : 'Crear Webhook'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

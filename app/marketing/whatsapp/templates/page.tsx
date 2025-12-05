'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Send,
  ChevronLeft,
  FileText,
  Image,
  Video,
  File,
  Link as LinkIcon,
  Phone,
  Copy,
  Reply,
  BarChart3,
} from 'lucide-react';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: {
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
    text: string;
    url?: string;
    phoneNumber?: string;
  }[];
}

interface Template {
  _id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  components: TemplateComponent[];
  externalTemplateId?: string;
  rejectionReason?: string;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  isSystem?: boolean;
  description?: string;
}

const STATUS_BADGES: Record<string, { color: string; icon: any; label: string }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: 'Pendiente' },
  APPROVED: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Aprobado' },
  REJECTED: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Rechazado' },
  PAUSED: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: Pause, label: 'Pausado' },
  DISABLED: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400', icon: AlertTriangle, label: 'Desactivado' },
};

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidad',
  AUTHENTICATION: 'Autenticación',
};

const LANGUAGE_LABELS: Record<string, string> = {
  es_MX: 'Español (México)',
  es: 'Español',
  en_US: 'English (US)',
  en: 'English',
};

export default function WhatsAppTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    language: 'es_MX',
    category: 'MARKETING' as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
    headerType: 'none' as 'none' | 'text' | 'image' | 'video' | 'document',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: [] as { type: string; text: string; url?: string; phoneNumber?: string }[],
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.canManageWhatsApp) {
        router.push('/dashboard');
        return;
      }
      loadTemplates();
    }
  }, [status, router, permissions.canManageWhatsApp, permissionsLoading]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);

      const response = await fetch(`/api/marketing/whatsapp/templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncTemplates = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/marketing/whatsapp/templates/sync', {
        method: 'POST',
      });
      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error syncing templates:', error);
    } finally {
      setSyncing(false);
    }
  };

  const createTemplate = async () => {
    try {
      setSaving(true);

      // Build components array
      const components: TemplateComponent[] = [];

      if (newTemplate.headerType !== 'none') {
        components.push({
          type: 'HEADER',
          format: newTemplate.headerType.toUpperCase() as any,
          text: newTemplate.headerType === 'text' ? newTemplate.headerText : undefined,
        });
      }

      if (newTemplate.bodyText) {
        components.push({
          type: 'BODY',
          text: newTemplate.bodyText,
        });
      }

      if (newTemplate.footerText) {
        components.push({
          type: 'FOOTER',
          text: newTemplate.footerText,
        });
      }

      if (newTemplate.buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: newTemplate.buttons.map((b) => ({
            type: b.type as any,
            text: b.text,
            url: b.url,
            phoneNumber: b.phoneNumber,
          })),
        });
      }

      const response = await fetch('/api/marketing/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplate.name.toLowerCase().replace(/\s+/g, '_'),
          language: newTemplate.language,
          category: newTemplate.category,
          components,
        }),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewTemplate({
          name: '',
          language: 'es_MX',
          category: 'MARKETING',
          headerType: 'none',
          headerText: '',
          bodyText: '',
          footerText: '',
          buttons: [],
        });
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && permissions.canManageWhatsApp) {
      loadTemplates();
    }
  }, [statusFilter, categoryFilter]);

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDeliveryRate = (t: Template) => {
    if (!t.messagesSent || t.messagesSent === 0) return 0;
    return ((t.messagesDelivered / t.messagesSent) * 100).toFixed(1);
  };

  const getReadRate = (t: Template) => {
    if (!t.messagesDelivered || t.messagesDelivered === 0) return 0;
    return ((t.messagesRead / t.messagesDelivered) * 100).toFixed(1);
  };

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-green-500" size={40} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/marketing/whatsapp"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1 mb-2"
            >
              <ChevronLeft size={16} />
              Volver a WhatsApp
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white shadow-lg">
                <MessageSquare size={24} />
              </div>
              Templates de WhatsApp
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona tus plantillas de mensajes aprobadas por Meta
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={syncTemplates}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus size={18} />
              Nuevo Template
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="APPROVED">Aprobados</option>
              <option value="PENDING">Pendientes</option>
              <option value="REJECTED">Rechazados</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="">Todas las categorías</option>
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utilidad</option>
              <option value="AUTHENTICATION">Autenticación</option>
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const statusInfo = STATUS_BADGES[template.status] || STATUS_BADGES.PENDING;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={template._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        {template.isSystem && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[10px] font-medium">
                            Sistema
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {LANGUAGE_LABELS[template.language] || template.language}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${statusInfo.color}`}>
                      <StatusIcon size={12} />
                      {statusInfo.label}
                    </span>
                  </div>

                  {template.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                      {template.description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500 mb-3">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      {CATEGORY_LABELS[template.category]}
                    </span>
                  </div>

                  {/* Preview */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3 text-sm text-gray-700 dark:text-gray-300">
                    {template.components.find((c) => c.type === 'BODY')?.text?.slice(0, 100) || 'Sin contenido'}
                    {(template.components.find((c) => c.type === 'BODY')?.text?.length || 0) > 100 && '...'}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                      <p className="text-lg font-bold text-blue-600">{template.messagesSent}</p>
                      <p className="text-xs text-gray-500">Enviados</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                      <p className="text-lg font-bold text-green-600">{getDeliveryRate(template)}%</p>
                      <p className="text-xs text-gray-500">Entregados</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                      <p className="text-lg font-bold text-purple-600">{getReadRate(template)}%</p>
                      <p className="text-xs text-gray-500">Leídos</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Sin templates
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || statusFilter || categoryFilter
                ? 'No se encontraron templates con los filtros seleccionados'
                : 'Crea tu primer template o sincroniza desde Meta'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={syncTemplates}
                disabled={syncing}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <RefreshCw size={16} className="inline mr-2" />
                Sincronizar
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Plus size={16} className="inline mr-2" />
                Crear Template
              </button>
            </div>
          </div>
        )}

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nuevo Template de WhatsApp
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Los templates deben ser aprobados por Meta antes de poder usarlos
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del template *
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="ejemplo_template"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones bajos</p>
                </div>

                {/* Language & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Idioma
                    </label>
                    <select
                      value={newTemplate.language}
                      onChange={(e) => setNewTemplate({ ...newTemplate, language: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    >
                      <option value="es_MX">Español (México)</option>
                      <option value="es">Español</option>
                      <option value="en_US">English (US)</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Categoría
                    </label>
                    <select
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utilidad</option>
                      <option value="AUTHENTICATION">Autenticación</option>
                    </select>
                  </div>
                </div>

                {/* Header */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Encabezado (opcional)
                  </label>
                  <select
                    value={newTemplate.headerType}
                    onChange={(e) => setNewTemplate({ ...newTemplate, headerType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mb-2"
                  >
                    <option value="none">Sin encabezado</option>
                    <option value="text">Texto</option>
                    <option value="image">Imagen</option>
                    <option value="video">Video</option>
                    <option value="document">Documento</option>
                  </select>
                  {newTemplate.headerType === 'text' && (
                    <input
                      type="text"
                      value={newTemplate.headerText}
                      onChange={(e) => setNewTemplate({ ...newTemplate, headerText: e.target.value })}
                      placeholder="Texto del encabezado"
                      maxLength={60}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  )}
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cuerpo del mensaje *
                  </label>
                  <textarea
                    value={newTemplate.bodyText}
                    onChange={(e) => setNewTemplate({ ...newTemplate, bodyText: e.target.value })}
                    placeholder="Escribe el contenido del mensaje. Usa {{1}}, {{2}}, etc. para variables."
                    rows={4}
                    maxLength={1024}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">{newTemplate.bodyText.length}/1024 caracteres</p>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pie de página (opcional)
                  </label>
                  <input
                    type="text"
                    value={newTemplate.footerText}
                    onChange={(e) => setNewTemplate({ ...newTemplate, footerText: e.target.value })}
                    placeholder="Texto del pie de página"
                    maxLength={60}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>

                {/* Buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Botones (opcional, máximo 3)
                  </label>
                  {newTemplate.buttons.map((button, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <select
                        value={button.type}
                        onChange={(e) => {
                          const updated = [...newTemplate.buttons];
                          updated[idx].type = e.target.value;
                          setNewTemplate({ ...newTemplate, buttons: updated });
                        }}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                      >
                        <option value="QUICK_REPLY">Respuesta rápida</option>
                        <option value="URL">URL</option>
                        <option value="PHONE_NUMBER">Teléfono</option>
                      </select>
                      <input
                        type="text"
                        value={button.text}
                        onChange={(e) => {
                          const updated = [...newTemplate.buttons];
                          updated[idx].text = e.target.value;
                          setNewTemplate({ ...newTemplate, buttons: updated });
                        }}
                        placeholder="Texto del botón"
                        maxLength={25}
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                      />
                      {button.type === 'URL' && (
                        <input
                          type="url"
                          value={button.url || ''}
                          onChange={(e) => {
                            const updated = [...newTemplate.buttons];
                            updated[idx].url = e.target.value;
                            setNewTemplate({ ...newTemplate, buttons: updated });
                          }}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                        />
                      )}
                      <button
                        onClick={() => {
                          const updated = newTemplate.buttons.filter((_, i) => i !== idx);
                          setNewTemplate({ ...newTemplate, buttons: updated });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ))}
                  {newTemplate.buttons.length < 3 && (
                    <button
                      onClick={() => {
                        setNewTemplate({
                          ...newTemplate,
                          buttons: [...newTemplate.buttons, { type: 'QUICK_REPLY', text: '' }],
                        });
                      }}
                      className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Agregar botón
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={createTemplate}
                  disabled={saving || !newTemplate.name || !newTemplate.bodyText}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  Crear Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template Detail Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedTemplate.name}
                      </h2>
                      {selectedTemplate.isSystem && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                          Sistema
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {LANGUAGE_LABELS[selectedTemplate.language]} • {CATEGORY_LABELS[selectedTemplate.category]}
                    </p>
                    {selectedTemplate.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {selectedTemplate.description}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${STATUS_BADGES[selectedTemplate.status]?.color}`}>
                    {STATUS_BADGES[selectedTemplate.status]?.label}
                  </span>
                </div>
                {selectedTemplate.isSystem && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Este es un template de sistema. Para usarlo, debes registrarlo en Meta WhatsApp Business API y esperar aprobación.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* WhatsApp-style preview */}
                <div className="bg-[#e5ddd5] dark:bg-gray-700 rounded-xl p-4 mb-4">
                  <div className="bg-white dark:bg-gray-600 rounded-lg p-3 shadow-sm max-w-[85%]">
                    {selectedTemplate.components.map((comp, idx) => (
                      <div key={idx}>
                        {comp.type === 'HEADER' && comp.text && (
                          <p className="font-bold text-gray-900 dark:text-white mb-1">{comp.text}</p>
                        )}
                        {comp.type === 'HEADER' && comp.format === 'IMAGE' && (
                          <div className="bg-gray-200 dark:bg-gray-500 rounded h-32 flex items-center justify-center mb-2">
                            <Image className="text-gray-400" size={32} />
                          </div>
                        )}
                        {comp.type === 'BODY' && (
                          <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap">{comp.text}</p>
                        )}
                        {comp.type === 'FOOTER' && (
                          <p className="text-xs text-gray-500 mt-2">{comp.text}</p>
                        )}
                        {comp.type === 'BUTTONS' && comp.buttons && (
                          <div className="mt-3 space-y-1 border-t border-gray-200 dark:border-gray-500 pt-2">
                            {comp.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                className="w-full py-2 text-sm text-blue-500 font-medium flex items-center justify-center gap-1"
                              >
                                {btn.type === 'URL' && <LinkIcon size={14} />}
                                {btn.type === 'PHONE_NUMBER' && <Phone size={14} />}
                                {btn.type === 'QUICK_REPLY' && <Reply size={14} />}
                                {btn.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400 text-right mt-1">
                      {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedTemplate.messagesSent}</p>
                    <p className="text-xs text-gray-500">Enviados</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedTemplate.messagesDelivered}</p>
                    <p className="text-xs text-gray-500">Entregados</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Eye className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedTemplate.messagesRead}</p>
                    <p className="text-xs text-gray-500">Leídos</p>
                  </div>
                </div>

                {selectedTemplate.rejectionReason && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      <strong>Razón de rechazo:</strong> {selectedTemplate.rejectionReason}
                    </p>
                  </div>
                )}

                {selectedTemplate.externalTemplateId && (
                  <p className="text-xs text-gray-500 mb-4">
                    ID externo: {selectedTemplate.externalTemplateId}
                  </p>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cerrar
                </button>
                {selectedTemplate.status === 'APPROVED' && (
                  <button
                    onClick={() => {
                      router.push(`/marketing/whatsapp?templateId=${selectedTemplate._id}`);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <Send size={18} />
                    Usar en Broadcast
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

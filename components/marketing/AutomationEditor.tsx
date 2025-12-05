'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Save,
  Play,
  Pause,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Mail,
  Tag,
  Users,
  Bell,
  Globe,
  Clock,
  GitBranch,
  MessageSquare,
  FileText,
  MousePointer,
  Calendar,
  Webhook,
  BarChart3,
  CheckCircle,
  Settings,
  Zap,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import WorkflowBuilder from './WorkflowBuilder';

interface AutomationEditorProps {
  automationId?: string;
  initialData?: any;
}

// Trigger types with labels and icons
const TRIGGER_TYPES = [
  { value: 'form_submission', label: 'Envío de formulario', icon: FileText, description: 'Cuando alguien envía un formulario' },
  { value: 'landing_page_visit', label: 'Visita a landing page', icon: Globe, description: 'Cuando alguien visita una landing page' },
  { value: 'email_opened', label: 'Email abierto', icon: Mail, description: 'Cuando se abre un email de campaña' },
  { value: 'email_clicked', label: 'Clic en email', icon: MousePointer, description: 'Cuando se hace clic en un enlace de email' },
  { value: 'contact_created', label: 'Contacto creado', icon: Users, description: 'Cuando se crea un nuevo contacto' },
  { value: 'contact_updated', label: 'Contacto actualizado', icon: Users, description: 'Cuando se actualiza un contacto' },
  { value: 'tag_added', label: 'Tag agregado', icon: Tag, description: 'Cuando se agrega un tag a un contacto' },
  { value: 'deal_stage_changed', label: 'Cambio de etapa', icon: BarChart3, description: 'Cuando un deal cambia de etapa' },
  { value: 'deal_won', label: 'Deal ganado', icon: CheckCircle, description: 'Cuando se gana un deal' },
  { value: 'date_based', label: 'Programado', icon: Calendar, description: 'En una fecha/hora específica' },
  { value: 'webhook', label: 'Webhook externo', icon: Webhook, description: 'Cuando se recibe un webhook' },
];

// Action types with labels and icons
const ACTION_TYPES = [
  { value: 'send_email', label: 'Enviar email', icon: Mail, description: 'Enviar un email al contacto' },
  { value: 'send_whatsapp', label: 'Enviar WhatsApp', icon: MessageSquare, description: 'Enviar mensaje de WhatsApp' },
  { value: 'add_tag', label: 'Agregar tag', icon: Tag, description: 'Agregar un tag al contacto' },
  { value: 'remove_tag', label: 'Remover tag', icon: Tag, description: 'Quitar un tag del contacto' },
  { value: 'update_contact', label: 'Actualizar contacto', icon: Users, description: 'Actualizar campos del contacto' },
  { value: 'send_notification', label: 'Notificación interna', icon: Bell, description: 'Enviar notificación al equipo' },
  { value: 'webhook', label: 'Llamar webhook', icon: Globe, description: 'Llamar a un endpoint externo' },
  { value: 'wait', label: 'Esperar', icon: Clock, description: 'Esperar un tiempo antes de continuar' },
  { value: 'condition', label: 'Condición', icon: GitBranch, description: 'Crear rama condicional (Si/Entonces)' },
  { value: 'split', label: 'Test A/B', icon: GitBranch, description: 'Dividir tráfico para pruebas A/B' },
];

export default function AutomationEditor({ automationId, initialData }: AutomationEditorProps) {
  const router = useRouter();
  const isEditing = !!automationId;

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [trigger, setTrigger] = useState(initialData?.trigger || { type: '', config: {} });
  const [actions, setActions] = useState<any[]>(initialData?.actions || []);
  const [settings, setSettings] = useState(initialData?.settings || {
    allowReentry: false,
    reentryDelay: 24,
    timezone: 'America/Mexico_City',
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('visual');

  // Resources for selectors
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [landingPages, setLandingPages] = useState<any[]>([]);
  const [webForms, setWebForms] = useState<any[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [contactFields] = useState<string[]>([
    'firstName', 'lastName', 'email', 'phone', 'company', 'position',
    'source', 'status', 'score', 'notes'
  ]);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const [templatesRes, pagesRes, formsRes, whatsappRes] = await Promise.all([
        fetch('/api/marketing/email-templates'),
        fetch('/api/marketing/landing-pages?status=published'),
        fetch('/api/crm/web-forms?status=active'),
        fetch('/api/marketing/whatsapp/templates'),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        console.log('Email templates loaded:', data.templates?.length || 0);
        setEmailTemplates(data.templates || []);
      } else {
        console.error('Failed to load email templates:', templatesRes.status);
      }
      if (pagesRes.ok) {
        const data = await pagesRes.json();
        setLandingPages(data.pages || []);
      }
      if (formsRes.ok) {
        const data = await formsRes.json();
        setWebForms(Array.isArray(data) ? data : (data.forms || []));
      }
      if (whatsappRes.ok) {
        const data = await whatsappRes.json();
        setWhatsappTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Error fetching resources:', e);
    } finally {
      setLoadingResources(false);
    }
  };

  const generateActionId = () => `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addAction = (type: string) => {
    const newAction = {
      id: generateActionId(),
      type,
      config: getDefaultActionConfig(type),
    };
    setActions([...actions, newAction]);
    setExpandedAction(newAction.id);
    setShowAddAction(false);
  };

  const getDefaultActionConfig = (type: string) => {
    switch (type) {
      case 'wait':
        return { waitDuration: 1, waitUnit: 'days' };
      case 'send_email':
        return { subject: '' };
      case 'add_tag':
      case 'remove_tag':
        return { tagName: '' };
      case 'send_notification':
        return { notificationMessage: '' };
      case 'webhook':
        return { webhookUrl: '', webhookMethod: 'POST' };
      case 'condition':
        return { conditions: [{ field: '', operator: 'equals', value: '' }], conditionOperator: 'AND', trueBranch: [], falseBranch: [] };
      case 'split':
        return { splitPercentageA: 50, splitBranchA: [], splitBranchB: [], splitName: '' };
      default:
        return {};
    }
  };

  const updateAction = (id: string, updates: any) => {
    setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
    if (expandedAction === id) setExpandedAction(null);
  };

  const moveAction = (id: string, direction: 'up' | 'down') => {
    const index = actions.findIndex(a => a.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === actions.length - 1)) return;
    const newActions = [...actions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
    setActions(newActions);
  };

  const handleSave = async (newStatus?: string) => {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!trigger.type) {
      setError('Debes seleccionar un trigger');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name,
        description,
        status: newStatus || status,
        trigger,
        actions,
        settings,
      };

      const url = isEditing
        ? `/api/marketing/automations/${automationId}`
        : '/api/marketing/automations';

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      const saved = await res.json();

      if (!isEditing) {
        router.push(`/marketing/automations/${saved._id}`);
      } else {
        setStatus(saved.status);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = () => handleSave('active');
  const handlePause = () => handleSave('paused');

  const getTriggerIcon = (type: string) => {
    const t = TRIGGER_TYPES.find(t => t.value === type);
    return t?.icon || Zap;
  };

  const getActionIcon = (type: string) => {
    const a = ACTION_TYPES.find(a => a.value === type);
    return a?.icon || Zap;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/marketing/automations"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isEditing ? 'Editar Automatización' : 'Nueva Automatización'}
                </h1>
                {status !== 'draft' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    status === 'paused' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {status === 'active' ? 'Activa' : status === 'paused' ? 'Pausada' : status}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('visual')}
                  className={`p-2 rounded ${viewMode === 'visual' ? 'bg-white dark:bg-gray-600 shadow' : ''} text-gray-600 dark:text-gray-300`}
                  title="Vista visual"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''} text-gray-600 dark:text-gray-300`}
                  title="Vista de lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Configuración"
              >
                <Settings className="w-5 h-5 text-gray-500" />
              </button>

              {status === 'active' ? (
                <button
                  onClick={handlePause}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  <Pause className="w-4 h-4" />
                  Pausar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Guardar
                  </button>
                  <button
                    onClick={handleActivate}
                    disabled={saving || actions.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    Activar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Configuración Avanzada</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.allowReentry}
                  onChange={(e) => setSettings({ ...settings, allowReentry: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Permitir que el mismo contacto entre varias veces
                </span>
              </label>

              {settings.allowReentry && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Tiempo mínimo entre re-entradas (horas)
                  </label>
                  <input
                    type="number"
                    value={settings.reentryDelay || 24}
                    onChange={(e) => setSettings({ ...settings, reentryDelay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Visual Workflow Builder */}
        {viewMode === 'visual' && (
          <div className="mb-6">
            {/* Basic Info inline */}
            <div className="mb-4 flex gap-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la automatización"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción (opcional)"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Workflow Canvas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
              <WorkflowBuilder
                trigger={trigger}
                actions={actions}
                onTriggerChange={setTrigger}
                onActionsChange={setActions}
                emailTemplates={emailTemplates}
                landingPages={landingPages}
                webForms={webForms}
                whatsappTemplates={whatsappTemplates}
                contactFields={contactFields}
                loadingResources={loadingResources}
              />
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
        {/* Basic Info */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Información Básica</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Bienvenida a nuevos leads"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el propósito de esta automatización..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Trigger */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Trigger (¿Cuándo se ejecuta?)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {TRIGGER_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = trigger.type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTrigger({ type: t.value, config: {} })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.description}</p>
                </button>
              );
            })}
          </div>

          {/* Trigger config */}
          {trigger.type && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {trigger.type === 'form_submission' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Formulario específico (opcional)
                  </label>
                  <select
                    value={trigger.config.formId || ''}
                    onChange={(e) => setTrigger({ ...trigger, config: { ...trigger.config, formId: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Cualquier formulario</option>
                    {webForms.map((f: any) => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {trigger.type === 'landing_page_visit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Landing page específica (opcional)
                  </label>
                  <select
                    value={trigger.config.landingPageId || ''}
                    onChange={(e) => setTrigger({ ...trigger, config: { ...trigger.config, landingPageId: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Cualquier landing page</option>
                    {landingPages.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {trigger.type === 'tag_added' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tag específico
                  </label>
                  <input
                    type="text"
                    value={trigger.config.tagName || ''}
                    onChange={(e) => setTrigger({ ...trigger, config: { ...trigger.config, tagName: e.target.value } })}
                    placeholder="Ej: cliente-premium"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {trigger.type === 'date_based' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo
                    </label>
                    <select
                      value={trigger.config.schedule?.type || 'once'}
                      onChange={(e) => setTrigger({
                        ...trigger,
                        config: { ...trigger.config, schedule: { ...trigger.config.schedule, type: e.target.value } }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="once">Una vez</option>
                      <option value="recurring">Recurrente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hora
                    </label>
                    <input
                      type="time"
                      value={trigger.config.schedule?.time || '09:00'}
                      onChange={(e) => setTrigger({
                        ...trigger,
                        config: { ...trigger.config, schedule: { ...trigger.config.schedule, time: e.target.value } }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {trigger.type === 'webhook' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL del webhook (se generará al guardar)
                  </label>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    {automationId
                      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/marketing/automations/trigger?key=${automationId}`
                      : 'Guarda la automatización para obtener la URL'
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-green-500" />
            Acciones (¿Qué hacer?)
          </h3>

          {/* Action list */}
          <div className="space-y-3">
            {actions.map((action, index) => {
              const ActionIcon = getActionIcon(action.type);
              const actionType = ACTION_TYPES.find(a => a.value === action.type);
              const isExpanded = expandedAction === action.id;

              return (
                <div
                  key={action.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Action header */}
                  <div
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer"
                    onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                  >
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                      {index + 1}
                    </span>
                    <ActionIcon className="w-4 h-4 text-gray-500" />
                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {actionType?.label || action.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveAction(action.id, 'up'); }}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveAction(action.id, 'down'); }}
                        disabled={index === actions.length - 1}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteAction(action.id); }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Action config */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      {action.type === 'send_email' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Template de email</label>
                            {loadingResources ? (
                              <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500">
                                Cargando templates...
                              </div>
                            ) : (
                              <>
                                <select
                                  value={action.config.emailTemplateId || ''}
                                  onChange={(e) => updateAction(action.id, { config: { ...action.config, emailTemplateId: e.target.value } })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="">Seleccionar template...</option>
                                  {emailTemplates.map((t: any) => (
                                    <option key={t._id || t.id} value={t._id || t.id}>
                                      {t.name} {t.isSystem ? '(Sistema)' : ''}
                                    </option>
                                  ))}
                                </select>
                                {emailTemplates.length === 0 && (
                                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                    No se encontraron templates de email.
                                  </p>
                                )}
                                {emailTemplates.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {emailTemplates.length} template(s) disponibles
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Asunto personalizado (opcional)</label>
                            <input
                              type="text"
                              value={action.config.subject || ''}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, subject: e.target.value } })}
                              placeholder="Dejar vacío para usar el del template"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}

                      {(action.type === 'add_tag' || action.type === 'remove_tag') && (
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre del tag</label>
                          <input
                            type="text"
                            value={action.config.tagName || ''}
                            onChange={(e) => updateAction(action.id, { config: { ...action.config, tagName: e.target.value } })}
                            placeholder="Ej: lead-caliente"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {action.type === 'wait' && (
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Duración</label>
                            <input
                              type="number"
                              min="1"
                              value={action.config.waitDuration || 1}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, waitDuration: parseInt(e.target.value) } })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Unidad</label>
                            <select
                              value={action.config.waitUnit || 'days'}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, waitUnit: e.target.value } })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="minutes">Minutos</option>
                              <option value="hours">Horas</option>
                              <option value="days">Días</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {action.type === 'send_notification' && (
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Mensaje de notificación</label>
                          <textarea
                            value={action.config.notificationMessage || ''}
                            onChange={(e) => updateAction(action.id, { config: { ...action.config, notificationMessage: e.target.value } })}
                            placeholder="Nuevo lead en automatización: {{contact.name}}"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {action.type === 'webhook' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">URL del webhook</label>
                            <input
                              type="url"
                              value={action.config.webhookUrl || ''}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, webhookUrl: e.target.value } })}
                              placeholder="https://..."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Método</label>
                            <select
                              value={action.config.webhookMethod || 'POST'}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, webhookMethod: e.target.value } })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {action.type === 'send_whatsapp' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Template de WhatsApp</label>
                            <select
                              value={action.config.whatsappTemplateId || ''}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, whatsappTemplateId: e.target.value } })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="">Seleccionar template...</option>
                              {whatsappTemplates.map((t: any) => (
                                <option key={t._id} value={t._id}>{t.name} ({t.language})</option>
                              ))}
                            </select>
                            {whatsappTemplates.length === 0 && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                No hay templates de WhatsApp. Configura la integración primero.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {action.type === 'update_contact' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Campo a actualizar</label>
                            <select
                              value={action.config.fieldName || ''}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, fieldName: e.target.value } })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="">Seleccionar campo...</option>
                              {contactFields.map((field) => (
                                <option key={field} value={field}>{field}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nuevo valor</label>
                            <input
                              type="text"
                              value={action.config.fieldValue || ''}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, fieldValue: e.target.value } })}
                              placeholder="Usa {{variable}} para valores dinámicos"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}

                      {action.type === 'condition' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Campo a evaluar</label>
                            <select
                              value={action.config.conditionField || ''}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, conditionField: e.target.value } })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="">Seleccionar campo...</option>
                              {contactFields.map((field) => (
                                <option key={field} value={field}>{field}</option>
                              ))}
                              <option value="tags">tags (contiene)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Operador</label>
                            <select
                              value={action.config.conditionOperator || 'equals'}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, conditionOperator: e.target.value } })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="equals">Igual a</option>
                              <option value="not_equals">Diferente de</option>
                              <option value="contains">Contiene</option>
                              <option value="not_contains">No contiene</option>
                              <option value="greater_than">Mayor que</option>
                              <option value="less_than">Menor que</option>
                              <option value="is_empty">Está vacío</option>
                              <option value="is_not_empty">No está vacío</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Valor</label>
                            <input
                              type="text"
                              value={action.config.conditionValue || ''}
                              onChange={(e) => updateAction(action.id, { config: { ...action.config, conditionValue: e.target.value } })}
                              placeholder="Valor a comparar"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Las condiciones dividen el flujo: si es verdadera continúa, si es falsa se detiene.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add action button */}
          {showAddAction ? (
            <div className="mt-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Selecciona una acción:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ACTION_TYPES.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.value}
                      onClick={() => addAction(a.value)}
                      className="flex items-center gap-2 p-2 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{a.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAddAction(false)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddAction(true)}
              className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Agregar acción
            </button>
          )}
        </div>

        {/* Stats (only for existing automations) */}
        {isEditing && initialData?.stats && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Estadísticas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{initialData.stats.totalExecutions}</p>
                <p className="text-sm text-gray-500">Ejecuciones</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{initialData.stats.successfulExecutions}</p>
                <p className="text-sm text-gray-500">Exitosas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{initialData.stats.failedExecutions}</p>
                <p className="text-sm text-gray-500">Fallidas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{initialData.stats.contactsEnrolled}</p>
                <p className="text-sm text-gray-500">Contactos activos</p>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

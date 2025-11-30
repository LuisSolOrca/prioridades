'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Navbar from '@/components/Navbar';
import {
  Zap,
  Save,
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Plus,
  Settings,
  Clock,
  Activity,
  Mail,
  Bell,
  CheckSquare,
  FileText,
  Link,
  Tag,
  Users,
  Layers,
  History,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
} from 'lucide-react';
import {
  TRIGGER_LABELS,
  ACTION_LABELS,
  OPERATOR_LABELS,
  CRMTriggerType,
  CRMActionType,
} from '@/lib/crm/workflowConstants';

interface Workflow {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: {
    type: string;
    conditions: any[];
  };
  actions: any[];
  executionCount: number;
  lastExecutedAt?: string;
  createdBy: { name: string };
  recentExecutions?: any[];
}

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

const ACTION_ICONS: Record<string, any> = {
  send_email: Mail,
  send_notification: Bell,
  create_task: CheckSquare,
  create_activity: FileText,
  update_field: Settings,
  move_stage: Layers,
  assign_owner: Users,
  add_tag: Tag,
  remove_tag: Tag,
  webhook: Link,
  delay: Clock,
};

// Custom node components with dark mode support
function TriggerNode({ data }: { data: any }) {
  return (
    <div className="bg-yellow-100 dark:bg-yellow-900/50 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 min-w-[200px] shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        <span className="font-bold text-yellow-800 dark:text-yellow-200">Trigger</span>
      </div>
      <p className="text-sm text-yellow-700 dark:text-yellow-300">{data.label}</p>
      {data.conditions?.length > 0 && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
          {data.conditions.length} condición(es)
        </p>
      )}
    </div>
  );
}

function ActionNode({ data }: { data: any }) {
  const Icon = ACTION_ICONS[data.actionType] || Settings;
  return (
    <div className="bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4 min-w-[200px] shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span className="font-bold text-blue-800 dark:text-blue-200">
          {ACTION_LABELS[data.actionType as CRMActionType] || data.actionType}
        </span>
      </div>
      <p className="text-sm text-blue-700 dark:text-blue-300">{data.label}</p>
      {data.delay > 0 && (
        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Esperar {data.delay} min
        </p>
      )}
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
};

export default function WorkflowDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<any>(null);
  const [showExecutions, setShowExecutions] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: '' as CRMTriggerType | '',
    conditions: [] as any[],
    actions: [] as any[],
  });

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';
  const isNew = id === 'new';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      fetchEmailTemplates();
      if (!isNew) {
        fetchWorkflow();
      } else {
        setLoading(false);
      }
    }
  }, [status, id]);

  const fetchEmailTemplates = async () => {
    try {
      const res = await fetch('/api/crm/email-templates');
      if (res.ok) {
        const data = await res.json();
        setEmailTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching email templates:', error);
    }
  };

  useEffect(() => {
    updateFlowFromFormData();
  }, [formData.triggerType, formData.actions]);

  const fetchWorkflow = async () => {
    try {
      const res = await fetch(`/api/crm/workflows/${id}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflow(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          triggerType: data.trigger.type,
          conditions: data.trigger.conditions || [],
          actions: data.actions || [],
        });
      }
    } catch (error) {
      console.error('Error fetching workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFlowFromFormData = () => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Trigger node
    if (formData.triggerType) {
      newNodes.push({
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: TRIGGER_LABELS[formData.triggerType as CRMTriggerType] || formData.triggerType,
          conditions: formData.conditions,
        },
      });
    }

    // Action nodes
    formData.actions.forEach((action, index) => {
      const nodeId = `action_${index}`;
      newNodes.push({
        id: nodeId,
        type: 'action',
        position: { x: 250, y: 150 + index * 120 },
        data: {
          label: getActionLabel(action),
          actionType: action.type,
          delay: action.delay,
        },
      });

      // Connect to previous node
      const prevNodeId = index === 0 ? 'trigger' : `action_${index - 1}`;
      newEdges.push({
        id: `edge_${index}`,
        source: prevNodeId,
        target: nodeId,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#6b7280', strokeWidth: 2 },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const getActionLabel = (action: any): string => {
    switch (action.type) {
      case 'send_email':
        return action.config?.subject || 'Enviar email';
      case 'send_notification':
        return action.config?.message?.substring(0, 30) + '...' || 'Enviar notificación';
      case 'create_task':
        return action.config?.taskTitle || 'Crear tarea';
      case 'create_activity':
        return action.config?.activityTitle || 'Crear actividad';
      case 'update_field':
        return `Actualizar ${action.config?.fieldName || 'campo'}`;
      case 'move_stage':
        return 'Mover a etapa';
      case 'assign_owner':
        return 'Asignar responsable';
      case 'add_tag':
        return `Agregar tag: ${action.config?.tag || ''}`;
      case 'remove_tag':
        return `Quitar tag: ${action.config?.tag || ''}`;
      case 'webhook':
        return action.config?.url?.substring(0, 30) + '...' || 'Llamar webhook';
      case 'delay':
        return `Esperar ${action.config?.delayMinutes || 0} minutos`;
      default:
        return action.type;
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.triggerType || formData.actions.length === 0) {
      alert('Complete todos los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: formData.name,
        description: formData.description,
        trigger: {
          type: formData.triggerType,
          conditions: formData.conditions,
        },
        actions: formData.actions,
      };

      const res = await fetch(
        isNew ? '/api/crm/workflows' : `/api/crm/workflows/${id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (isNew) {
          router.push(`/crm/workflows/${data._id}`);
        } else {
          fetchWorkflow();
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkflow = async () => {
    try {
      const res = await fetch(`/api/crm/workflows/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        fetchWorkflow();
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const addAction = (type: CRMActionType) => {
    const newAction = {
      id: `action_${Date.now()}`,
      type,
      config: {},
      delay: 0,
      order: formData.actions.length,
    };
    setEditingAction(newAction);
    setShowActionModal(true);
  };

  const saveAction = (action: any) => {
    const existingIndex = formData.actions.findIndex(a => a.id === action.id);
    if (existingIndex >= 0) {
      const newActions = [...formData.actions];
      newActions[existingIndex] = action;
      setFormData({ ...formData, actions: newActions });
    } else {
      setFormData({ ...formData, actions: [...formData.actions, action] });
    }
    setShowActionModal(false);
    setEditingAction(null);
  };

  const removeAction = (actionId: string) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter(a => a.id !== actionId),
    });
  };

  const triggerTypes = Object.entries(TRIGGER_LABELS) as [CRMTriggerType, string][];
  const actionTypes = Object.entries(ACTION_LABELS) as [CRMActionType, string][];

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/crm/workflows')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del workflow"
                className="text-xl font-bold border-none focus:outline-none focus:ring-0 w-96 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                disabled={!isAdmin}
              />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción (opcional)"
                className="block text-sm border-none focus:outline-none focus:ring-0 w-96 bg-transparent text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && workflow && (
              <>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  workflow.isActive
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {workflow.isActive ? 'Activo' : 'Inactivo'}
                </span>
                {isAdmin && (
                  <button
                    onClick={toggleWorkflow}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                      workflow.isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900'
                        : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900'
                    }`}
                  >
                    {workflow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {workflow.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </>
            )}
            {isAdmin && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {/* Trigger Section */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Trigger (Evento)
              </h3>
              <select
                value={formData.triggerType}
                onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as CRMTriggerType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={!isAdmin}
              >
                <option value="">Seleccionar trigger...</option>
                {triggerTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Actions Section */}
            <div className="p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Acciones ({formData.actions.length})
              </h3>

              {/* Actions List */}
              <div className="space-y-2 mb-4">
                {formData.actions.map((action, index) => {
                  const Icon = ACTION_ICONS[action.type] || Settings;
                  return (
                    <div
                      key={action.id}
                      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500 w-4">{index + 1}</span>
                        <Icon className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{getActionLabel(action)}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingAction(action);
                              setShowActionModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeAction(action.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Action Button */}
              {isAdmin && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Agregar acción:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {actionTypes.map(([type, label]) => {
                      const Icon = ACTION_ICONS[type] || Settings;
                      return (
                        <button
                          key={type}
                          onClick={() => addAction(type)}
                          className="flex items-center gap-2 px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Executions Section */}
            {!isNew && workflow?.recentExecutions && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowExecutions(!showExecutions)}
                  className="w-full flex items-center justify-between text-gray-900 dark:text-gray-100 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Ejecuciones Recientes
                  </span>
                  {showExecutions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showExecutions && (
                  <div className="mt-3 space-y-2">
                    {workflow.recentExecutions.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sin ejecuciones aún</p>
                    ) : (
                      workflow.recentExecutions.map((exec: any) => (
                        <div
                          key={exec._id}
                          className={`text-xs p-2 rounded-lg ${
                            exec.status === 'completed'
                              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : exec.status === 'failed'
                              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span>{exec.status}</span>
                            <span>{new Date(exec.createdAt).toLocaleString()}</span>
                          </div>
                          {exec.error && (
                            <p className="text-red-600 dark:text-red-400 mt-1">{exec.error}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flow Canvas */}
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              className="bg-gray-200 dark:bg-gray-900"
            >
              <Background color="#9ca3af" gap={20} />
              <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" />
              <Panel position="top-right" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 text-xs text-gray-500 dark:text-gray-400">
                Vista del flujo de trabajo
              </Panel>
            </ReactFlow>
          </div>
        </div>

        {/* Action Configuration Modal */}
        {showActionModal && editingAction && (
          <ActionConfigModal
            action={editingAction}
            onSave={saveAction}
            onClose={() => {
              setShowActionModal(false);
              setEditingAction(null);
            }}
            emailTemplates={emailTemplates}
          />
        )}
      </div>
    </div>
  );
}

// Action Configuration Modal Component
function ActionConfigModal({
  action,
  onSave,
  onClose,
  emailTemplates = [],
}: {
  action: any;
  onSave: (action: any) => void;
  onClose: () => void;
  emailTemplates?: EmailTemplate[];
}) {
  const [config, setConfig] = useState(action.config || {});
  const [delay, setDelay] = useState(action.delay || 0);
  const [useTemplate, setUseTemplate] = useState(action.config?.useTemplate || false);

  const handleSave = () => {
    onSave({
      ...action,
      config: { ...config, useTemplate },
      delay,
    });
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  const renderConfigFields = () => {
    switch (action.type) {
      case 'send_email':
        return (
          <>
            <div>
              <label className={labelClasses}>Destinatario</label>
              <select
                value={config.to || ''}
                onChange={(e) => setConfig({ ...config, to: e.target.value })}
                className={inputClasses}
              >
                <option value="">Seleccionar...</option>
                <option value="owner">Owner del deal</option>
                <option value="contact">Contacto</option>
                <option value="client">Cliente</option>
              </select>
            </div>

            {/* Selector de contenido: Manual o Plantilla */}
            <div>
              <label className={labelClasses}>Contenido del email</label>
              <div className="flex space-x-4 mt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="emailContentType"
                    checked={!useTemplate}
                    onChange={() => {
                      setUseTemplate(false);
                      setConfig({ ...config, emailTemplateId: undefined });
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Escribir manualmente</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="emailContentType"
                    checked={useTemplate}
                    onChange={() => {
                      setUseTemplate(true);
                      setConfig({ ...config, subject: undefined, body: undefined });
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Usar plantilla</span>
                </label>
              </div>
            </div>

            {useTemplate ? (
              <div>
                <label className={labelClasses}>Plantilla de email</label>
                <select
                  value={config.emailTemplateId || ''}
                  onChange={(e) => setConfig({ ...config, emailTemplateId: e.target.value || undefined })}
                  className={inputClasses}
                >
                  <option value="">Seleccionar plantilla...</option>
                  {emailTemplates.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
                {config.emailTemplateId && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Se usará el asunto y contenido de la plantilla. Las variables se reemplazarán automáticamente.
                  </p>
                )}
                {emailTemplates.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No hay plantillas disponibles. <a href="/crm/email-templates" className="underline">Crear una plantilla</a>
                  </p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className={labelClasses}>Asunto</label>
                  <input
                    type="text"
                    value={config.subject || ''}
                    onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                    className={inputClasses}
                    placeholder="Asunto del email"
                  />
                </div>
                <div>
                  <label className={labelClasses}>Cuerpo</label>
                  <textarea
                    value={config.body || ''}
                    onChange={(e) => setConfig({ ...config, body: e.target.value })}
                    className={inputClasses}
                    rows={4}
                    placeholder="Contenido del email. Usa {{deal.title}}, {{contact.name}}, etc."
                  />
                </div>
              </>
            )}
          </>
        );

      case 'send_notification':
        return (
          <>
            <div>
              <label className={labelClasses}>Tipo de destinatario</label>
              <select
                value={config.recipientType || ''}
                onChange={(e) => setConfig({ ...config, recipientType: e.target.value })}
                className={inputClasses}
              >
                <option value="">Seleccionar...</option>
                <option value="owner">Owner del deal</option>
                <option value="admin">Administradores</option>
                <option value="all_sales">Todos los vendedores</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Mensaje</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                className={inputClasses}
                rows={3}
                placeholder="Mensaje de notificación"
              />
            </div>
            <div>
              <label className={labelClasses}>Prioridad</label>
              <select
                value={config.priority || 'medium'}
                onChange={(e) => setConfig({ ...config, priority: e.target.value })}
                className={inputClasses}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </>
        );

      case 'create_task':
        return (
          <>
            <div>
              <label className={labelClasses}>Título de la tarea</label>
              <input
                type="text"
                value={config.taskTitle || ''}
                onChange={(e) => setConfig({ ...config, taskTitle: e.target.value })}
                className={inputClasses}
                placeholder="Título de la tarea"
              />
            </div>
            <div>
              <label className={labelClasses}>Descripción</label>
              <textarea
                value={config.taskDescription || ''}
                onChange={(e) => setConfig({ ...config, taskDescription: e.target.value })}
                className={inputClasses}
                rows={3}
              />
            </div>
            <div>
              <label className={labelClasses}>Fecha de vencimiento</label>
              <select
                value={config.taskDueDate || ''}
                onChange={(e) => setConfig({ ...config, taskDueDate: e.target.value })}
                className={inputClasses}
              >
                <option value="">Seleccionar...</option>
                <option value="+1 days">En 1 día</option>
                <option value="+2 days">En 2 días</option>
                <option value="+3 days">En 3 días</option>
                <option value="+1 week">En 1 semana</option>
                <option value="+2 weeks">En 2 semanas</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Asignar a</label>
              <select
                value={config.taskAssignTo || ''}
                onChange={(e) => setConfig({ ...config, taskAssignTo: e.target.value })}
                className={inputClasses}
              >
                <option value="owner">Owner del deal</option>
                <option value="specific_user">Usuario específico</option>
              </select>
            </div>
          </>
        );

      case 'create_activity':
        return (
          <>
            <div>
              <label className={labelClasses}>Tipo de actividad</label>
              <select
                value={config.activityType || ''}
                onChange={(e) => setConfig({ ...config, activityType: e.target.value })}
                className={inputClasses}
              >
                <option value="note">Nota</option>
                <option value="call">Llamada</option>
                <option value="email">Email</option>
                <option value="meeting">Reunión</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Título</label>
              <input
                type="text"
                value={config.activityTitle || ''}
                onChange={(e) => setConfig({ ...config, activityTitle: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Descripción</label>
              <textarea
                value={config.activityDescription || ''}
                onChange={(e) => setConfig({ ...config, activityDescription: e.target.value })}
                className={inputClasses}
                rows={3}
              />
            </div>
          </>
        );

      case 'webhook':
        return (
          <>
            <div>
              <label className={labelClasses}>URL</label>
              <input
                type="url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                className={inputClasses}
                placeholder="https://ejemplo.com/webhook"
              />
            </div>
            <div>
              <label className={labelClasses}>Método</label>
              <select
                value={config.method || 'POST'}
                onChange={(e) => setConfig({ ...config, method: e.target.value })}
                className={inputClasses}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </>
        );

      case 'add_tag':
      case 'remove_tag':
        return (
          <div>
            <label className={labelClasses}>Tag</label>
            <input
              type="text"
              value={config.tag || ''}
              onChange={(e) => setConfig({ ...config, tag: e.target.value })}
              className={inputClasses}
              placeholder="Nombre del tag"
            />
          </div>
        );

      case 'delay':
        return (
          <div>
            <label className={labelClasses}>Minutos de espera</label>
            <input
              type="number"
              value={config.delayMinutes || 0}
              onChange={(e) => setConfig({ ...config, delayMinutes: parseInt(e.target.value) })}
              className={inputClasses}
              min={0}
            />
          </div>
        );

      default:
        return <p className="text-gray-500 dark:text-gray-400">Configuración no disponible para este tipo de acción</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
            Configurar: {ACTION_LABELS[action.type as CRMActionType] || action.type}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {renderConfigFields()}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className={labelClasses}>
              Delay antes de ejecutar (minutos)
            </label>
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
              className={inputClasses}
              min={0}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tiempo de espera antes de ejecutar esta acción
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

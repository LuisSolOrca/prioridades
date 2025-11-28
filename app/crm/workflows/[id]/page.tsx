'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import {
  TRIGGER_LABELS,
  ACTION_LABELS,
  OPERATOR_LABELS,
  CRMTriggerType,
  CRMActionType,
} from '@/models/CRMWorkflow';

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

// Custom node components
function TriggerNode({ data }: { data: any }) {
  return (
    <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-yellow-600" />
        <span className="font-bold text-yellow-800">Trigger</span>
      </div>
      <p className="text-sm text-yellow-700">{data.label}</p>
      {data.conditions?.length > 0 && (
        <p className="text-xs text-yellow-600 mt-1">
          {data.conditions.length} condición(es)
        </p>
      )}
    </div>
  );
}

function ActionNode({ data }: { data: any }) {
  const Icon = ACTION_ICONS[data.actionType] || Settings;
  return (
    <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-blue-600" />
        <span className="font-bold text-blue-800">
          {ACTION_LABELS[data.actionType as CRMActionType] || data.actionType}
        </span>
      </div>
      <p className="text-sm text-blue-700">{data.label}</p>
      {data.delay > 0 && (
        <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
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

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<any>(null);
  const [showExecutions, setShowExecutions] = useState(false);

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
    if (!isNew) {
      fetchWorkflow();
    } else {
      setLoading(false);
    }
  }, [id]);

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
        style: { stroke: '#6b7280' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/crm/workflows')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del workflow"
              className="text-xl font-bold border-none focus:outline-none focus:ring-0 w-96"
              disabled={!isAdmin}
            />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción (opcional)"
              className="block text-sm text-gray-500 border-none focus:outline-none focus:ring-0 w-96"
              disabled={!isAdmin}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && workflow && (
            <>
              <span className={`px-3 py-1 rounded-full text-sm ${
                workflow.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {workflow.isActive ? 'Activo' : 'Inactivo'}
              </span>
              {isAdmin && (
                <button
                  onClick={toggleWorkflow}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    workflow.isActive
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r overflow-y-auto">
          {/* Trigger Section */}
          <div className="p-4 border-b">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Trigger (Evento)
            </h3>
            <select
              value={formData.triggerType}
              onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as CRMTriggerType })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
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
                    className="bg-white border rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                      <Icon className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">{getActionLabel(action)}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingAction(action);
                            setShowActionModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeAction(action.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
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
                <p className="text-xs text-gray-500 mb-2">Agregar acción:</p>
                <div className="grid grid-cols-2 gap-2">
                  {actionTypes.map(([type, label]) => {
                    const Icon = ACTION_ICONS[type] || Settings;
                    return (
                      <button
                        key={type}
                        onClick={() => addAction(type)}
                        className="flex items-center gap-2 px-3 py-2 text-xs border rounded-lg hover:bg-blue-50 hover:border-blue-300"
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
            <div className="p-4 border-t">
              <button
                onClick={() => setShowExecutions(!showExecutions)}
                className="w-full flex items-center justify-between text-gray-900 font-medium"
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
                    <p className="text-sm text-gray-500">Sin ejecuciones aún</p>
                  ) : (
                    workflow.recentExecutions.map((exec: any) => (
                      <div
                        key={exec._id}
                        className={`text-xs p-2 rounded-lg ${
                          exec.status === 'completed'
                            ? 'bg-green-50 text-green-700'
                            : exec.status === 'failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>{exec.status}</span>
                          <span>{new Date(exec.createdAt).toLocaleString()}</span>
                        </div>
                        {exec.error && (
                          <p className="text-red-600 mt-1">{exec.error}</p>
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
            className="bg-gray-100"
          >
            <Background />
            <Controls />
            <Panel position="top-right" className="bg-white rounded-lg shadow p-2 text-xs text-gray-500">
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
        />
      )}
    </div>
  );
}

// Action Configuration Modal Component
function ActionConfigModal({
  action,
  onSave,
  onClose,
}: {
  action: any;
  onSave: (action: any) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState(action.config || {});
  const [delay, setDelay] = useState(action.delay || 0);

  const handleSave = () => {
    onSave({
      ...action,
      config,
      delay,
    });
  };

  const renderConfigFields = () => {
    switch (action.type) {
      case 'send_email':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Destinatario</label>
              <select
                value={config.to || ''}
                onChange={(e) => setConfig({ ...config, to: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Seleccionar...</option>
                <option value="owner">Owner del deal</option>
                <option value="contact">Contacto</option>
                <option value="client">Cliente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Asunto</label>
              <input
                type="text"
                value={config.subject || ''}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Asunto del email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cuerpo</label>
              <textarea
                value={config.body || ''}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={4}
                placeholder="Contenido del email. Usa {{deal.title}}, {{contact.name}}, etc."
              />
            </div>
          </>
        );

      case 'send_notification':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de destinatario</label>
              <select
                value={config.recipientType || ''}
                onChange={(e) => setConfig({ ...config, recipientType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Seleccionar...</option>
                <option value="owner">Owner del deal</option>
                <option value="admin">Administradores</option>
                <option value="all_sales">Todos los vendedores</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mensaje</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Mensaje de notificación"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prioridad</label>
              <select
                value={config.priority || 'medium'}
                onChange={(e) => setConfig({ ...config, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
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
              <label className="block text-sm font-medium mb-1">Título de la tarea</label>
              <input
                type="text"
                value={config.taskTitle || ''}
                onChange={(e) => setConfig({ ...config, taskTitle: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Título de la tarea"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={config.taskDescription || ''}
                onChange={(e) => setConfig({ ...config, taskDescription: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de vencimiento</label>
              <select
                value={config.taskDueDate || ''}
                onChange={(e) => setConfig({ ...config, taskDueDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
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
              <label className="block text-sm font-medium mb-1">Asignar a</label>
              <select
                value={config.taskAssignTo || ''}
                onChange={(e) => setConfig({ ...config, taskAssignTo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
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
              <label className="block text-sm font-medium mb-1">Tipo de actividad</label>
              <select
                value={config.activityType || ''}
                onChange={(e) => setConfig({ ...config, activityType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="note">Nota</option>
                <option value="call">Llamada</option>
                <option value="email">Email</option>
                <option value="meeting">Reunión</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <input
                type="text"
                value={config.activityTitle || ''}
                onChange={(e) => setConfig({ ...config, activityTitle: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={config.activityDescription || ''}
                onChange={(e) => setConfig({ ...config, activityDescription: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
          </>
        );

      case 'webhook':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                type="url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://ejemplo.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Método</label>
              <select
                value={config.method || 'POST'}
                onChange={(e) => setConfig({ ...config, method: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
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
            <label className="block text-sm font-medium mb-1">Tag</label>
            <input
              type="text"
              value={config.tag || ''}
              onChange={(e) => setConfig({ ...config, tag: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Nombre del tag"
            />
          </div>
        );

      case 'delay':
        return (
          <div>
            <label className="block text-sm font-medium mb-1">Minutos de espera</label>
            <input
              type="number"
              value={config.delayMinutes || 0}
              onChange={(e) => setConfig({ ...config, delayMinutes: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
            />
          </div>
        );

      default:
        return <p className="text-gray-500">Configuración no disponible para este tipo de acción</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg">
            Configurar: {ACTION_LABELS[action.type as CRMActionType] || action.type}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {renderConfigFields()}

          <div className="pt-4 border-t">
            <label className="block text-sm font-medium mb-1">
              Delay antes de ejecutar (minutos)
            </label>
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tiempo de espera antes de ejecutar esta acción
            </p>
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

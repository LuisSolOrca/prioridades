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
  Handle,
  Position,
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
  Target,
  MessageSquare,
  Hash,
  Filter,
  Edit2,
  GitBranch,
  Split,
  ArrowRight,
} from 'lucide-react';
import {
  TRIGGER_LABELS,
  ACTION_LABELS,
  OPERATOR_LABELS,
  CONDITION_FIELDS,
  CRMTriggerType,
  CRMActionType,
  ConditionOperator,
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

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface Project {
  _id: string;
  name: string;
  clientId: { _id: string; name: string };
}

interface Client {
  _id: string;
  name: string;
}

interface Channel {
  _id: string;
  name: string;
  projectId: string;
  parentId?: string;
}

interface WorkflowCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
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
  create_priority: Target,
  send_channel_message: MessageSquare,
  condition: GitBranch,
  split: Split,
};

// Custom node components with dark mode support
function TriggerNode({ data }: { data: any }) {
  return (
    <div className="bg-yellow-100 dark:bg-yellow-900/50 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 min-w-[200px] shadow-lg relative">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        <span className="font-bold text-yellow-800 dark:text-yellow-200">Trigger</span>
      </div>
      <p className="text-sm text-yellow-700 dark:text-yellow-300">{data.label}</p>
      {data.conditions?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-yellow-700">
          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
            <Filter className="w-3 h-3" />
            <span>{data.conditions.length} condición(es)</span>
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-yellow-500" />
    </div>
  );
}

function ConditionNode({ data }: { data: any }) {
  return (
    <div className="bg-purple-100 dark:bg-purple-900/50 border-2 border-purple-400 dark:border-purple-600 rounded-lg p-3 min-w-[180px] shadow-lg relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />
      <div className="flex items-center gap-2 mb-1">
        <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <span className="font-bold text-xs text-purple-800 dark:text-purple-200">Condiciones</span>
      </div>
      <div className="space-y-1">
        {data.conditions?.map((cond: any, idx: number) => (
          <div key={idx} className="text-xs text-purple-700 dark:text-purple-300">
            {idx > 0 && cond.logicalOperator && (
              <span className={`font-medium ${cond.logicalOperator === 'AND' ? 'text-purple-600' : 'text-orange-600'}`}>
                {cond.logicalOperator === 'AND' ? 'Y ' : 'O '}
              </span>
            )}
            <span className="truncate">{cond.fieldLabel || cond.field}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500" />
    </div>
  );
}

function ActionNode({ data }: { data: any }) {
  const Icon = ACTION_ICONS[data.actionType] || Settings;
  return (
    <div className="bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4 min-w-[200px] shadow-lg relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
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
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
    </div>
  );
}

// Nodo para branching condicional (Si/Entonces)
function ConditionBranchNode({ data }: { data: any }) {
  return (
    <div className="bg-amber-100 dark:bg-amber-900/50 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-4 min-w-[220px] shadow-lg relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-amber-500" />
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <span className="font-bold text-amber-800 dark:text-amber-200">Condición</span>
      </div>
      <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">{data.label}</p>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <ArrowRight className="w-3 h-3" />
          <span>Sí: {data.trueBranchCount || 0} acciones</span>
        </div>
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <ArrowRight className="w-3 h-3" />
          <span>No: {data.falseBranchCount || 0} acciones</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 !bg-green-500" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 !bg-red-500" style={{ left: '70%' }} />
    </div>
  );
}

// Nodo para división A/B
function SplitBranchNode({ data }: { data: any }) {
  return (
    <div className="bg-cyan-100 dark:bg-cyan-900/50 border-2 border-cyan-400 dark:border-cyan-600 rounded-lg p-4 min-w-[220px] shadow-lg relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-cyan-500" />
      <div className="flex items-center gap-2 mb-2">
        <Split className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        <span className="font-bold text-cyan-800 dark:text-cyan-200">División A/B</span>
      </div>
      <p className="text-sm text-cyan-700 dark:text-cyan-300 mb-2">{data.label}</p>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
          <span className="font-medium">A:</span> {data.percentageA || 50}%
        </div>
        <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
          <span className="font-medium">B:</span> {100 - (data.percentageA || 50)}%
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="A" className="w-3 h-3 !bg-cyan-500" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="B" className="w-3 h-3 !bg-cyan-500" style={{ left: '70%' }} />
    </div>
  );
}

// Nodo para acciones dentro de una rama
function BranchActionNode({ data }: { data: any }) {
  const Icon = ACTION_ICONS[data.actionType] || Settings;
  const branchColor = data.branchType === 'true' || data.branchType === 'A'
    ? 'green' : 'red';

  return (
    <div className={`border-2 rounded-lg p-3 min-w-[180px] shadow-md relative ${
      branchColor === 'green'
        ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700'
        : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
    }`}>
      <Handle type="target" position={Position.Top} className={`w-3 h-3 ${branchColor === 'green' ? '!bg-green-500' : '!bg-red-500'}`} />
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${branchColor === 'green' ? 'text-green-600' : 'text-red-600'}`} />
        <span className={`font-medium text-sm ${branchColor === 'green' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
          {ACTION_LABELS[data.actionType as CRMActionType] || data.actionType}
        </span>
      </div>
      <p className={`text-xs ${branchColor === 'green' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
        {data.label}
      </p>
      <Handle type="source" position={Position.Bottom} className={`w-3 h-3 ${branchColor === 'green' ? '!bg-green-500' : '!bg-red-500'}`} />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  conditionBranch: ConditionBranchNode,
  splitBranch: SplitBranchNode,
  branchAction: BranchActionNode,
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
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState<WorkflowCondition | null>(null);
  const [showExecutions, setShowExecutions] = useState(false);
  const [addingToBranch, setAddingToBranch] = useState<{
    parentActionId: string;
    branchKey: 'trueBranch' | 'falseBranch' | 'splitBranchA' | 'splitBranchB';
  } | null>(null);
  const [showBranchActionPicker, setShowBranchActionPicker] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

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
      fetchInitiatives();
      fetchProjects();
      fetchClients();
      fetchChannels();
      if (!isNew) {
        fetchWorkflow();
      } else {
        setLoading(false);
      }
    }
  }, [status, id]);

  const fetchEmailTemplates = async () => {
    try {
      // Filtrar solo plantillas válidas para workflows
      const res = await fetch('/api/crm/email-templates?scope=workflows');
      if (res.ok) {
        const data = await res.json();
        setEmailTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching email templates:', error);
    }
  };

  const fetchInitiatives = async () => {
    try {
      const res = await fetch('/api/initiatives');
      if (res.ok) {
        const data = await res.json();
        setInitiatives(data);
      }
    } catch (error) {
      console.error('Error fetching initiatives:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data || []);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  useEffect(() => {
    updateFlowFromFormData();
  }, [formData.triggerType, formData.conditions, formData.actions]);

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
    let yOffset = 50;
    let lastNodeId = '';
    const centerX = 350;

    // Trigger node
    if (formData.triggerType) {
      newNodes.push({
        id: 'trigger',
        type: 'trigger',
        position: { x: centerX, y: yOffset },
        data: {
          label: TRIGGER_LABELS[formData.triggerType as CRMTriggerType] || formData.triggerType,
          conditions: formData.conditions,
        },
      });
      lastNodeId = 'trigger';
      yOffset += 100;
    }

    // Condition node (if there are trigger conditions)
    if (formData.conditions.length > 0 && formData.triggerType) {
      const conditionsWithLabels = formData.conditions.map(cond => ({
        ...cond,
        fieldLabel: getConditionFieldLabel(cond.field),
      }));
      newNodes.push({
        id: 'conditions',
        type: 'condition',
        position: { x: centerX, y: yOffset },
        data: {
          conditions: conditionsWithLabels,
        },
      });
      newEdges.push({
        id: 'edge_trigger_conditions',
        source: 'trigger',
        target: 'conditions',
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#9333ea', strokeWidth: 2 },
        label: 'Si cumple',
        labelStyle: { fontSize: 10, fill: '#9333ea' },
        labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
      });
      lastNodeId = 'conditions';
      yOffset += 80 + (formData.conditions.length * 20);
    }

    // Recursive function to render actions with branching
    const renderActions = (
      actions: any[],
      startY: number,
      startX: number,
      parentNodeId: string,
      sourceHandle?: string,
      branchType?: 'true' | 'false' | 'A' | 'B',
      depth: number = 0
    ): number => {
      let currentY = startY;
      let prevNodeId = parentNodeId;
      let prevSourceHandle = sourceHandle;

      actions.forEach((action, index) => {
        const nodeId = `action_${action.id}`;
        const isBranching = action.type === 'condition' || action.type === 'split';

        if (isBranching) {
          // Render branching node
          const branchNodeType = action.type === 'condition' ? 'conditionBranch' : 'splitBranch';
          newNodes.push({
            id: nodeId,
            type: branchNodeType,
            position: { x: startX, y: currentY },
            data: {
              label: getActionLabel(action),
              actionType: action.type,
              trueBranchCount: action.config?.trueBranch?.length || 0,
              falseBranchCount: action.config?.falseBranch?.length || 0,
              percentageA: action.config?.splitPercentageA || 50,
            },
          });

          // Connect to previous node
          newEdges.push({
            id: `edge_${nodeId}`,
            source: prevNodeId,
            sourceHandle: prevSourceHandle,
            target: nodeId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: branchType === 'true' || branchType === 'A' ? '#22c55e' : branchType === 'false' || branchType === 'B' ? '#ef4444' : '#6b7280', strokeWidth: 2 },
          });

          const branchOffset = 180 + (depth * 50);
          let maxBranchY = currentY + 100;

          // Render true/A branch
          const trueBranchActions = action.type === 'condition'
            ? (action.config?.trueBranch || []).map((id: string) => formData.actions.find(a => a.id === id)).filter(Boolean)
            : (action.config?.splitBranchA || []).map((id: string) => formData.actions.find(a => a.id === id)).filter(Boolean);

          if (trueBranchActions.length > 0) {
            const trueBranchY = renderActions(
              trueBranchActions,
              currentY + 100,
              startX - branchOffset,
              nodeId,
              action.type === 'condition' ? 'true' : 'A',
              action.type === 'condition' ? 'true' : 'A',
              depth + 1
            );
            maxBranchY = Math.max(maxBranchY, trueBranchY);
          } else {
            // Add placeholder for empty branch
            const placeholderId = `placeholder_${nodeId}_true`;
            newNodes.push({
              id: placeholderId,
              type: 'branchAction',
              position: { x: startX - branchOffset, y: currentY + 100 },
              data: {
                label: '+ Agregar acción',
                actionType: 'placeholder',
                branchType: action.type === 'condition' ? 'true' : 'A',
                parentActionId: action.id,
                branchKey: action.type === 'condition' ? 'trueBranch' : 'splitBranchA',
              },
            });
            newEdges.push({
              id: `edge_${placeholderId}`,
              source: nodeId,
              sourceHandle: action.type === 'condition' ? 'true' : 'A',
              target: placeholderId,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: '#22c55e', strokeWidth: 2, strokeDasharray: '5,5' },
              label: action.type === 'condition' ? 'Sí' : `A (${action.config?.splitPercentageA || 50}%)`,
              labelStyle: { fontSize: 10, fill: '#22c55e' },
              labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
            });
          }

          // Render false/B branch
          const falseBranchActions = action.type === 'condition'
            ? (action.config?.falseBranch || []).map((id: string) => formData.actions.find(a => a.id === id)).filter(Boolean)
            : (action.config?.splitBranchB || []).map((id: string) => formData.actions.find(a => a.id === id)).filter(Boolean);

          if (falseBranchActions.length > 0) {
            const falseBranchY = renderActions(
              falseBranchActions,
              currentY + 100,
              startX + branchOffset,
              nodeId,
              action.type === 'condition' ? 'false' : 'B',
              action.type === 'condition' ? 'false' : 'B',
              depth + 1
            );
            maxBranchY = Math.max(maxBranchY, falseBranchY);
          } else {
            // Add placeholder for empty branch
            const placeholderId = `placeholder_${nodeId}_false`;
            newNodes.push({
              id: placeholderId,
              type: 'branchAction',
              position: { x: startX + branchOffset, y: currentY + 100 },
              data: {
                label: '+ Agregar acción',
                actionType: 'placeholder',
                branchType: action.type === 'condition' ? 'false' : 'B',
                parentActionId: action.id,
                branchKey: action.type === 'condition' ? 'falseBranch' : 'splitBranchB',
              },
            });
            newEdges.push({
              id: `edge_${placeholderId}`,
              source: nodeId,
              sourceHandle: action.type === 'condition' ? 'false' : 'B',
              target: placeholderId,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' },
              label: action.type === 'condition' ? 'No' : `B (${100 - (action.config?.splitPercentageA || 50)}%)`,
              labelStyle: { fontSize: 10, fill: '#ef4444' },
              labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
            });
          }

          currentY = maxBranchY + 50;
        } else {
          // Regular action node
          const nodeType = branchType ? 'branchAction' : 'action';
          newNodes.push({
            id: nodeId,
            type: nodeType,
            position: { x: startX, y: currentY },
            data: {
              label: getActionLabel(action),
              actionType: action.type,
              delay: action.delay,
              branchType: branchType,
            },
          });

          // Connect to previous node
          const edgeColor = branchType === 'true' || branchType === 'A' ? '#22c55e' : branchType === 'false' || branchType === 'B' ? '#ef4444' : '#6b7280';
          newEdges.push({
            id: `edge_${nodeId}`,
            source: prevNodeId,
            sourceHandle: prevSourceHandle,
            target: nodeId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: edgeColor, strokeWidth: 2 },
            ...(index === 0 && branchType ? {
              label: branchType === 'true' ? 'Sí' : branchType === 'false' ? 'No' : branchType,
              labelStyle: { fontSize: 10, fill: edgeColor },
              labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
            } : {}),
          });

          currentY += 100;
        }

        prevNodeId = nodeId;
        prevSourceHandle = undefined;
      });

      return currentY;
    };

    // Get top-level actions (not inside branches)
    const topLevelActions = formData.actions.filter(action => {
      // Check if this action is referenced in any branch
      return !formData.actions.some(a => {
        if (a.type === 'condition') {
          return (a.config?.trueBranch || []).includes(action.id) ||
                 (a.config?.falseBranch || []).includes(action.id);
        }
        if (a.type === 'split') {
          return (a.config?.splitBranchA || []).includes(action.id) ||
                 (a.config?.splitBranchB || []).includes(action.id);
        }
        return false;
      });
    });

    // Render top-level actions
    if (topLevelActions.length > 0) {
      renderActions(topLevelActions, yOffset, centerX, lastNodeId);
    }

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
      case 'create_priority':
        return action.config?.priorityTitle || 'Crear prioridad';
      case 'send_channel_message':
        return action.config?.channelMessageContent?.substring(0, 30) + '...' || 'Mensaje a canal';
      case 'condition':
        const condCount = action.config?.conditions?.length || 0;
        return `Si ${condCount} condición(es)...`;
      case 'split':
        const pctA = action.config?.splitPercentageA || 50;
        return `División A/B (${pctA}% / ${100 - pctA}%)`;
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

  // Add action to a specific branch
  const addActionToBranch = (type: CRMActionType, parentActionId: string, branchKey: string) => {
    const newAction = {
      id: `action_${Date.now()}`,
      type,
      config: {},
      delay: 0,
      order: formData.actions.length,
    };
    setEditingAction(newAction);
    setAddingToBranch({ parentActionId, branchKey: branchKey as any });
    setShowActionModal(true);
    setShowBranchActionPicker(false);
  };

  // Handle click on placeholder node to add action to branch
  const handleNodeClick = useCallback((event: any, node: Node) => {
    if (node.data?.actionType === 'placeholder' && node.data?.parentActionId) {
      setAddingToBranch({
        parentActionId: node.data.parentActionId,
        branchKey: node.data.branchKey,
      });
      setShowBranchActionPicker(true);
    }
  }, []);

  const saveAction = (action: any) => {
    const existingIndex = formData.actions.findIndex(a => a.id === action.id);

    if (existingIndex >= 0) {
      // Update existing action
      const newActions = [...formData.actions];
      newActions[existingIndex] = action;
      setFormData({ ...formData, actions: newActions });
    } else {
      // New action
      if (addingToBranch) {
        // Add to specific branch
        const { parentActionId, branchKey } = addingToBranch;
        const newActions = [...formData.actions, action];
        const parentIndex = newActions.findIndex(a => a.id === parentActionId);

        if (parentIndex >= 0) {
          const parentAction = { ...newActions[parentIndex] };
          parentAction.config = { ...parentAction.config };
          parentAction.config[branchKey] = [...(parentAction.config[branchKey] || []), action.id];
          newActions[parentIndex] = parentAction;
        }

        setFormData({ ...formData, actions: newActions });
        setAddingToBranch(null);
      } else {
        // Add to main flow
        setFormData({ ...formData, actions: [...formData.actions, action] });
      }
    }
    setShowActionModal(false);
    setEditingAction(null);
  };

  const removeAction = (actionId: string) => {
    // Also remove from any branch that contains this action
    const newActions = formData.actions
      .filter(a => a.id !== actionId)
      .map(action => {
        if (action.type === 'condition' || action.type === 'split') {
          const config = { ...action.config };
          if (config.trueBranch) {
            config.trueBranch = config.trueBranch.filter((id: string) => id !== actionId);
          }
          if (config.falseBranch) {
            config.falseBranch = config.falseBranch.filter((id: string) => id !== actionId);
          }
          if (config.splitBranchA) {
            config.splitBranchA = config.splitBranchA.filter((id: string) => id !== actionId);
          }
          if (config.splitBranchB) {
            config.splitBranchB = config.splitBranchB.filter((id: string) => id !== actionId);
          }
          return { ...action, config };
        }
        return action;
      });
    setFormData({ ...formData, actions: newActions });
  };

  // Get branch info for an action
  const getActionBranchInfo = (actionId: string): { parentId: string; branch: string } | null => {
    for (const action of formData.actions) {
      if (action.type === 'condition') {
        if (action.config?.trueBranch?.includes(actionId)) {
          return { parentId: action.id, branch: 'Sí' };
        }
        if (action.config?.falseBranch?.includes(actionId)) {
          return { parentId: action.id, branch: 'No' };
        }
      }
      if (action.type === 'split') {
        if (action.config?.splitBranchA?.includes(actionId)) {
          return { parentId: action.id, branch: 'A' };
        }
        if (action.config?.splitBranchB?.includes(actionId)) {
          return { parentId: action.id, branch: 'B' };
        }
      }
    }
    return null;
  };

  // Condition management functions
  const addCondition = () => {
    const newCondition: WorkflowCondition = {
      id: `condition_${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      logicalOperator: formData.conditions.length > 0 ? 'AND' : undefined,
    };
    setEditingCondition(newCondition);
    setShowConditionModal(true);
  };

  const saveCondition = (condition: WorkflowCondition) => {
    const existingIndex = formData.conditions.findIndex(c => c.id === condition.id);
    if (existingIndex >= 0) {
      const newConditions = [...formData.conditions];
      newConditions[existingIndex] = condition;
      setFormData({ ...formData, conditions: newConditions });
    } else {
      setFormData({ ...formData, conditions: [...formData.conditions, condition] });
    }
    setShowConditionModal(false);
    setEditingCondition(null);
  };

  const removeCondition = (conditionId: string) => {
    const newConditions = formData.conditions.filter(c => c.id !== conditionId);
    // Adjust logical operators: first condition should not have one
    if (newConditions.length > 0 && newConditions[0].logicalOperator) {
      newConditions[0] = { ...newConditions[0], logicalOperator: undefined };
    }
    setFormData({ ...formData, conditions: newConditions });
  };

  // Get available fields based on trigger type
  const getConditionFieldsForTrigger = (): { value: string; label: string; type: string }[] => {
    const triggerType = formData.triggerType;
    const fields: { value: string; label: string; type: string }[] = [];

    if (triggerType?.startsWith('deal_')) {
      CONDITION_FIELDS.deal?.forEach(f => {
        fields.push({ value: `deal.${f.field}`, label: `Deal - ${f.label}`, type: f.type });
      });
    }
    if (triggerType?.startsWith('contact_')) {
      CONDITION_FIELDS.contact?.forEach(f => {
        fields.push({ value: `contact.${f.field}`, label: `Contacto - ${f.label}`, type: f.type });
      });
    }
    if (triggerType?.startsWith('activity_')) {
      CONDITION_FIELDS.activity?.forEach(f => {
        fields.push({ value: `activity.${f.field}`, label: `Actividad - ${f.label}`, type: f.type });
      });
    }
    if (triggerType?.startsWith('task_')) {
      fields.push(
        { value: 'task.title', label: 'Tarea - Título', type: 'string' },
        { value: 'task.status', label: 'Tarea - Estado', type: 'select' },
        { value: 'task.priority', label: 'Tarea - Prioridad', type: 'select' },
      );
    }
    if (triggerType?.startsWith('quote_')) {
      fields.push(
        { value: 'quote.total', label: 'Cotización - Total', type: 'number' },
        { value: 'quote.status', label: 'Cotización - Estado', type: 'select' },
      );
    }
    // Add deal fields for most triggers (as deals are common context)
    if (!triggerType?.startsWith('deal_') && !triggerType?.startsWith('contact_')) {
      CONDITION_FIELDS.deal?.forEach(f => {
        fields.push({ value: `deal.${f.field}`, label: `Deal - ${f.label}`, type: f.type });
      });
    }

    return fields;
  };

  const getConditionFieldLabel = (fieldValue: string): string => {
    const fields = getConditionFieldsForTrigger();
    const field = fields.find(f => f.value === fieldValue);
    return field?.label || fieldValue;
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
                onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as CRMTriggerType, conditions: [] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={!isAdmin}
              >
                <option value="">Seleccionar trigger...</option>
                {triggerTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Conditions Section */}
            {formData.triggerType && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-purple-500" />
                  Condiciones ({formData.conditions.length})
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  El workflow solo se ejecutará si se cumplen todas las condiciones
                </p>

                {/* Conditions List */}
                {formData.conditions.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.conditions.map((condition, index) => (
                      <div key={condition.id}>
                        {index > 0 && condition.logicalOperator && (
                          <div className="flex justify-center py-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              condition.logicalOperator === 'AND'
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                            }`}>
                              {condition.logicalOperator === 'AND' ? 'Y' : 'O'}
                            </span>
                          </div>
                        )}
                        <div className="bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                {getConditionFieldLabel(condition.field)}
                              </p>
                              <p className="text-xs text-purple-600 dark:text-purple-400">
                                {OPERATOR_LABELS[condition.operator as ConditionOperator] || condition.operator}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {condition.value?.toString() || '(vacío)'}
                              </p>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingCondition(condition);
                                    setShowConditionModal(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => removeCondition(condition.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Condition Button */}
                {isAdmin && (
                  <button
                    onClick={addCondition}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar condición
                  </button>
                )}
              </div>
            )}

            {/* Actions Section */}
            <div className="p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Acciones ({formData.actions.length})
              </h3>

              {/* Actions List with Hierarchy */}
              <div className="space-y-2 mb-4">
                {formData.actions.map((action, index) => {
                  const Icon = ACTION_ICONS[action.type] || Settings;
                  const branchInfo = getActionBranchInfo(action.id);
                  const isBranching = action.type === 'condition' || action.type === 'split';

                  // Don't show actions that are inside branches in the main list
                  if (branchInfo) return null;

                  return (
                    <div key={action.id} className="space-y-1">
                      <div
                        className={`bg-white dark:bg-gray-700 border rounded-lg p-3 ${
                          isBranching
                            ? action.type === 'condition'
                              ? 'border-amber-300 dark:border-amber-700'
                              : 'border-cyan-300 dark:border-cyan-700'
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 dark:text-gray-500 w-4">{index + 1}</span>
                            <Icon className={`w-4 h-4 ${
                              isBranching
                                ? action.type === 'condition' ? 'text-amber-500' : 'text-cyan-500'
                                : 'text-blue-500'
                            }`} />
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

                        {/* Branch management for condition/split actions */}
                        {isBranching && isAdmin && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="grid grid-cols-2 gap-2">
                              {/* True/A Branch */}
                              <div className={`rounded-lg p-2 ${
                                action.type === 'condition'
                                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                  : 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-xs font-medium ${
                                    action.type === 'condition' ? 'text-green-700 dark:text-green-300' : 'text-cyan-700 dark:text-cyan-300'
                                  }`}>
                                    {action.type === 'condition' ? '✓ Sí' : `A (${action.config?.splitPercentageA || 50}%)`}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setAddingToBranch({
                                        parentActionId: action.id,
                                        branchKey: action.type === 'condition' ? 'trueBranch' : 'splitBranchA',
                                      });
                                      setShowBranchActionPicker(true);
                                    }}
                                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-700"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  {((action.type === 'condition' ? action.config?.trueBranch : action.config?.splitBranchA) || [])
                                    .map((actionId: string) => {
                                      const branchAction = formData.actions.find(a => a.id === actionId);
                                      if (!branchAction) return null;
                                      const BranchIcon = ACTION_ICONS[branchAction.type] || Settings;
                                      return (
                                        <div key={actionId} className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 rounded px-2 py-1">
                                          <BranchIcon className="w-3 h-3 text-green-500" />
                                          <span className="truncate text-gray-700 dark:text-gray-300">
                                            {getActionLabel(branchAction)}
                                          </span>
                                          <button
                                            onClick={() => removeAction(actionId)}
                                            className="ml-auto text-gray-400 hover:text-red-500"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  {((action.type === 'condition' ? action.config?.trueBranch : action.config?.splitBranchA) || []).length === 0 && (
                                    <p className="text-xs text-gray-400 italic">Sin acciones</p>
                                  )}
                                </div>
                              </div>

                              {/* False/B Branch */}
                              <div className={`rounded-lg p-2 ${
                                action.type === 'condition'
                                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                  : 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-xs font-medium ${
                                    action.type === 'condition' ? 'text-red-700 dark:text-red-300' : 'text-cyan-700 dark:text-cyan-300'
                                  }`}>
                                    {action.type === 'condition' ? '✗ No' : `B (${100 - (action.config?.splitPercentageA || 50)}%)`}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setAddingToBranch({
                                        parentActionId: action.id,
                                        branchKey: action.type === 'condition' ? 'falseBranch' : 'splitBranchB',
                                      });
                                      setShowBranchActionPicker(true);
                                    }}
                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  {((action.type === 'condition' ? action.config?.falseBranch : action.config?.splitBranchB) || [])
                                    .map((actionId: string) => {
                                      const branchAction = formData.actions.find(a => a.id === actionId);
                                      if (!branchAction) return null;
                                      const BranchIcon = ACTION_ICONS[branchAction.type] || Settings;
                                      return (
                                        <div key={actionId} className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 rounded px-2 py-1">
                                          <BranchIcon className="w-3 h-3 text-red-500" />
                                          <span className="truncate text-gray-700 dark:text-gray-300">
                                            {getActionLabel(branchAction)}
                                          </span>
                                          <button
                                            onClick={() => removeAction(actionId)}
                                            className="ml-auto text-gray-400 hover:text-red-500"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  {((action.type === 'condition' ? action.config?.falseBranch : action.config?.splitBranchB) || []).length === 0 && (
                                    <p className="text-xs text-gray-400 italic">Sin acciones</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Action Button */}
              {isAdmin && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Agregar acción al flujo principal:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {actionTypes.map(([type, label]) => {
                      const Icon = ACTION_ICONS[type] || Settings;
                      const isBranchingType = type === 'condition' || type === 'split';
                      return (
                        <button
                          key={type}
                          onClick={() => addAction(type)}
                          className={`flex items-center gap-2 px-3 py-2 text-xs border rounded-lg transition ${
                            isBranchingType
                              ? type === 'condition'
                                ? 'border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
                                : 'border-cyan-200 dark:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:border-cyan-300 dark:hover:border-cyan-600 bg-cyan-50/50 dark:bg-cyan-900/10'
                              : 'border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-700'
                          } text-gray-700 dark:text-gray-300`}
                        >
                          <Icon className={`w-4 h-4 ${
                            isBranchingType
                              ? type === 'condition' ? 'text-amber-500' : 'text-cyan-500'
                              : ''
                          }`} />
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
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.3}
              maxZoom={1.5}
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
              className="bg-gray-200 dark:bg-gray-900"
            >
              <Background color="#9ca3af" gap={20} />
              <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" />
              <Panel position="top-right" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 text-xs text-gray-500 dark:text-gray-400">
                Clic en &quot;+ Agregar acción&quot; para añadir a una rama
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
            initiatives={initiatives}
            projects={projects}
            clients={clients}
            channels={channels}
          />
        )}

        {/* Condition Configuration Modal */}
        {showConditionModal && editingCondition && (
          <ConditionConfigModal
            condition={editingCondition}
            isFirst={formData.conditions.length === 0 || formData.conditions[0]?.id === editingCondition.id}
            availableFields={getConditionFieldsForTrigger()}
            onSave={saveCondition}
            onClose={() => {
              setShowConditionModal(false);
              setEditingCondition(null);
            }}
          />
        )}

        {/* Branch Action Picker Modal */}
        {showBranchActionPicker && addingToBranch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" />
                  Agregar acción a rama {addingToBranch.branchKey === 'trueBranch' || addingToBranch.branchKey === 'splitBranchA' ? (
                    <span className="text-green-600">{addingToBranch.branchKey === 'trueBranch' ? '"Sí"' : '"A"'}</span>
                  ) : (
                    <span className="text-red-600">{addingToBranch.branchKey === 'falseBranch' ? '"No"' : '"B"'}</span>
                  )}
                </h3>
                <button
                  onClick={() => {
                    setShowBranchActionPicker(false);
                    setAddingToBranch(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Selecciona el tipo de acción a agregar:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {actionTypes
                    .filter(([type]) => type !== 'condition' && type !== 'split') // Don't allow nested branching for now
                    .map(([type, label]) => {
                      const Icon = ACTION_ICONS[type] || Settings;
                      return (
                        <button
                          key={type}
                          onClick={() => addActionToBranch(type, addingToBranch.parentActionId, addingToBranch.branchKey)}
                          className="flex items-center gap-2 px-3 py-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
                        >
                          <Icon className="w-5 h-5 text-blue-500" />
                          {label}
                        </button>
                      );
                    })}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowBranchActionPicker(false);
                    setAddingToBranch(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
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
  initiatives = [],
  projects = [],
  clients = [],
  channels = [],
}: {
  action: any;
  onSave: (action: any) => void;
  onClose: () => void;
  emailTemplates?: EmailTemplate[];
  initiatives?: Initiative[];
  projects?: Project[];
  clients?: Client[];
  channels?: Channel[];
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

      case 'condition':
        return (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <GitBranch className="w-4 h-4 inline mr-1" />
                La condición evaluará los datos del trigger y ejecutará diferentes acciones según el resultado.
              </p>
            </div>

            {/* Condiciones */}
            <div>
              <label className={labelClasses}>Condiciones a evaluar</label>
              <div className="space-y-2 mb-2">
                {(config.conditions || []).map((cond: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {idx > 0 && (
                      <select
                        value={cond.logic || 'AND'}
                        onChange={(e) => {
                          const newConds = [...(config.conditions || [])];
                          newConds[idx] = { ...newConds[idx], logic: e.target.value };
                          setConfig({ ...config, conditions: newConds });
                        }}
                        className="text-xs px-2 py-1 border rounded bg-white dark:bg-gray-600"
                      >
                        <option value="AND">Y</option>
                        <option value="OR">O</option>
                      </select>
                    )}
                    <input
                      type="text"
                      value={cond.field || ''}
                      onChange={(e) => {
                        const newConds = [...(config.conditions || [])];
                        newConds[idx] = { ...newConds[idx], field: e.target.value };
                        setConfig({ ...config, conditions: newConds });
                      }}
                      className="flex-1 text-sm px-2 py-1 border rounded bg-white dark:bg-gray-600"
                      placeholder="Campo (ej: deal.value)"
                    />
                    <select
                      value={cond.operator || 'equals'}
                      onChange={(e) => {
                        const newConds = [...(config.conditions || [])];
                        newConds[idx] = { ...newConds[idx], operator: e.target.value };
                        setConfig({ ...config, conditions: newConds });
                      }}
                      className="text-xs px-2 py-1 border rounded bg-white dark:bg-gray-600"
                    >
                      <option value="equals">=</option>
                      <option value="not_equals">≠</option>
                      <option value="greater_than">&gt;</option>
                      <option value="less_than">&lt;</option>
                      <option value="contains">contiene</option>
                      <option value="is_empty">vacío</option>
                    </select>
                    <input
                      type="text"
                      value={cond.value || ''}
                      onChange={(e) => {
                        const newConds = [...(config.conditions || [])];
                        newConds[idx] = { ...newConds[idx], value: e.target.value };
                        setConfig({ ...config, conditions: newConds });
                      }}
                      className="w-24 text-sm px-2 py-1 border rounded bg-white dark:bg-gray-600"
                      placeholder="Valor"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newConds = (config.conditions || []).filter((_: any, i: number) => i !== idx);
                        setConfig({ ...config, conditions: newConds });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newConds = [...(config.conditions || []), { field: '', operator: 'equals', value: '', logic: 'AND' }];
                  setConfig({ ...config, conditions: newConds });
                }}
                className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar condición
              </button>
            </div>

            <div>
              <label className={labelClasses}>Lógica entre condiciones</label>
              <select
                value={config.conditionLogic || 'AND'}
                onChange={(e) => setConfig({ ...config, conditionLogic: e.target.value })}
                className={inputClasses}
              >
                <option value="AND">Todas deben cumplirse (AND)</option>
                <option value="OR">Al menos una debe cumplirse (OR)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div>
                <label className={`${labelClasses} text-green-700 dark:text-green-400`}>
                  ✓ Si se cumple (rama verdadera)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Selecciona las acciones que se ejecutarán si la condición es verdadera
                </p>
                <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  {(config.trueBranch || []).length} acciones configuradas
                </div>
              </div>
              <div>
                <label className={`${labelClasses} text-red-700 dark:text-red-400`}>
                  ✗ Si NO se cumple (rama falsa)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Selecciona las acciones que se ejecutarán si la condición es falsa
                </p>
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {(config.falseBranch || []).length} acciones configuradas
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Tip: Para configurar las acciones de cada rama, primero guarda esta condición y luego podrás agregar acciones específicas para cada rama.
            </p>
          </>
        );

      case 'split':
        return (
          <>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-cyan-800 dark:text-cyan-200">
                <Split className="w-4 h-4 inline mr-1" />
                La división A/B enviará aleatoriamente a los contactos por una de las dos ramas según el porcentaje configurado.
              </p>
            </div>

            <div>
              <label className={labelClasses}>Nombre del test (opcional)</label>
              <input
                type="text"
                value={config.splitName || ''}
                onChange={(e) => setConfig({ ...config, splitName: e.target.value })}
                className={inputClasses}
                placeholder="Ej: Test de asunto de email"
              />
            </div>

            <div>
              <label className={labelClasses}>Distribución</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs text-cyan-600 dark:text-cyan-400">Rama A</label>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={config.splitPercentageA || 50}
                    onChange={(e) => setConfig({ ...config, splitPercentageA: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div className="text-center w-24">
                  <span className="text-lg font-bold text-cyan-600">{config.splitPercentageA || 50}%</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-lg font-bold text-cyan-600">{100 - (config.splitPercentageA || 50)}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg">
                <label className={`${labelClasses} text-cyan-700 dark:text-cyan-400`}>
                  Rama A ({config.splitPercentageA || 50}%)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Acciones para el grupo A
                </p>
                <div className="text-xs text-cyan-600">
                  {(config.splitBranchA || []).length} acciones
                </div>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg">
                <label className={`${labelClasses} text-cyan-700 dark:text-cyan-400`}>
                  Rama B ({100 - (config.splitPercentageA || 50)}%)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Acciones para el grupo B
                </p>
                <div className="text-xs text-cyan-600">
                  {(config.splitBranchB || []).length} acciones
                </div>
              </div>
            </div>
          </>
        );

      case 'create_priority':
        return (
          <>
            <div>
              <label className={labelClasses}>Título de la prioridad *</label>
              <input
                type="text"
                value={config.priorityTitle || ''}
                onChange={(e) => setConfig({ ...config, priorityTitle: e.target.value })}
                className={inputClasses}
                placeholder="Ej: Seguimiento del deal {{deal.title}}"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Puedes usar variables como {"{{deal.title}}"}, {"{{contact.name}}"}, etc.
              </p>
            </div>
            <div>
              <label className={labelClasses}>Descripción</label>
              <textarea
                value={config.priorityDescription || ''}
                onChange={(e) => setConfig({ ...config, priorityDescription: e.target.value })}
                className={inputClasses}
                rows={3}
                placeholder="Descripción de la prioridad..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Tipo</label>
                <select
                  value={config.priorityType || 'OPERATIVA'}
                  onChange={(e) => setConfig({ ...config, priorityType: e.target.value })}
                  className={inputClasses}
                >
                  <option value="ESTRATEGICA">Estratégica</option>
                  <option value="OPERATIVA">Operativa</option>
                </select>
              </div>
              <div>
                <label className={labelClasses}>Estado inicial</label>
                <select
                  value={config.priorityStatus || 'EN_TIEMPO'}
                  onChange={(e) => setConfig({ ...config, priorityStatus: e.target.value })}
                  className={inputClasses}
                >
                  <option value="EN_TIEMPO">En tiempo</option>
                  <option value="EN_RIESGO">En riesgo</option>
                  <option value="BLOQUEADO">Bloqueado</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClasses}>Semana</label>
              <select
                value={config.priorityWeekOffset || 0}
                onChange={(e) => setConfig({ ...config, priorityWeekOffset: parseInt(e.target.value) })}
                className={inputClasses}
              >
                <option value={0}>Semana actual</option>
                <option value={1}>Próxima semana</option>
                <option value={2}>En 2 semanas</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Asignar a *</label>
              <select
                value={config.priorityAssignTo || ''}
                onChange={(e) => setConfig({ ...config, priorityAssignTo: e.target.value })}
                className={inputClasses}
              >
                <option value="">Seleccionar...</option>
                <option value="deal_owner">Owner del deal</option>
                <option value="trigger_user">Usuario que activó el trigger</option>
                <option value="specific_user">Usuario específico</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Cliente *</label>
              <select
                value={config.priorityClientSource || ''}
                onChange={(e) => setConfig({ ...config, priorityClientSource: e.target.value })}
                className={inputClasses}
              >
                <option value="">Seleccionar...</option>
                <option value="deal_client">Cliente del deal</option>
                <option value="specific_client">Cliente específico</option>
              </select>
            </div>
            {config.priorityClientSource === 'specific_client' && (
              <div>
                <label className={labelClasses}>Seleccionar cliente</label>
                <select
                  value={config.priorityClientId || ''}
                  onChange={(e) => setConfig({ ...config, priorityClientId: e.target.value })}
                  className={inputClasses}
                >
                  <option value="">Seleccionar...</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>{client.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelClasses}>Proyecto (opcional)</label>
              <select
                value={config.priorityProjectId || ''}
                onChange={(e) => setConfig({ ...config, priorityProjectId: e.target.value || undefined })}
                className={inputClasses}
              >
                <option value="">Sin proyecto</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.name} ({project.clientId?.name || 'Sin cliente'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Iniciativas estratégicas *</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                {initiatives.map(initiative => (
                  <label key={initiative._id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(config.priorityInitiativeIds || []).includes(initiative._id)}
                      onChange={(e) => {
                        const currentIds = config.priorityInitiativeIds || [];
                        if (e.target.checked) {
                          setConfig({ ...config, priorityInitiativeIds: [...currentIds, initiative._id] });
                        } else {
                          setConfig({ ...config, priorityInitiativeIds: currentIds.filter((id: string) => id !== initiative._id) });
                        }
                      }}
                      className="text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: initiative.color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{initiative.name}</span>
                  </label>
                ))}
              </div>
              {initiatives.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  No hay iniciativas disponibles
                </p>
              )}
            </div>
            <div>
              <label className={labelClasses}>Tareas (checklist)</label>
              <div className="space-y-2">
                {(config.priorityChecklist || []).map((task: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={task}
                      onChange={(e) => {
                        const newChecklist = [...(config.priorityChecklist || [])];
                        newChecklist[index] = e.target.value;
                        setConfig({ ...config, priorityChecklist: newChecklist });
                      }}
                      className={inputClasses}
                      placeholder={`Tarea ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newChecklist = (config.priorityChecklist || []).filter((_: string, i: number) => i !== index);
                        setConfig({ ...config, priorityChecklist: newChecklist });
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newChecklist = [...(config.priorityChecklist || []), ''];
                    setConfig({ ...config, priorityChecklist: newChecklist });
                  }}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" />
                  Agregar tarea
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Las tareas también soportan variables como {"{{deal.title}}"}, {"{{client.name}}"}, etc.
              </p>
            </div>
          </>
        );

      case 'send_channel_message':
        const selectedProject = projects.find(p => p._id === config.channelProjectId);
        const projectChannels = channels.filter(c => c.projectId === config.channelProjectId);
        const parentChannels = projectChannels.filter(c => !c.parentId);
        const subChannels = config.channelId
          ? projectChannels.filter(c => c.parentId === config.channelId)
          : [];

        return (
          <>
            <div>
              <label className={labelClasses}>Proyecto *</label>
              <select
                value={config.channelProjectId || ''}
                onChange={(e) => setConfig({ ...config, channelProjectId: e.target.value, channelId: '' })}
                className={inputClasses}
              >
                <option value="">Seleccionar proyecto...</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            {config.channelProjectId && (
              <div>
                <label className={labelClasses}>Canal *</label>
                <select
                  value={config.channelId || ''}
                  onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                  className={inputClasses}
                >
                  <option value="">Seleccionar canal...</option>
                  {parentChannels.map(channel => (
                    <optgroup key={channel._id} label={channel.name}>
                      <option value={channel._id}>#{channel.name}</option>
                      {projectChannels
                        .filter(c => c.parentId === channel._id)
                        .map(subChannel => (
                          <option key={subChannel._id} value={subChannel._id}>
                            &nbsp;&nbsp;#{subChannel.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                {projectChannels.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Este proyecto no tiene canales configurados
                  </p>
                )}
              </div>
            )}
            <div>
              <label className={labelClasses}>Contenido del mensaje *</label>
              <textarea
                value={config.channelMessageContent || ''}
                onChange={(e) => setConfig({ ...config, channelMessageContent: e.target.value })}
                className={inputClasses}
                rows={4}
                placeholder="Escribe el mensaje... Puedes usar variables como {{deal.title}}, {{contact.name}}, etc."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Variables disponibles: {"{{deal.title}}"}, {"{{deal.value}}"}, {"{{contact.name}}"}, {"{{client.name}}"}
              </p>
            </div>
            <div>
              <label className={labelClasses}>Tags adicionales (opcional)</label>
              <input
                type="text"
                value={(config.channelMessageTags || []).join(', ')}
                onChange={(e) => setConfig({
                  ...config,
                  channelMessageTags: e.target.value
                    .split(',')
                    .map((t: string) => t.trim().toLowerCase())
                    .filter((t: string) => t)
                })}
                className={inputClasses}
                placeholder="Ej: urgente, crm, automatizado"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Separados por comas. Los hashtags en el mensaje se agregan automáticamente.
              </p>
            </div>
          </>
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

// Condition Configuration Modal Component
function ConditionConfigModal({
  condition,
  isFirst,
  availableFields,
  onSave,
  onClose,
}: {
  condition: WorkflowCondition;
  isFirst: boolean;
  availableFields: { value: string; label: string; type: string }[];
  onSave: (condition: WorkflowCondition) => void;
  onClose: () => void;
}) {
  const [field, setField] = useState(condition.field || '');
  const [operator, setOperator] = useState<ConditionOperator>(condition.operator || 'equals');
  const [value, setValue] = useState(condition.value?.toString() || '');
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>(condition.logicalOperator || 'AND');

  const selectedField = availableFields.find(f => f.value === field);

  // Get applicable operators based on field type
  const getOperatorsForFieldType = (type: string): ConditionOperator[] => {
    switch (type) {
      case 'number':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'];
      case 'boolean':
        return ['equals', 'not_equals'];
      case 'select':
        return ['equals', 'not_equals', 'in_list', 'not_in_list', 'is_empty', 'is_not_empty'];
      default: // string
        return ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'];
    }
  };

  const applicableOperators = selectedField
    ? getOperatorsForFieldType(selectedField.type)
    : Object.keys(OPERATOR_LABELS) as ConditionOperator[];

  const handleSave = () => {
    if (!field || !operator) {
      alert('Selecciona un campo y operador');
      return;
    }
    // For is_empty and is_not_empty, value is not required
    const needsValue = !['is_empty', 'is_not_empty'].includes(operator);
    if (needsValue && !value) {
      alert('Ingresa un valor para la condición');
      return;
    }

    onSave({
      ...condition,
      field,
      operator,
      value: selectedField?.type === 'number' ? parseFloat(value) || 0 : value,
      logicalOperator: isFirst ? undefined : logicalOperator,
    });
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-500" />
            Configurar Condición
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Logical Operator (for non-first conditions) */}
          {!isFirst && (
            <div>
              <label className={labelClasses}>Conectar con la condición anterior</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="logicalOp"
                    checked={logicalOperator === 'AND'}
                    onChange={() => setLogicalOperator('AND')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Y (AND)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="logicalOp"
                    checked={logicalOperator === 'OR'}
                    onChange={() => setLogicalOperator('OR')}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">O (OR)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {logicalOperator === 'AND'
                  ? 'Ambas condiciones deben cumplirse'
                  : 'Al menos una condición debe cumplirse'}
              </p>
            </div>
          )}

          {/* Field Selection */}
          <div>
            <label className={labelClasses}>Campo a evaluar *</label>
            <select
              value={field}
              onChange={(e) => {
                setField(e.target.value);
                setValue(''); // Reset value when field changes
              }}
              className={inputClasses}
            >
              <option value="">Seleccionar campo...</option>
              {availableFields.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Operator Selection */}
          <div>
            <label className={labelClasses}>Operador *</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as ConditionOperator)}
              className={inputClasses}
            >
              {applicableOperators.map(op => (
                <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
              ))}
            </select>
          </div>

          {/* Value Input */}
          {!['is_empty', 'is_not_empty'].includes(operator) && (
            <div>
              <label className={labelClasses}>Valor *</label>
              {selectedField?.type === 'boolean' ? (
                <select
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Seleccionar...</option>
                  <option value="true">Sí / Verdadero</option>
                  <option value="false">No / Falso</option>
                </select>
              ) : selectedField?.type === 'number' ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={inputClasses}
                  placeholder="Ingresa un número"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={inputClasses}
                  placeholder={['in_list', 'not_in_list'].includes(operator) ? 'valor1, valor2, valor3' : 'Ingresa un valor'}
                />
              )}
              {['in_list', 'not_in_list'].includes(operator) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Separa los valores con comas
                </p>
              )}
            </div>
          )}

          {/* Preview */}
          {field && operator && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Vista previa:</p>
              <p className="text-sm text-purple-900 dark:text-purple-100 mt-1">
                {!isFirst && <span className="text-purple-600 dark:text-purple-400">{logicalOperator === 'AND' ? 'Y ' : 'O '}</span>}
                <span className="font-medium">{selectedField?.label || field}</span>
                {' '}
                <span className="text-purple-600 dark:text-purple-400">{OPERATOR_LABELS[operator]}</span>
                {' '}
                {!['is_empty', 'is_not_empty'].includes(operator) && (
                  <span className="font-medium">&quot;{value}&quot;</span>
                )}
              </p>
            </div>
          )}
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
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Guardar Condición
          </button>
        </div>
      </div>
    </div>
  );
}

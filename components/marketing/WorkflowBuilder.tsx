'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus,
  Trash2,
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
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GripVertical,
  ChevronRight,
  X,
  Search,
  Info,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Types
interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action';
  actionType?: string;
  triggerType?: string;
  config: any;
  position: { x: number; y: number };
  nextNodeId?: string;
  trueBranchId?: string;
  falseBranchId?: string;
}

interface WorkflowBuilderProps {
  trigger: { type: string; config: any };
  actions: any[];
  onTriggerChange: (trigger: { type: string; config: any }) => void;
  onActionsChange: (actions: any[]) => void;
  emailTemplates?: any[];
  landingPages?: any[];
  webForms?: any[];
  whatsappTemplates?: any[];
  contactFields?: string[];
  loadingResources?: boolean;
}

// Trigger categories for filtering
const TRIGGER_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'contacto', label: 'Contactos' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'sistema', label: 'Sistema' },
];

// Trigger types with labels, icons, and categories
const TRIGGER_TYPES = [
  { value: 'form_submission', label: 'Formulario', icon: FileText, color: 'bg-blue-500', category: 'marketing', description: 'Cuando alguien envía un formulario' },
  { value: 'landing_page_visit', label: 'Landing Page', icon: Globe, color: 'bg-purple-500', category: 'marketing', description: 'Cuando visitan una landing page' },
  { value: 'email_opened', label: 'Email abierto', icon: Mail, color: 'bg-green-500', category: 'marketing', description: 'Cuando abren un email' },
  { value: 'email_clicked', label: 'Clic en email', icon: MousePointer, color: 'bg-cyan-500', category: 'marketing', description: 'Cuando hacen clic en un enlace' },
  { value: 'contact_created', label: 'Contacto nuevo', icon: Users, color: 'bg-indigo-500', category: 'contacto', description: 'Cuando se crea un contacto' },
  { value: 'contact_updated', label: 'Contacto editado', icon: Users, color: 'bg-indigo-400', category: 'contacto', description: 'Cuando se actualiza un contacto' },
  { value: 'tag_added', label: 'Tag agregado', icon: Tag, color: 'bg-orange-500', category: 'contacto', description: 'Cuando se agrega un tag' },
  { value: 'deal_stage_changed', label: 'Etapa deal', icon: BarChart3, color: 'bg-yellow-500', category: 'ventas', description: 'Cuando cambia la etapa' },
  { value: 'deal_won', label: 'Deal ganado', icon: CheckCircle, color: 'bg-emerald-500', category: 'ventas', description: 'Cuando se gana un deal' },
  { value: 'date_based', label: 'Programado', icon: Calendar, color: 'bg-red-500', category: 'sistema', description: 'En fecha/hora específica' },
  { value: 'webhook', label: 'Webhook', icon: Webhook, color: 'bg-gray-500', category: 'sistema', description: 'Cuando llega un webhook' },
];

// Available variables by trigger type
const TRIGGER_VARIABLES: Record<string, { name: string; description: string }[]> = {
  form_submission: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.lastName}}', description: 'Apellido del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{contact.phone}}', description: 'Teléfono del contacto' },
    { name: '{{contact.company}}', description: 'Empresa del contacto' },
    { name: '{{form.name}}', description: 'Nombre del formulario' },
    { name: '{{form.submittedAt}}', description: 'Fecha de envío' },
  ],
  landing_page_visit: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{page.name}}', description: 'Nombre de la landing' },
    { name: '{{page.url}}', description: 'URL de la landing' },
    { name: '{{visit.date}}', description: 'Fecha de visita' },
  ],
  email_opened: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{email.subject}}', description: 'Asunto del email' },
    { name: '{{email.campaign}}', description: 'Nombre de la campaña' },
    { name: '{{email.openedAt}}', description: 'Fecha de apertura' },
  ],
  email_clicked: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{email.subject}}', description: 'Asunto del email' },
    { name: '{{link.url}}', description: 'URL del enlace clicado' },
    { name: '{{link.clickedAt}}', description: 'Fecha del clic' },
  ],
  contact_created: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.lastName}}', description: 'Apellido del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{contact.phone}}', description: 'Teléfono' },
    { name: '{{contact.company}}', description: 'Empresa' },
    { name: '{{contact.source}}', description: 'Origen del contacto' },
    { name: '{{contact.createdAt}}', description: 'Fecha de creación' },
  ],
  contact_updated: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{contact.updatedField}}', description: 'Campo actualizado' },
    { name: '{{contact.oldValue}}', description: 'Valor anterior' },
    { name: '{{contact.newValue}}', description: 'Valor nuevo' },
  ],
  tag_added: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{tag.name}}', description: 'Nombre del tag agregado' },
    { name: '{{tag.addedAt}}', description: 'Fecha de adición' },
  ],
  deal_stage_changed: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{deal.title}}', description: 'Título del deal' },
    { name: '{{deal.value}}', description: 'Valor del deal' },
    { name: '{{deal.previousStage}}', description: 'Etapa anterior' },
    { name: '{{deal.currentStage}}', description: 'Etapa actual' },
  ],
  deal_won: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{deal.title}}', description: 'Título del deal' },
    { name: '{{deal.value}}', description: 'Valor del deal' },
    { name: '{{deal.wonAt}}', description: 'Fecha de cierre' },
    { name: '{{deal.assignee}}', description: 'Responsable' },
  ],
  date_based: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{schedule.date}}', description: 'Fecha programada' },
    { name: '{{schedule.time}}', description: 'Hora programada' },
  ],
  webhook: [
    { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
    { name: '{{contact.email}}', description: 'Email del contacto' },
    { name: '{{webhook.data}}', description: 'Datos del webhook (JSON)' },
    { name: '{{webhook.receivedAt}}', description: 'Fecha de recepción' },
  ],
};

// Common variables available in all actions
const COMMON_VARIABLES = [
  { name: '{{contact.firstName}}', description: 'Nombre del contacto' },
  { name: '{{contact.lastName}}', description: 'Apellido del contacto' },
  { name: '{{contact.email}}', description: 'Email del contacto' },
  { name: '{{contact.phone}}', description: 'Teléfono' },
  { name: '{{contact.company}}', description: 'Empresa' },
  { name: '{{contact.position}}', description: 'Cargo' },
  { name: '{{today}}', description: 'Fecha de hoy' },
  { name: '{{now}}', description: 'Fecha y hora actual' },
];

// Action types with labels and icons
const ACTION_TYPES = [
  { value: 'send_email', label: 'Enviar email', icon: Mail, color: 'bg-blue-500' },
  { value: 'send_whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'add_tag', label: 'Agregar tag', icon: Tag, color: 'bg-orange-500' },
  { value: 'remove_tag', label: 'Quitar tag', icon: Tag, color: 'bg-orange-400' },
  { value: 'update_contact', label: 'Actualizar', icon: Users, color: 'bg-indigo-500' },
  { value: 'send_notification', label: 'Notificar', icon: Bell, color: 'bg-yellow-500' },
  { value: 'webhook', label: 'Webhook', icon: Globe, color: 'bg-gray-500' },
  { value: 'wait', label: 'Esperar', icon: Clock, color: 'bg-purple-500' },
  { value: 'condition', label: 'Condición', icon: GitBranch, color: 'bg-amber-500' },
  { value: 'split', label: 'Test A/B', icon: GitBranch, color: 'bg-cyan-500' },
];

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const VERTICAL_GAP = 100;
const HORIZONTAL_GAP = 250;

export default function WorkflowBuilder({
  trigger,
  actions,
  onTriggerChange,
  onActionsChange,
  emailTemplates = [],
  landingPages = [],
  webForms = [],
  whatsappTemplates = [],
  contactFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'position', 'source', 'status', 'score', 'notes'],
  loadingResources = false,
}: WorkflowBuilderProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null);
  const [showTriggerMenu, setShowTriggerMenu] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [addingToBranch, setAddingToBranch] = useState<{
    parentActionId: string;
    branchKey: 'trueBranch' | 'falseBranch' | 'splitBranchA' | 'splitBranchB';
  } | null>(null);
  const [showBranchActionPicker, setShowBranchActionPicker] = useState(false);

  // Helper to check if action is in a branch
  const isInBranch = useCallback((actionId: string): boolean => {
    return actions.some(a => {
      if (a.type === 'condition') {
        return (a.config?.trueBranch || []).includes(actionId) ||
               (a.config?.falseBranch || []).includes(actionId);
      }
      if (a.type === 'split') {
        return (a.config?.splitBranchA || []).includes(actionId) ||
               (a.config?.splitBranchB || []).includes(actionId);
      }
      return false;
    });
  }, [actions]);

  // Convert flat actions to positioned nodes for display with branching
  const getNodes = useCallback((): WorkflowNode[] => {
    const nodes: WorkflowNode[] = [];
    const centerX = 400;

    // Trigger node
    nodes.push({
      id: 'trigger',
      type: 'trigger',
      triggerType: trigger.type,
      config: trigger.config,
      position: { x: centerX, y: 50 },
    });

    // Recursive function to position nodes
    const positionActions = (
      actionIds: string[],
      startY: number,
      startX: number,
      depth: number = 0
    ): number => {
      let currentY = startY;

      actionIds.forEach((actionId, index) => {
        const action = actions.find(a => a.id === actionId);
        if (!action) return;

        const isBranching = action.type === 'condition' || action.type === 'split';
        const nodeX = startX;

        nodes.push({
          id: action.id,
          type: 'action',
          actionType: action.type,
          config: action.config,
          position: { x: nodeX, y: currentY },
          nextNodeId: index < actionIds.length - 1 ? actionIds[index + 1] : undefined,
        });

        if (isBranching) {
          const branchOffset = 180 + (depth * 40);
          let maxBranchY = currentY + NODE_HEIGHT + VERTICAL_GAP;

          // True/A branch
          const trueBranchIds = action.type === 'condition'
            ? (action.config?.trueBranch || [])
            : (action.config?.splitBranchA || []);
          if (trueBranchIds.length > 0) {
            const branchEndY = positionActions(trueBranchIds, currentY + NODE_HEIGHT + VERTICAL_GAP, nodeX - branchOffset, depth + 1);
            maxBranchY = Math.max(maxBranchY, branchEndY);
          }

          // False/B branch
          const falseBranchIds = action.type === 'condition'
            ? (action.config?.falseBranch || [])
            : (action.config?.splitBranchB || []);
          if (falseBranchIds.length > 0) {
            const branchEndY = positionActions(falseBranchIds, currentY + NODE_HEIGHT + VERTICAL_GAP, nodeX + branchOffset, depth + 1);
            maxBranchY = Math.max(maxBranchY, branchEndY);
          }

          currentY = maxBranchY + 20;
        } else {
          currentY += NODE_HEIGHT + VERTICAL_GAP;
        }
      });

      return currentY;
    };

    // Get top-level actions (not in any branch)
    const topLevelActionIds = actions
      .filter(a => !isInBranch(a.id))
      .map(a => a.id);

    // Position all top-level actions
    if (topLevelActionIds.length > 0) {
      positionActions(topLevelActionIds, 50 + NODE_HEIGHT + VERTICAL_GAP, centerX);
    }

    return nodes;
  }, [trigger, actions, isInBranch]);

  const nodes = getNodes();

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 2));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('workflow-canvas')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Add action
  const addAction = (type: string, afterNodeId?: string) => {
    const newAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      config: getDefaultConfig(type),
    };

    if (addingToBranch) {
      // Add to specific branch
      const { parentActionId, branchKey } = addingToBranch;
      const newActions = [...actions, newAction];
      const parentIndex = newActions.findIndex(a => a.id === parentActionId);

      if (parentIndex >= 0) {
        const parentAction = { ...newActions[parentIndex] };
        parentAction.config = { ...parentAction.config };
        parentAction.config[branchKey] = [...(parentAction.config[branchKey] || []), newAction.id];
        newActions[parentIndex] = parentAction;
      }

      onActionsChange(newActions);
      setAddingToBranch(null);
      setShowBranchActionPicker(false);
    } else if (afterNodeId) {
      const index = actions.findIndex(a => a.id === afterNodeId);
      const newActions = [...actions];
      newActions.splice(index + 1, 0, newAction);
      onActionsChange(newActions);
    } else {
      onActionsChange([...actions, newAction]);
    }

    setShowAddMenu(null);
    setSelectedNodeId(newAction.id);
  };

  // Add action to a specific branch
  const addActionToBranch = (parentActionId: string, branchKey: 'trueBranch' | 'falseBranch' | 'splitBranchA' | 'splitBranchB') => {
    setAddingToBranch({ parentActionId, branchKey });
    setShowBranchActionPicker(true);
  };

  const getDefaultConfig = (type: string) => {
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

  // Delete action
  const deleteAction = (id: string) => {
    // Also remove from any branch that contains this action
    const newActions = actions
      .filter(a => a.id !== id)
      .map(action => {
        if (action.type === 'condition' || action.type === 'split') {
          const config = { ...action.config };
          if (config.trueBranch) {
            config.trueBranch = config.trueBranch.filter((aid: string) => aid !== id);
          }
          if (config.falseBranch) {
            config.falseBranch = config.falseBranch.filter((aid: string) => aid !== id);
          }
          if (config.splitBranchA) {
            config.splitBranchA = config.splitBranchA.filter((aid: string) => aid !== id);
          }
          if (config.splitBranchB) {
            config.splitBranchB = config.splitBranchB.filter((aid: string) => aid !== id);
          }
          return { ...action, config };
        }
        return action;
      });
    onActionsChange(newActions);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Update action
  const updateAction = (id: string, updates: any) => {
    onActionsChange(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  // Move action
  const moveAction = (fromIndex: number, toIndex: number) => {
    const newActions = [...actions];
    const [moved] = newActions.splice(fromIndex, 1);
    newActions.splice(toIndex, 0, moved);
    onActionsChange(newActions);
  };

  // Get trigger/action info
  const getTriggerInfo = (type: string) => TRIGGER_TYPES.find(t => t.value === type);
  const getActionInfo = (type: string) => ACTION_TYPES.find(a => a.value === type);

  // Render connection line between nodes
  const renderConnection = (fromNode: WorkflowNode, toNode: WorkflowNode, branchType?: 'true' | 'false' | 'A' | 'B') => {
    const fromX = fromNode.position.x + NODE_WIDTH / 2;
    const fromY = fromNode.position.y + NODE_HEIGHT;
    const toX = toNode.position.x + NODE_WIDTH / 2;
    const toY = toNode.position.y;

    const midY = (fromY + toY) / 2;
    const strokeColor = branchType === 'true' || branchType === 'A' ? '#22c55e' : branchType === 'false' || branchType === 'B' ? '#ef4444' : '#94A3B8';
    const label = branchType === 'true' ? 'Sí' : branchType === 'false' ? 'No' : branchType;

    return (
      <g key={`${fromNode.id}-${toNode.id}-${branchType || 'main'}`}>
        <path
          d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeDasharray={fromNode.type === 'trigger' && !trigger.type ? '5,5' : 'none'}
          markerEnd={`url(#arrowhead${branchType ? `-${branchType}` : ''})`}
        />
        {branchType && (
          <text
            x={(fromX + toX) / 2}
            y={midY - 8}
            textAnchor="middle"
            className="text-xs font-medium"
            fill={strokeColor}
          >
            {label}
          </text>
        )}
      </g>
    );
  };

  // Get all branch connections for a branching action
  const getBranchConnections = (fromNode: WorkflowNode) => {
    const connections: JSX.Element[] = [];
    const action = actions.find(a => a.id === fromNode.id);
    if (!action) return connections;

    if (action.type === 'condition') {
      const trueBranchIds = action.config?.trueBranch || [];
      const falseBranchIds = action.config?.falseBranch || [];

      trueBranchIds.forEach((id: string) => {
        const toNode = nodes.find(n => n.id === id);
        if (toNode) {
          connections.push(renderConnection(fromNode, toNode, 'true'));
        }
      });

      falseBranchIds.forEach((id: string) => {
        const toNode = nodes.find(n => n.id === id);
        if (toNode) {
          connections.push(renderConnection(fromNode, toNode, 'false'));
        }
      });
    } else if (action.type === 'split') {
      const branchAIds = action.config?.splitBranchA || [];
      const branchBIds = action.config?.splitBranchB || [];

      branchAIds.forEach((id: string) => {
        const toNode = nodes.find(n => n.id === id);
        if (toNode) {
          connections.push(renderConnection(fromNode, toNode, 'A'));
        }
      });

      branchBIds.forEach((id: string) => {
        const toNode = nodes.find(n => n.id === id);
        if (toNode) {
          connections.push(renderConnection(fromNode, toNode, 'B'));
        }
      });
    }

    return connections;
  };

  // Selected node data
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedAction = selectedNode?.type === 'action' ? actions.find(a => a.id === selectedNodeId) : null;

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-900">
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
          <button
            onClick={() => handleZoom(0.1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
          <button
            onClick={resetView}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Restablecer vista"
          >
            <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="workflow-canvas w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* SVG for connections */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '2000px', height: '2000px' }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
                </marker>
                <marker
                  id="arrowhead-true"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
                <marker
                  id="arrowhead-false"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                </marker>
                <marker
                  id="arrowhead-A"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
                <marker
                  id="arrowhead-B"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                </marker>
              </defs>

              {/* Render main connections */}
              {nodes.map((node, index) => {
                // Skip if this is a branching node or if next node is in a branch
                const action = actions.find(a => a.id === node.id);
                const isBranching = action && (action.type === 'condition' || action.type === 'split');

                if (isBranching) {
                  // Render branch connections instead
                  return getBranchConnections(node);
                }

                // Find next node in main flow
                if (node.type === 'trigger') {
                  const topLevelActions = actions.filter(a => !isInBranch(a.id));
                  if (topLevelActions.length > 0) {
                    const firstAction = nodes.find(n => n.id === topLevelActions[0].id);
                    if (firstAction) {
                      return renderConnection(node, firstAction);
                    }
                  }
                } else if (node.nextNodeId && !isInBranch(node.nextNodeId)) {
                  const nextNode = nodes.find(n => n.id === node.nextNodeId);
                  if (nextNode) {
                    return renderConnection(node, nextNode);
                  }
                }
                return null;
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node, index) => {
              if (node.type === 'trigger') {
                const info = getTriggerInfo(node.triggerType || '');
                const Icon = info?.icon || Zap;

                return (
                  <div
                    key={node.id}
                    className={`absolute transition-shadow cursor-pointer ${
                      selectedNodeId === node.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      left: node.position.x,
                      top: node.position.y,
                      width: NODE_WIDTH,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                  >
                    {/* Trigger Node */}
                    <div className={`rounded-xl shadow-lg overflow-hidden ${
                      node.triggerType ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600'
                    }`}>
                      <div className={`px-3 py-2 ${info?.color || 'bg-yellow-500'} text-white flex items-center gap-2`}>
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-medium">Trigger</span>
                      </div>
                      <div className="p-3">
                        {node.triggerType ? (
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{info?.label}</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTriggerMenu(true);
                            }}
                            className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            + Seleccionar trigger
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Add button below trigger */}
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddMenu(node.id);
                        }}
                        className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              // Action Node
              const info = getActionInfo(node.actionType || '');
              const Icon = info?.icon || Zap;
              const actionIndex = actions.findIndex(a => a.id === node.id);

              return (
                <div
                  key={node.id}
                  className={`absolute transition-shadow ${
                    selectedNodeId === node.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    width: NODE_WIDTH,
                  }}
                  draggable
                  onDragStart={(e) => {
                    setDraggedNode(node.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDraggedNode(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedNode && draggedNode !== node.id) {
                      const fromIndex = actions.findIndex(a => a.id === draggedNode);
                      const toIndex = actionIndex;
                      if (fromIndex !== -1 && toIndex !== -1) {
                        moveAction(fromIndex, toIndex);
                      }
                    }
                  }}
                >
                  <div
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                  >
                    <div className={`px-3 py-2 ${info?.color || 'bg-gray-500'} text-white flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 cursor-move opacity-50" />
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{info?.label}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAction(node.id);
                        }}
                        className="p-1 hover:bg-white/20 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {getNodeDescription(node)}
                      </p>
                    </div>
                  </div>

                  {/* Add button below action */}
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAddMenu(node.id);
                      }}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Add Action Menu - Outside transform container */}
        {showAddMenu && (
          <div
            className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-30"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Agregar acción</h4>
              <button
                onClick={() => setShowAddMenu(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TYPES.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.value}
                    onClick={() => addAction(action.value, showAddMenu === 'trigger' ? undefined : showAddMenu)}
                    className="flex items-center gap-2 p-2 text-left rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <div className={`p-1.5 rounded ${action.color} text-white`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Trigger Selection Menu - Outside transform container */}
        {showTriggerMenu && (
          <TriggerSelectionMenu
            onSelect={(type) => {
              onTriggerChange({ type, config: {} });
              setShowTriggerMenu(false);
              setSelectedNodeId('trigger');
            }}
            onClose={() => setShowTriggerMenu(false)}
          />
        )}

        {/* Branch Action Picker Modal */}
        {showBranchActionPicker && addingToBranch && (
          <div
            className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-30"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                Agregar a rama {addingToBranch.branchKey === 'trueBranch' || addingToBranch.branchKey === 'splitBranchA' ? (
                  <span className="text-green-600">{addingToBranch.branchKey === 'trueBranch' ? '"Sí"' : '"A"'}</span>
                ) : (
                  <span className="text-red-600">{addingToBranch.branchKey === 'falseBranch' ? '"No"' : '"B"'}</span>
                )}
              </h4>
              <button
                onClick={() => {
                  setShowBranchActionPicker(false);
                  setAddingToBranch(null);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TYPES
                .filter(a => a.value !== 'condition' && a.value !== 'split')
                .map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.value}
                      onClick={() => addAction(action.value)}
                      className="flex items-center gap-2 p-2 text-left rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <div className={`p-1.5 rounded ${action.color} text-white`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Properties Panel */}
      <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
        {selectedNodeId ? (
          <div className="p-4">
            {selectedNodeId === 'trigger' ? (
              <TriggerProperties
                trigger={trigger}
                onUpdate={onTriggerChange}
                webForms={webForms}
                landingPages={landingPages}
              />
            ) : selectedAction ? (
              <ActionProperties
                action={selectedAction}
                allActions={actions}
                onUpdate={(updates) => updateAction(selectedAction.id, updates)}
                onAddToBranch={addActionToBranch}
                onDeleteAction={deleteAction}
                emailTemplates={emailTemplates}
                whatsappTemplates={whatsappTemplates}
                contactFields={contactFields}
                loadingResources={loadingResources}
                triggerType={trigger.type}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MousePointer className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">Selecciona un nodo para editar</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for node description
function getNodeDescription(node: WorkflowNode): string {
  if (node.type === 'trigger') return '';

  const config = node.config || {};
  switch (node.actionType) {
    case 'send_email':
      return config.subject || 'Sin asunto configurado';
    case 'add_tag':
    case 'remove_tag':
      return config.tagName || 'Sin tag configurado';
    case 'wait':
      return `Esperar ${config.waitDuration || 1} ${config.waitUnit === 'hours' ? 'horas' : config.waitUnit === 'minutes' ? 'minutos' : 'días'}`;
    case 'send_notification':
      return config.notificationMessage?.substring(0, 30) || 'Sin mensaje';
    case 'webhook':
      return config.webhookUrl?.substring(0, 30) || 'Sin URL';
    case 'condition':
      const condCount = config.conditions?.length || 0;
      return `Si ${condCount} condición(es)`;
    case 'split':
      const pctA = config.splitPercentageA || 50;
      return `A/B: ${pctA}% / ${100 - pctA}%`;
    default:
      return 'Clic para configurar';
  }
}

// Trigger Properties Panel
function TriggerProperties({
  trigger,
  onUpdate,
  webForms,
  landingPages,
}: {
  trigger: { type: string; config: any };
  onUpdate: (trigger: { type: string; config: any }) => void;
  webForms: any[];
  landingPages: any[];
}) {
  const info = TRIGGER_TYPES.find(t => t.value === trigger.type);
  const Icon = info?.icon || Zap;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${info?.color || 'bg-yellow-500'} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Trigger</h3>
          <p className="text-sm text-gray-500">{info?.label || 'No configurado'}</p>
        </div>
      </div>

      {trigger.type && (
        <div className="space-y-4">
          {trigger.type === 'form_submission' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Formulario
              </label>
              <select
                value={trigger.config.formId || ''}
                onChange={e => onUpdate({ ...trigger, config: { ...trigger.config, formId: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
                Landing Page
              </label>
              <select
                value={trigger.config.landingPageId || ''}
                onChange={e => onUpdate({ ...trigger, config: { ...trigger.config, landingPageId: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Cualquier landing</option>
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
                onChange={e => onUpdate({ ...trigger, config: { ...trigger.config, tagName: e.target.value } })}
                placeholder="Ej: cliente-premium"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          )}

          {trigger.type === 'date_based' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select
                  value={trigger.config.schedule?.type || 'once'}
                  onChange={e => onUpdate({
                    ...trigger,
                    config: { ...trigger.config, schedule: { ...trigger.config.schedule, type: e.target.value } }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="once">Una vez</option>
                  <option value="recurring">Recurrente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                <input
                  type="time"
                  value={trigger.config.schedule?.time || '09:00'}
                  onChange={e => onUpdate({
                    ...trigger,
                    config: { ...trigger.config, schedule: { ...trigger.config.schedule, time: e.target.value } }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          )}

          <button
            onClick={() => onUpdate({ type: '', config: {} })}
            className="w-full mt-4 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            Cambiar trigger
          </button>
        </div>
      )}
    </div>
  );
}

// Action Properties Panel
function ActionProperties({
  action,
  allActions,
  onUpdate,
  onAddToBranch,
  onDeleteAction,
  emailTemplates,
  whatsappTemplates,
  contactFields,
  loadingResources,
  triggerType,
}: {
  action: any;
  allActions: any[];
  onUpdate: (updates: any) => void;
  onAddToBranch: (parentActionId: string, branchKey: 'trueBranch' | 'falseBranch' | 'splitBranchA' | 'splitBranchB') => void;
  onDeleteAction: (id: string) => void;
  emailTemplates: any[];
  whatsappTemplates: any[];
  contactFields: string[];
  loadingResources: boolean;
  triggerType?: string;
}) {
  const info = ACTION_TYPES.find(a => a.value === action.type);
  const Icon = info?.icon || Zap;

  const updateConfig = (key: string, value: any) => {
    onUpdate({ config: { ...action.config, [key]: value } });
  };

  // Helper to get action label
  const getActionLabel = (actionId: string): string => {
    const a = allActions.find(act => act.id === actionId);
    if (!a) return 'Acción';
    const aInfo = ACTION_TYPES.find(t => t.value === a.type);
    return aInfo?.label || a.type;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${info?.color || 'bg-gray-500'} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{info?.label}</h3>
          <p className="text-xs text-gray-500">Configurar acción</p>
        </div>
      </div>

      <div className="space-y-4">
        {action.type === 'send_email' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template de email
              </label>
              {loadingResources ? (
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 text-sm">
                  Cargando templates...
                </div>
              ) : (
                <>
                  <select
                    value={action.config.emailTemplateId || ''}
                    onChange={e => updateConfig('emailTemplateId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {emailTemplates.map((t: any) => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.name} {t.isSystem ? '(Sistema)' : ''}
                      </option>
                    ))}
                  </select>
                  {emailTemplates.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      No hay templates disponibles.
                    </p>
                  )}
                  {emailTemplates.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {emailTemplates.length} disponibles
                    </p>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Asunto personalizado
              </label>
              <input
                type="text"
                value={action.config.subject || ''}
                onChange={e => updateConfig('subject', e.target.value)}
                placeholder="Dejar vacío para usar el del template"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </>
        )}

        {action.type === 'send_whatsapp' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template de WhatsApp
            </label>
            {loadingResources ? (
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 text-sm">
                Cargando templates...
              </div>
            ) : (
              <>
                <select
                  value={action.config.whatsappTemplateId || ''}
                  onChange={e => updateConfig('whatsappTemplateId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {whatsappTemplates.map((t: any) => (
                    <option key={t._id} value={t._id}>{t.name} ({t.language})</option>
                  ))}
                </select>
                {whatsappTemplates.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    No hay templates. Configura WhatsApp primero.
                  </p>
                )}
                {whatsappTemplates.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {whatsappTemplates.length} disponibles
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {(action.type === 'add_tag' || action.type === 'remove_tag') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del tag
            </label>
            <input
              type="text"
              value={action.config.tagName || ''}
              onChange={e => updateConfig('tagName', e.target.value)}
              placeholder="Ej: lead-caliente"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        )}

        {action.type === 'update_contact' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Campo a actualizar
              </label>
              <select
                value={action.config.fieldName || ''}
                onChange={e => updateConfig('fieldName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Seleccionar...</option>
                {contactFields.map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nuevo valor
              </label>
              <input
                type="text"
                value={action.config.fieldValue || ''}
                onChange={e => updateConfig('fieldValue', e.target.value)}
                placeholder="Usa {{variable}} para dinámicos"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </>
        )}

        {action.type === 'condition' && (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mb-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Evalúa condiciones y ejecuta diferentes ramas según el resultado.
              </p>
            </div>

            {/* Multiple conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Condiciones
              </label>
              <div className="space-y-2">
                {(action.config.conditions || []).map((cond: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {idx > 0 && (
                      <select
                        value={action.config.conditionOperator || 'AND'}
                        onChange={e => updateConfig('conditionOperator', e.target.value)}
                        className="w-16 text-xs px-1 py-0.5 border rounded bg-white dark:bg-gray-600 mb-1"
                      >
                        <option value="AND">Y</option>
                        <option value="OR">O</option>
                      </select>
                    )}
                    <div className="flex gap-1">
                      <select
                        value={cond.field || ''}
                        onChange={e => {
                          const newConds = [...(action.config.conditions || [])];
                          newConds[idx] = { ...newConds[idx], field: e.target.value };
                          updateConfig('conditions', newConds);
                        }}
                        className="flex-1 text-xs px-2 py-1 border rounded bg-white dark:bg-gray-600"
                      >
                        <option value="">Campo...</option>
                        {contactFields.map(f => (
                          <option key={f} value={`contact.${f}`}>{f}</option>
                        ))}
                        <option value="contact.tags">tags</option>
                        <option value="contact.score">score</option>
                      </select>
                      <select
                        value={cond.operator || 'equals'}
                        onChange={e => {
                          const newConds = [...(action.config.conditions || [])];
                          newConds[idx] = { ...newConds[idx], operator: e.target.value };
                          updateConfig('conditions', newConds);
                        }}
                        className="text-xs px-1 py-1 border rounded bg-white dark:bg-gray-600"
                      >
                        <option value="equals">=</option>
                        <option value="not_equals">≠</option>
                        <option value="contains">∋</option>
                        <option value="greater_than">&gt;</option>
                        <option value="less_than">&lt;</option>
                        <option value="is_empty">vacío</option>
                      </select>
                      <input
                        type="text"
                        value={cond.value || ''}
                        onChange={e => {
                          const newConds = [...(action.config.conditions || [])];
                          newConds[idx] = { ...newConds[idx], value: e.target.value };
                          updateConfig('conditions', newConds);
                        }}
                        className="w-20 text-xs px-2 py-1 border rounded bg-white dark:bg-gray-600"
                        placeholder="Valor"
                      />
                      {(action.config.conditions || []).length > 1 && (
                        <button
                          onClick={() => {
                            const newConds = (action.config.conditions || []).filter((_: any, i: number) => i !== idx);
                            updateConfig('conditions', newConds);
                          }}
                          className="text-red-500 hover:text-red-700 px-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const newConds = [...(action.config.conditions || []), { field: '', operator: 'equals', value: '' }];
                  updateConfig('conditions', newConds);
                }}
                className="mt-2 text-xs text-amber-600 hover:text-amber-700"
              >
                + Agregar condición
              </button>
            </div>

            {/* Branch management */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
              {/* True Branch */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">✓ Rama "Sí"</span>
                  <button
                    onClick={() => onAddToBranch(action.id, 'trueBranch')}
                    className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                <div className="space-y-1">
                  {(action.config.trueBranch || []).map((actionId: string) => {
                    const branchAction = allActions.find(a => a.id === actionId);
                    if (!branchAction) return null;
                    const BranchIcon = ACTION_TYPES.find(t => t.value === branchAction.type)?.icon || Zap;
                    return (
                      <div key={actionId} className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 rounded px-2 py-1">
                        <BranchIcon className="w-3 h-3 text-green-500" />
                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                          {getActionLabel(actionId)}
                        </span>
                        <button
                          onClick={() => onDeleteAction(actionId)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {(action.config.trueBranch || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">Sin acciones</p>
                  )}
                </div>
              </div>

              {/* False Branch */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">✗ Rama "No"</span>
                  <button
                    onClick={() => onAddToBranch(action.id, 'falseBranch')}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                <div className="space-y-1">
                  {(action.config.falseBranch || []).map((actionId: string) => {
                    const branchAction = allActions.find(a => a.id === actionId);
                    if (!branchAction) return null;
                    const BranchIcon = ACTION_TYPES.find(t => t.value === branchAction.type)?.icon || Zap;
                    return (
                      <div key={actionId} className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 rounded px-2 py-1">
                        <BranchIcon className="w-3 h-3 text-red-500" />
                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                          {getActionLabel(actionId)}
                        </span>
                        <button
                          onClick={() => onDeleteAction(actionId)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {(action.config.falseBranch || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">Sin acciones</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {action.type === 'split' && (
          <>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-2 mb-3">
              <p className="text-xs text-cyan-800 dark:text-cyan-200">
                Divide el tráfico aleatoriamente para probar diferentes variantes.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre del test
              </label>
              <input
                type="text"
                value={action.config.splitName || ''}
                onChange={e => updateConfig('splitName', e.target.value)}
                placeholder="Ej: Test asunto email"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Distribución
              </label>
              <input
                type="range"
                min={10}
                max={90}
                value={action.config.splitPercentageA || 50}
                onChange={e => updateConfig('splitPercentageA', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-cyan-600 font-medium">A: {action.config.splitPercentageA || 50}%</span>
                <span className="text-cyan-600 font-medium">B: {100 - (action.config.splitPercentageA || 50)}%</span>
              </div>
            </div>

            {/* Branch management */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
              {/* Branch A */}
              <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
                    Rama A ({action.config.splitPercentageA || 50}%)
                  </span>
                  <button
                    onClick={() => onAddToBranch(action.id, 'splitBranchA')}
                    className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                <div className="space-y-1">
                  {(action.config.splitBranchA || []).map((actionId: string) => {
                    const branchAction = allActions.find(a => a.id === actionId);
                    if (!branchAction) return null;
                    const BranchIcon = ACTION_TYPES.find(t => t.value === branchAction.type)?.icon || Zap;
                    return (
                      <div key={actionId} className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 rounded px-2 py-1">
                        <BranchIcon className="w-3 h-3 text-cyan-500" />
                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                          {getActionLabel(actionId)}
                        </span>
                        <button
                          onClick={() => onDeleteAction(actionId)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {(action.config.splitBranchA || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">Sin acciones</p>
                  )}
                </div>
              </div>

              {/* Branch B */}
              <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
                    Rama B ({100 - (action.config.splitPercentageA || 50)}%)
                  </span>
                  <button
                    onClick={() => onAddToBranch(action.id, 'splitBranchB')}
                    className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>
                <div className="space-y-1">
                  {(action.config.splitBranchB || []).map((actionId: string) => {
                    const branchAction = allActions.find(a => a.id === actionId);
                    if (!branchAction) return null;
                    const BranchIcon = ACTION_TYPES.find(t => t.value === branchAction.type)?.icon || Zap;
                    return (
                      <div key={actionId} className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 rounded px-2 py-1">
                        <BranchIcon className="w-3 h-3 text-cyan-500" />
                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                          {getActionLabel(actionId)}
                        </span>
                        <button
                          onClick={() => onDeleteAction(actionId)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {(action.config.splitBranchB || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">Sin acciones</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {action.type === 'wait' && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duración
              </label>
              <input
                type="number"
                min="1"
                value={action.config.waitDuration || 1}
                onChange={e => updateConfig('waitDuration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unidad
              </label>
              <select
                value={action.config.waitUnit || 'days'}
                onChange={e => updateConfig('waitUnit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mensaje
            </label>
            <textarea
              value={action.config.notificationMessage || ''}
              onChange={e => updateConfig('notificationMessage', e.target.value)}
              placeholder="Nuevo lead: {{contact.name}}"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        )}

        {action.type === 'webhook' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL
              </label>
              <input
                type="url"
                value={action.config.webhookUrl || ''}
                onChange={e => updateConfig('webhookUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Método
              </label>
              <select
                value={action.config.webhookMethod || 'POST'}
                onChange={e => updateConfig('webhookMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </>
        )}

        {/* Variables Reference */}
        <VariablesReference triggerType={triggerType} />
      </div>
    </div>
  );
}

// Trigger Selection Menu with filters
function TriggerSelectionMenu({
  onSelect,
  onClose,
}: {
  onSelect: (type: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filteredTriggers = TRIGGER_TYPES.filter(t => {
    const matchesSearch = search === '' ||
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || t.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-30"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 420,
        maxHeight: '80vh',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white">Seleccionar Trigger</h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar trigger..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-1 mb-3">
        {TRIGGER_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              category === cat.id
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Triggers Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filteredTriggers.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-gray-500">
            No se encontraron triggers
          </div>
        ) : (
          filteredTriggers.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => onSelect(t.value)}
                className="flex flex-col p-3 text-left rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${t.color} text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{t.description}</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// Variables Reference Component
function VariablesReference({ triggerType }: { triggerType?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const variables = triggerType && TRIGGER_VARIABLES[triggerType]
    ? [...TRIGGER_VARIABLES[triggerType], ...COMMON_VARIABLES.filter(cv =>
        !TRIGGER_VARIABLES[triggerType].some(tv => tv.name === cv.name)
      )]
    : COMMON_VARIABLES;

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopied(variable);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Info className="w-4 h-4 text-blue-500" />
          Variables disponibles
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Haz clic en una variable para copiarla
          </p>
          {variables.map((v, idx) => (
            <button
              key={idx}
              onClick={() => copyVariable(v.name)}
              className="flex items-center justify-between w-full p-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group transition-colors"
            >
              <div className="flex-1 min-w-0">
                <code className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all">
                  {v.name}
                </code>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {v.description}
                </p>
              </div>
              <div className="ml-2 flex-shrink-0">
                {copied === v.name ? (
                  <span className="text-xs text-green-600">Copiado!</span>
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

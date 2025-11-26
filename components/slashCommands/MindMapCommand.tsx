'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Minus, Brain } from 'lucide-react';

interface MindMapNode {
  id: string;
  label: string;
  parentId: string | null;
  userId: string;
  userName: string;
}

interface MindMapCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  nodes: MindMapNode[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function MindMapCommand({
  projectId,
  messageId,
  channelId,
  title,
  nodes: initialNodes,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: MindMapCommandProps) {
  const { data: session } = useSession();
  const [mindMapNodes, setMindMapNodes] = useState(initialNodes);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado cuando llegan actualizaciones de Pusher
  useEffect(() => {
    setMindMapNodes(initialNodes);
    setClosed(initialClosed);
  }, [initialNodes, initialClosed]);

  // Convertir nodos de BD a formato ReactFlow
  const convertToFlowNodes = useCallback((mindNodes: MindMapNode[]): Node[] => {
    const flowNodes: Node[] = [];
    const nodeMap = new Map<string, { node: MindMapNode; level: number }>();

    // Calcular niveles
    mindNodes.forEach(node => {
      let level = 0;
      let currentNode = node;
      while (currentNode.parentId) {
        level++;
        const parent = mindNodes.find(n => n.id === currentNode.parentId);
        if (!parent) break;
        currentNode = parent;
      }
      nodeMap.set(node.id, { node, level });
    });

    // Posicionar nodos
    const levelNodes = new Map<number, MindMapNode[]>();
    nodeMap.forEach(({ node, level }) => {
      if (!levelNodes.has(level)) levelNodes.set(level, []);
      levelNodes.get(level)!.push(node);
    });

    levelNodes.forEach((nodes, level) => {
      nodes.forEach((node, index) => {
        flowNodes.push({
          id: node.id,
          type: 'default',
          data: {
            label: (
              <div className="p-2">
                <div className="font-semibold text-sm">{node.label}</div>
                <div className="text-xs text-gray-500 mt-1">{node.userName}</div>
              </div>
            )
          },
          position: {
            x: level * 300,
            y: index * 120 - (nodes.length * 60) / 2
          },
          style: {
            background: level === 0 ? '#3b82f6' : '#f3f4f6',
            color: level === 0 ? 'white' : 'black',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: 0,
            width: 200
          }
        });
      });
    });

    return flowNodes;
  }, []);

  const convertToFlowEdges = useCallback((mindNodes: MindMapNode[]): Edge[] => {
    return mindNodes
      .filter(node => node.parentId)
      .map(node => ({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId!,
        target: node.id,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(convertToFlowNodes(initialNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertToFlowEdges(initialNodes));

  useEffect(() => {
    setNodes(convertToFlowNodes(mindMapNodes));
    setEdges(convertToFlowEdges(mindMapNodes));
  }, [mindMapNodes, convertToFlowNodes, convertToFlowEdges, setNodes, setEdges]);

  const handleAddNode = async (parentId: string | null) => {
    if (!session?.user || closed || submitting) return;

    const label = prompt('Ingresa el texto del nodo:');
    if (!label?.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/mind-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, label: label.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Error al agregar nodo');
        return;
      }

      // Validar que los datos existan antes de actualizar
      // Puede venir como commandData.nodes o directamente en data.nodes
      const newNodes = data?.commandData?.nodes || data?.nodes;
      if (newNodes) {
        setMindMapNodes(newNodes);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error adding node:', error);
      // Solo mostrar alerta si realmente hubo un error de red
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Error de conexión al agregar nodo');
      }
      // No mostrar alerta para otros errores ya que el nodo podría haberse guardado
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (closed || submitting) return;

    const node = mindMapNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.userId !== session?.user?.id && (session?.user as any).role !== 'ADMIN') {
      alert('Solo puedes eliminar tus propios nodos');
      return;
    }

    if (!confirm('¿Eliminar este nodo y todos sus hijos?')) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/mind-map`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Error al eliminar nodo');
        return;
      }

      const newNodes = data?.commandData?.nodes || data?.nodes;
      if (newNodes) {
        setMindMapNodes(newNodes);
      }
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting node:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Error de conexión al eliminar nodo');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar (delay para que ReactFlow renderice las líneas)
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'mind-map',
        title,
        delay: 500 // Esperar 500ms para que ReactFlow renderice completamente
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/mind-map`, {
        method: 'PATCH'
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Error al cerrar');
        return;
      }

      const isClosed = data?.commandData?.closed ?? data?.closed ?? true;
      setClosed(isClosed);
      onUpdate?.();
    } catch (error) {
      console.error('Error closing:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Error de conexión al cerrar');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-cyan-400 dark:border-cyan-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Brain className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Mapa Mental • {mindMapNodes.length} nodos • {closed ? 'Cerrado' : 'Activo'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* ReactFlow */}
      <div className="h-[500px] bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Controles */}
      {!closed && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => handleAddNode(null)}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
          >
            <Plus size={16} />
            Agregar Nodo Raíz
          </button>
        </div>
      )}

      {/* Lista de nodos para acciones */}
      {!closed && mindMapNodes.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
            Acciones Rápidas:
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {mindMapNodes.map(node => (
              <div key={node.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-800 dark:text-gray-200 flex-1">
                  {node.label} <span className="text-xs text-gray-500">({node.userName})</span>
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAddNode(node.id)}
                    disabled={submitting}
                    className="p-1 bg-green-500 hover:bg-green-600 text-white rounded disabled:bg-gray-400"
                    title="Agregar hijo"
                  >
                    <Plus size={14} />
                  </button>
                  {node.userId === session?.user?.id && (
                    <button
                      onClick={() => handleDeleteNode(node.id)}
                      disabled={submitting}
                      className="p-1 bg-red-500 hover:bg-red-600 text-white rounded disabled:bg-gray-400"
                      title="Eliminar"
                    >
                      <Minus size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Mapa mental cerrado
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Mapa Mental
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/mind-map</code>
      </div>
    </div>
  );
}

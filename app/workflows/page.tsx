'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Play, Edit, Trash2, Power, PowerOff, History } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface Workflow {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  conditions: any[];
  actions: any[];
  executeOnce: boolean;
  executionCount: number;
  lastExecuted?: string;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  priority_status_change: '📊 Cambio de estado',
  priority_created: '✨ Prioridad creada',
  priority_updated: '✏️ Prioridad actualizada',
  priority_overdue: '⏰ Prioridad atrasada',
  completion_low: '⚠️ % completado bajo'
};

const ACTION_LABELS: Record<string, string> = {
  send_notification: '🔔 Enviar notificación',
  send_email: '📧 Enviar email',
  change_status: '🔄 Cambiar estado',
  assign_to_user: '👤 Reasignar usuario',
  add_comment: '💬 Agregar comentario'
};

export default function WorkflowsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user) {
      loadWorkflows();
    }
  }, [session]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workflows');
      if (!res.ok) throw new Error('Error cargando workflows');
      const data = await res.json();
      setWorkflows(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState })
      });

      if (!res.ok) throw new Error('Error actualizando workflow');
      await loadWorkflows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteWorkflow = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar workflow "${name}"?`)) return;

    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error eliminando workflow');
      await loadWorkflows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const executeManually = async (workflowId: string, workflowName: string) => {
    const priorityId = prompt(`Ingresa el ID de la prioridad para ejecutar "${workflowName}":`);
    if (!priorityId) return;

    try {
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorityId })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error ejecutando workflow');
      }

      const data = await res.json();
      alert(`✅ Workflow ejecutado\n\nAcciones ejecutadas: ${data.actionsExecuted.length}\n${data.actionsExecuted.map((a: any) => `- ${a.type}: ${a.success ? 'OK' : 'Error'}`).join('\n')}`);
      await loadWorkflows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">⚡ Mis Automatizaciones</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Reglas automáticas que te ayudan a gestionar tus prioridades
              </p>
            </div>
            <button
              onClick={() => router.push('/workflows/new')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Nueva Automatización</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">❌ {error}</p>
          </div>
        )}

        {/* Lista de workflows */}
        {workflows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No hay automatizaciones configuradas</p>
            <button
              onClick={() => router.push('/workflows/new')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Crear tu primera automatización →
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {workflows.map((workflow) => (
              <div
                key={workflow._id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${
                  workflow.isActive ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{workflow.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        workflow.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {workflow.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {workflow.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{workflow.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Ejecutado: {workflow.executionCount} veces</span>
                      {workflow.lastExecuted && (
                        <span>
                          Última ejecución: {new Date(workflow.lastExecuted).toLocaleDateString('es-MX')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => executeManually(workflow._id, workflow.name)}
                      className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      title="Ejecutar manualmente"
                    >
                      <Play size={20} />
                    </button>
                    <button
                      onClick={() => router.push(`/workflows/${workflow._id}/edit`)}
                      className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                      title="Editar"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => toggleActive(workflow._id, workflow.isActive)}
                      className={`p-2 rounded-lg transition-colors ${
                        workflow.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={workflow.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {workflow.isActive ? <Power size={20} /> : <PowerOff size={20} />}
                    </button>
                    <button
                      onClick={() => router.push(`/workflows/${workflow._id}/executions`)}
                      className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      title="Ver historial"
                    >
                      <History size={20} />
                    </button>
                    <button
                      onClick={() => deleteWorkflow(workflow._id, workflow.name)}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Trigger */}
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-200 text-sm mb-2">Disparador</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{TRIGGER_LABELS[workflow.triggerType] || workflow.triggerType}</p>
                    {workflow.executeOnce && (
                      <span className="inline-block mt-2 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        Ejecutar solo una vez
                      </span>
                    )}
                  </div>

                  {/* Conditions */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-2">
                      Condiciones ({workflow.conditions.length})
                    </h4>
                    {workflow.conditions.length === 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Sin condiciones (siempre ejecuta)</p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {workflow.conditions.slice(0, 2).map((cond, idx) => (
                          <li key={idx} className="text-gray-700 dark:text-gray-300">
                            • {cond.type}: {JSON.stringify(cond.value).substring(0, 30)}
                          </li>
                        ))}
                        {workflow.conditions.length > 2 && (
                          <li className="text-gray-500 dark:text-gray-400">+ {workflow.conditions.length - 2} más</li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 border border-green-100 dark:border-green-800">
                    <h4 className="font-semibold text-green-900 dark:text-green-200 text-sm mb-2">
                      Acciones ({workflow.actions.length})
                    </h4>
                    <ul className="text-sm space-y-1">
                      {workflow.actions.slice(0, 2).map((action, idx) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300">
                          {ACTION_LABELS[action.type] || action.type}
                        </li>
                      ))}
                      {workflow.actions.length > 2 && (
                        <li className="text-gray-500 dark:text-gray-400">+ {workflow.actions.length - 2} más</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

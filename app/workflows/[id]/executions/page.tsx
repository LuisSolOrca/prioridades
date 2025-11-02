'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface WorkflowExecution {
  _id: string;
  workflowId: string;
  priorityId: {
    _id: string;
    title: string;
    status: string;
    completionPercentage: number;
  };
  success: boolean;
  error?: string;
  actionsExecuted: Array<{
    type: string;
    success: boolean;
    error?: string;
    details?: any;
  }>;
  executedAt: string;
  duration: number;
}

interface Workflow {
  _id: string;
  name: string;
  description?: string;
}

export default function WorkflowExecutionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user && workflowId) {
      loadWorkflow();
      loadExecutions();
    }
  }, [session, workflowId]);

  const loadWorkflow = async () => {
    try {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) throw new Error('Error cargando workflow');
      const data = await res.json();
      setWorkflow(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workflows/${workflowId}/executions`);
      if (!res.ok) throw new Error('Error cargando ejecuciones');
      const data = await res.json();
      setExecutions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/workflows')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Volver a Workflows</span>
          </button>

          {workflow && (
            <>
              <h1 className="text-3xl font-bold text-gray-900">{workflow.name}</h1>
              {workflow.description && (
                <p className="mt-2 text-gray-600">{workflow.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Historial de ejecuciones ({executions.length} registros)
              </p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {/* Executions list */}
        {executions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No hay ejecuciones registradas para este workflow</p>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => (
              <div
                key={execution._id}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  execution.success ? 'border-green-500' : 'border-red-500'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    {execution.success ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : (
                      <XCircle className="text-red-600" size={24} />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {execution.priorityId?.title || 'Prioridad eliminada'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{new Date(execution.executedAt).toLocaleString('es-MX')}</span>
                        </span>
                        <span>Duración: {execution.duration}ms</span>
                      </div>
                    </div>
                  </div>

                  {execution.priorityId && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      execution.priorityId.status === 'COMPLETADO'
                        ? 'bg-green-100 text-green-800'
                        : execution.priorityId.status === 'EN_TIEMPO'
                        ? 'bg-blue-100 text-blue-800'
                        : execution.priorityId.status === 'EN_RIESGO'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {execution.priorityId.status} ({execution.priorityId.completionPercentage}%)
                    </span>
                  )}
                </div>

                {/* Error message */}
                {!execution.success && execution.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Error:</strong> {execution.error}
                    </p>
                  </div>
                )}

                {/* Actions executed */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Acciones ejecutadas ({execution.actionsExecuted.length})
                  </h4>
                  {execution.actionsExecuted.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No se ejecutaron acciones (condiciones no cumplidas)
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {execution.actionsExecuted.map((action, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-sm ${
                            action.success
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={action.success ? 'text-green-800' : 'text-red-800'}>
                              <strong>{action.type}</strong>
                              {action.success ? ' ✓' : ' ✗'}
                            </span>
                          </div>
                          {action.error && (
                            <p className="text-red-700 mt-1 text-xs">Error: {action.error}</p>
                          )}
                          {action.details && (
                            <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                              {JSON.stringify(action.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

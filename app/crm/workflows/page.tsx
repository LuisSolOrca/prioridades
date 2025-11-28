'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  Edit,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { TRIGGER_LABELS, ACTION_LABELS } from '@/lib/crm/workflowConstants';

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
  createdBy: { name: string; email: string };
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: any;
  actions: any[];
}

export default function WorkflowsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [filterTrigger, setFilterTrigger] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchWorkflows();
    fetchTemplates();
  }, [filterActive, filterTrigger, search]);

  const fetchWorkflows = async () => {
    try {
      const params = new URLSearchParams();
      if (filterActive) params.append('isActive', filterActive);
      if (filterTrigger) params.append('triggerType', filterTrigger);
      if (search) params.append('search', search);

      const res = await fetch(`/api/crm/workflows?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/crm/workflows/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const toggleWorkflow = async (id: string) => {
    try {
      const res = await fetch(`/api/crm/workflows/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        fetchWorkflows();
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este workflow?')) return;

    try {
      const res = await fetch(`/api/crm/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWorkflows();
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const createFromTemplate = async (template: Template) => {
    try {
      const res = await fetch('/api/crm/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          actions: template.actions,
          isActive: false,
        }),
      });

      if (res.ok) {
        const workflow = await res.json();
        router.push(`/crm/workflows/${workflow._id}`);
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const triggerTypes = Object.entries(TRIGGER_LABELS);

  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.isActive).length,
    inactive: workflows.filter(w => !w.isActive).length,
    totalExecutions: workflows.reduce((sum, w) => sum + w.executionCount, 0),
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-500" />
            Workflows y Automatizaciones
          </h1>
          <p className="text-gray-600 mt-1">
            Automatiza acciones basadas en eventos del CRM
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FileText className="w-4 h-4" />
              Usar Template
            </button>
            <button
              onClick={() => router.push('/crm/workflows/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Nuevo Workflow
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Pause className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactivos</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ejecuciones</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalExecutions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <select
          value={filterTrigger}
          onChange={(e) => setFilterTrigger(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los triggers</option>
          {triggerTypes.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          onClick={fetchWorkflows}
          className="p-2 border rounded-lg hover:bg-gray-50"
          title="Refrescar"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay workflows
          </h3>
          <p className="text-gray-500 mb-4">
            Crea tu primer workflow para automatizar acciones del CRM
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Comenzar con un template
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm divide-y">
          {workflows.map((workflow) => (
            <div
              key={workflow._id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => router.push(`/crm/workflows/${workflow._id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${workflow.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Zap className={`w-5 h-5 ${workflow.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        workflow.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {workflow.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {workflow.description || 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {TRIGGER_LABELS[workflow.trigger.type as keyof typeof TRIGGER_LABELS] || workflow.trigger.type}
                      </span>
                      <span>
                        {workflow.actions.length} {workflow.actions.length === 1 ? 'acción' : 'acciones'}
                      </span>
                      <span>
                        {workflow.executionCount} ejecuciones
                      </span>
                      {workflow.lastExecutedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Última: {new Date(workflow.lastExecutedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => toggleWorkflow(workflow._id)}
                        className={`p-2 rounded-lg ${
                          workflow.isActive
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={workflow.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {workflow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => router.push(`/crm/workflows/${workflow._id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Templates de Workflows</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Selecciona un template para crear un workflow rápidamente
                </p>
              </div>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Zap className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                            {TRIGGER_LABELS[template.trigger.type as keyof typeof TRIGGER_LABELS] || template.trigger.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {template.actions.length} acciones
                          </span>
                        </div>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplates(false)}
                className="px-4 py-2 border rounded-lg hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => selectedTemplate && createFromTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear desde Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

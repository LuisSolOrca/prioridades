'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Target,
  Plus,
  Settings,
  Trash2,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Flame,
  Thermometer,
  Snowflake,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
} from 'lucide-react';

// Constants (shared with server but safe for client)
const ENGAGEMENT_ACTION_LABELS: Record<string, string> = {
  email_opened: 'Email abierto',
  email_clicked: 'Click en email',
  email_replied: 'Email respondido',
  quote_viewed: 'Cotización vista',
  quote_accepted: 'Cotización aceptada',
  meeting_scheduled: 'Reunión agendada',
  meeting_completed: 'Reunión completada',
  call_completed: 'Llamada completada',
  form_submitted: 'Formulario enviado',
  website_visited: 'Visita a sitio web',
  document_downloaded: 'Documento descargado',
  demo_requested: 'Demo solicitado',
};

const FIT_OPERATOR_LABELS: Record<string, string> = {
  equals: 'es igual a',
  not_equals: 'no es igual a',
  contains: 'contiene',
  not_contains: 'no contiene',
  greater_than: 'es mayor que',
  less_than: 'es menor que',
  in_list: 'está en',
  not_in_list: 'no está en',
  is_empty: 'está vacío',
  is_not_empty: 'no está vacío',
};

const FIT_FIELDS = [
  { value: 'client.industry', label: 'Industria del cliente' },
  { value: 'client.employeeCount', label: 'Número de empleados' },
  { value: 'client.country', label: 'País' },
  { value: 'client.city', label: 'Ciudad' },
  { value: 'contact.position', label: 'Cargo del contacto' },
  { value: 'contact.department', label: 'Departamento' },
  { value: 'deal.value', label: 'Valor del deal' },
  { value: 'deal.currency', label: 'Moneda' },
];

const SUGGESTED_ENGAGEMENT_POINTS: Record<string, number> = {
  email_opened: 5,
  email_clicked: 10,
  email_replied: 25,
  quote_viewed: 15,
  quote_accepted: 50,
  meeting_scheduled: 30,
  meeting_completed: 40,
  call_completed: 20,
  form_submitted: 35,
  website_visited: 3,
  document_downloaded: 15,
  demo_requested: 45,
};

interface FitRule {
  id: string;
  field: string;
  operator: string;
  value: any;
  points: number;
  description?: string;
}

interface EngagementRule {
  id: string;
  action: string;
  points: number;
  maxPointsPerDay?: number;
  decayPerDay?: number;
  description?: string;
}

interface Config {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  fitRules: FitRule[];
  fitWeight: number;
  engagementRules: EngagementRule[];
  engagementWeight: number;
  hotThreshold: number;
  warmThreshold: number;
  enableDecay: boolean;
  decayStartDays: number;
  decayPerDay: number;
  createdBy: { name: string };
  createdAt: string;
}

interface Stats {
  temperature: {
    hot: number;
    warm: number;
    cold: number;
    totalValue: { hot: number; warm: number; cold: number };
  };
  hotLeads: any[];
  staleCount: number;
  scoreByStage: { stageId: string; stageName: string; avgScore: number; count: number }[];
  scoreDistribution: { range: string; count: number; totalValue: number }[];
}

export default function LeadScoringPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchConfigs();
    fetchStats();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/crm/lead-scoring/config');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/crm/lead-scoring/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRecalculateAll = async () => {
    if (!confirm('¿Recalcular scores de todos los deals? Esto puede tomar unos minutos.')) return;

    setRecalculating(true);
    try {
      const res = await fetch('/api/crm/lead-scoring/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalculate_all' }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchStats();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error recalculating:', error);
      alert('Error al recalcular scores');
    } finally {
      setRecalculating(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('¿Eliminar esta configuración?')) return;

    try {
      const res = await fetch(`/api/crm/lead-scoring/config/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchConfigs();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error deleting config:', error);
    }
  };

  const handleToggleActive = async (config: Config) => {
    try {
      const res = await fetch(`/api/crm/lead-scoring/config/${config._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !config.isActive }),
      });

      if (res.ok) {
        fetchConfigs();
      }
    } catch (error) {
      console.error('Error toggling config:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-7 h-7 text-purple-600" />
              Lead Scoring
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configura reglas para calificar y priorizar leads automáticamente
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <>
                <button
                  onClick={handleRecalculateAll}
                  disabled={recalculating}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                  {recalculating ? 'Recalculando...' : 'Recalcular Todo'}
                </button>
                <button
                  onClick={() => setShowNewConfig(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Configuración
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Hot Leads */}
            <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Leads Hot</p>
                  <p className="text-3xl font-bold">{stats.temperature.hot}</p>
                  <p className="text-red-100 text-sm mt-1">
                    {formatCurrency(stats.temperature.totalValue.hot)}
                  </p>
                </div>
                <Flame className="w-12 h-12 text-red-200" />
              </div>
            </div>

            {/* Warm Leads */}
            <div className="bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Leads Warm</p>
                  <p className="text-3xl font-bold">{stats.temperature.warm}</p>
                  <p className="text-yellow-100 text-sm mt-1">
                    {formatCurrency(stats.temperature.totalValue.warm)}
                  </p>
                </div>
                <Thermometer className="w-12 h-12 text-yellow-200" />
              </div>
            </div>

            {/* Cold Leads */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Leads Cold</p>
                  <p className="text-3xl font-bold">{stats.temperature.cold}</p>
                  <p className="text-blue-100 text-sm mt-1">
                    {formatCurrency(stats.temperature.totalValue.cold)}
                  </p>
                </div>
                <Snowflake className="w-12 h-12 text-blue-200" />
              </div>
            </div>
          </div>
        )}

        {/* Score Distribution & Hot Leads */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Score by Stage */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Score Promedio por Etapa
              </h3>
              <div className="space-y-3">
                {stats.scoreByStage.map((stage) => (
                  <div key={stage.stageId} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-gray-600 dark:text-gray-400 truncate">
                      {stage.stageName}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            stage.avgScore >= 80 ? 'bg-red-500' :
                            stage.avgScore >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${stage.avgScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stage.avgScore}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">({stage.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Hot Leads */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                Top Hot Leads
              </h3>
              <div className="space-y-3">
                {stats.hotLeads.slice(0, 5).map((lead) => (
                  <div
                    key={lead._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => router.push(`/crm/deals/${lead._id}`)}
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{lead.title}</p>
                      <p className="text-sm text-gray-500">{lead.clientId?.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-red-500">
                        <Flame className="w-4 h-4" />
                        <span className="font-bold">{lead.leadScore}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(lead.value)}
                      </p>
                    </div>
                  </div>
                ))}
                {stats.hotLeads.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No hay leads hot actualmente
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alert for stale scores */}
        {stats && stats.staleCount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {stats.staleCount} deals tienen scores desactualizados
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  Considera recalcular los scores para mantener la precisión del sistema.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Configurations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuraciones de Scoring
            </h3>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {configs.map((config) => (
              <div key={config._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setExpandedConfig(
                        expandedConfig === config._id ? null : config._id
                      )}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {expandedConfig === config._id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {config.name}
                        </h4>
                        {config.isDefault && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                            Por defecto
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          config.isActive
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {config.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {config.description && (
                        <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(config)}
                        className={`p-2 rounded-lg ${
                          config.isActive
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {config.isActive ? <CheckCircle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingConfig(config)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!config.isDefault && (
                        <button
                          onClick={() => handleDeleteConfig(config._id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {expandedConfig === config._id && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Thresholds */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">Umbrales</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-red-500" />
                          <span>Hot: ≥ {config.hotThreshold}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-yellow-500" />
                          <span>Warm: ≥ {config.warmThreshold}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Snowflake className="w-4 h-4 text-blue-500" />
                          <span>Cold: &lt; {config.warmThreshold}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Pesos: FIT {config.fitWeight}% | Engagement {config.engagementWeight}%
                        </p>
                        {config.enableDecay && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Decay: -{config.decayPerDay} pts/día después de {config.decayStartDays} días
                          </p>
                        )}
                      </div>
                    </div>

                    {/* FIT Rules */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                        Reglas de FIT ({config.fitRules.length})
                      </h5>
                      <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                        {config.fitRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
                          >
                            <span className="text-gray-600 dark:text-gray-400">
                              {FIT_FIELDS.find(f => f.value === rule.field)?.label || rule.field}{' '}
                              {FIT_OPERATOR_LABELS[rule.operator]} {String(rule.value)}
                            </span>
                            <span className={`font-medium ${rule.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {rule.points > 0 ? '+' : ''}{rule.points}
                            </span>
                          </div>
                        ))}
                        {config.fitRules.length === 0 && (
                          <p className="text-gray-500">Sin reglas de FIT</p>
                        )}
                      </div>
                    </div>

                    {/* Engagement Rules */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 lg:col-span-2">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                        Reglas de Engagement ({config.engagementRules.length})
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                        {config.engagementRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
                          >
                            <span className="text-gray-600 dark:text-gray-400">
                              {ENGAGEMENT_ACTION_LABELS[rule.action] || rule.action}
                            </span>
                            <span className="font-medium text-green-600">+{rule.points}</span>
                          </div>
                        ))}
                        {config.engagementRules.length === 0 && (
                          <p className="text-gray-500 col-span-full">Sin reglas de engagement</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {configs.length === 0 && (
              <div className="p-12 text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay configuraciones de scoring</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowNewConfig(true)}
                    className="mt-4 text-purple-600 hover:text-purple-700"
                  >
                    Crear primera configuración
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* New/Edit Config Modal */}
        {(showNewConfig || editingConfig) && (
          <ConfigModal
            config={editingConfig}
            onClose={() => {
              setShowNewConfig(false);
              setEditingConfig(null);
            }}
            onSave={() => {
              setShowNewConfig(false);
              setEditingConfig(null);
              fetchConfigs();
            }}
          />
        )}
      </div>
    </div>
  );
}

// Modal Component for Creating/Editing Config
function ConfigModal({
  config,
  onClose,
  onSave,
}: {
  config: Config | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: config?.name || '',
    description: config?.description || '',
    isActive: config?.isActive ?? true,
    isDefault: config?.isDefault ?? false,
    fitWeight: config?.fitWeight ?? 40,
    engagementWeight: config?.engagementWeight ?? 60,
    hotThreshold: config?.hotThreshold ?? 80,
    warmThreshold: config?.warmThreshold ?? 50,
    enableDecay: config?.enableDecay ?? true,
    decayStartDays: config?.decayStartDays ?? 7,
    decayPerDay: config?.decayPerDay ?? 2,
    fitRules: config?.fitRules || [],
    engagementRules: config?.engagementRules || [],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = config
        ? `/api/crm/lead-scoring/config/${config._id}`
        : '/api/crm/lead-scoring/config';

      const res = await fetch(url, {
        method: config ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const addFitRule = () => {
    setForm({
      ...form,
      fitRules: [
        ...form.fitRules,
        {
          id: `fit_${Date.now()}`,
          field: 'deal.value',
          operator: 'greater_than',
          value: '',
          points: 10,
        },
      ],
    });
  };

  const addEngagementRule = () => {
    const usedActions = form.engagementRules.map(r => r.action);
    const availableAction = Object.keys(ENGAGEMENT_ACTION_LABELS).find(
      a => !usedActions.includes(a)
    );

    if (!availableAction) {
      alert('Ya tienes reglas para todas las acciones');
      return;
    }

    setForm({
      ...form,
      engagementRules: [
        ...form.engagementRules,
        {
          id: `eng_${Date.now()}`,
          action: availableAction,
          points: SUGGESTED_ENGAGEMENT_POINTS[availableAction] || 10,
        },
      ],
    });
  };

  const removeFitRule = (id: string) => {
    setForm({
      ...form,
      fitRules: form.fitRules.filter(r => r.id !== id),
    });
  };

  const removeEngagementRule = (id: string) => {
    setForm({
      ...form,
      engagementRules: form.engagementRules.filter(r => r.id !== id),
    });
  };

  const updateFitRule = (id: string, updates: Partial<FitRule>) => {
    setForm({
      ...form,
      fitRules: form.fitRules.map(r =>
        r.id === id ? { ...r, ...updates } : r
      ),
    });
  };

  const updateEngagementRule = (id: string, updates: Partial<EngagementRule>) => {
    setForm({
      ...form,
      engagementRules: form.engagementRules.map(r =>
        r.id === id ? { ...r, ...updates } : r
      ),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {config ? 'Editar Configuración' : 'Nueva Configuración'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Por defecto</span>
            </label>
          </div>

          {/* Thresholds */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Umbrales de Temperatura</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Hot (≥)
                </label>
                <input
                  type="number"
                  value={form.hotThreshold}
                  onChange={(e) => setForm({ ...form, hotThreshold: Number(e.target.value) })}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Warm (≥)
                </label>
                <input
                  type="number"
                  value={form.warmThreshold}
                  onChange={(e) => setForm({ ...form, warmThreshold: Number(e.target.value) })}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Peso FIT (%)
                </label>
                <input
                  type="number"
                  value={form.fitWeight}
                  onChange={(e) => setForm({
                    ...form,
                    fitWeight: Number(e.target.value),
                    engagementWeight: 100 - Number(e.target.value),
                  })}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Peso Engagement (%)
                </label>
                <input
                  type="number"
                  value={form.engagementWeight}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Decay Settings */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Decaimiento por Inactividad</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enableDecay}
                  onChange={(e) => setForm({ ...form, enableDecay: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Habilitar</span>
              </label>
            </div>
            {form.enableDecay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Días antes de decay
                  </label>
                  <input
                    type="number"
                    value={form.decayStartDays}
                    onChange={(e) => setForm({ ...form, decayStartDays: Number(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Puntos por día
                  </label>
                  <input
                    type="number"
                    value={form.decayPerDay}
                    onChange={(e) => setForm({ ...form, decayPerDay: Number(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FIT Rules */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Reglas de FIT (Demográficas)</h3>
              <button
                type="button"
                onClick={addFitRule}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Agregar Regla
              </button>
            </div>
            <div className="space-y-2">
              {form.fitRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <select
                    value={rule.field}
                    onChange={(e) => updateFitRule(rule.id, { field: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-800 text-sm"
                  >
                    {FIT_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={rule.operator}
                    onChange={(e) => updateFitRule(rule.id, { operator: e.target.value })}
                    className="w-32 px-2 py-1 border rounded bg-white dark:bg-gray-800 text-sm"
                  >
                    {Object.entries(FIT_OPERATOR_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateFitRule(rule.id, { value: e.target.value })}
                    placeholder="Valor"
                    className="w-32 px-2 py-1 border rounded bg-white dark:bg-gray-800 text-sm"
                  />
                  <input
                    type="number"
                    value={rule.points}
                    onChange={(e) => updateFitRule(rule.id, { points: Number(e.target.value) })}
                    className="w-20 px-2 py-1 border rounded bg-white dark:bg-gray-800 text-sm"
                    placeholder="Pts"
                  />
                  <button
                    type="button"
                    onClick={() => removeFitRule(rule.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {form.fitRules.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Sin reglas de FIT. Agrega reglas para calificar según datos demográficos.
                </p>
              )}
            </div>
          </div>

          {/* Engagement Rules */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Reglas de Engagement (Comportamiento)</h3>
              <button
                type="button"
                onClick={addEngagementRule}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Agregar Regla
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {form.engagementRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <select
                    value={rule.action}
                    onChange={(e) => updateEngagementRule(rule.id, { action: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded bg-white dark:bg-gray-800 text-sm"
                  >
                    {Object.entries(ENGAGEMENT_ACTION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={rule.points}
                    onChange={(e) => updateEngagementRule(rule.id, { points: Number(e.target.value) })}
                    className="w-20 px-2 py-1 border rounded bg-white dark:bg-gray-800 text-sm"
                    placeholder="Pts"
                  />
                  <button
                    type="button"
                    onClick={() => removeEngagementRule(rule.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {form.engagementRules.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4 col-span-2">
                  Sin reglas de engagement. Agrega reglas para calificar según el comportamiento del lead.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

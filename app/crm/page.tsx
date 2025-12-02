'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Handshake,
  DollarSign,
  UserCircle,
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Package,
  Upload,
  Target,
  Zap,
  Users,
  Flame,
  Thermometer,
  Snowflake,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Timer,
  Percent,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import CrmHelpCard from '@/components/crm/CrmHelpCard';
import CrmAINextActions from '@/components/crm/CrmAINextActions';

interface PipelineStage {
  _id: string;
  name: string;
  color: string;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
}

interface Deal {
  _id: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate?: string;
  stageId: PipelineStage;
  clientId: { name: string };
  ownerId: { name: string };
}

interface ActivityItem {
  _id: string;
  type: string;
  title: string;
  createdAt: string;
  clientId?: { name: string };
  dealId?: { title: string };
}

interface SalesMetrics {
  winRate: number;
  conversionRate: number;
  leadToOpportunityRate: number;
  averageDealSize: number;
  totalWonValue: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  forecast: number;
  pipelineVelocity: number;
  avgSalesCycleDays: number;
  avgResponseTimeDays: number;
  activitiesPerDeal: number;
  meetingNoShowRate: number;
  quotaAttainment: number;
  quotaTarget: number;
  quotaAchieved: number;
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  dealsByOwner: { ownerId: string; ownerName: string; count: number; value: number; wonValue: number }[];
  recurringCustomersRate: number;
  periodComparison: {
    wonValueChange: number;
    dealsWonChange: number;
    winRateChange: number;
  };
}

// Componente de Gauge circular para porcentajes
function CircularGauge({
  value,
  maxValue = 100,
  label,
  sublabel,
  color = '#3b82f6',
  size = 120,
  showTrend,
  trendValue
}: {
  value: number;
  maxValue?: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: number;
  showTrend?: boolean;
  trendValue?: number;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {value.toFixed(0)}%
          </span>
          {showTrend && trendValue !== undefined && (
            <span className={`text-xs flex items-center gap-0.5 ${
              trendValue > 0 ? 'text-emerald-600' : trendValue < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trendValue > 0 ? <ArrowUpRight size={12} /> : trendValue < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
              {Math.abs(trendValue).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">{label}</p>
      {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>}
    </div>
  );
}

// Componente de KPI Card con tendencia
function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
  format = 'number'
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: any;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'cyan';
  format?: 'number' | 'currency' | 'days' | 'percent';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400',
  };

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val);
      case 'days':
        return `${val} dias`;
      case 'percent':
        return `${val}%`;
      default:
        return val.toLocaleString('es-MX');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`flex items-center gap-1 text-sm font-medium ${
            trend > 0 ? 'text-emerald-600 dark:text-emerald-400' :
            trend < 0 ? 'text-red-600 dark:text-red-400' :
            'text-gray-500'
          }`}>
            {trend > 0 ? <TrendingUp size={16} /> : trend < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
          {trendLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

// Componente de barra de progreso horizontal
function ProgressBar({
  value,
  maxValue,
  label,
  color = '#3b82f6',
  showPercentage = true,
  height = 8
}: {
  value: number;
  maxValue: number;
  label: string;
  color?: string;
  showPercentage?: boolean;
  height?: number;
}) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        {showPercentage && (
          <span className="font-medium text-gray-800 dark:text-gray-200">{percentage.toFixed(0)}%</span>
        )}
      </div>
      <div
        className="bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function CRMDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [contactsCount, setContactsCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.viewCRM) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, permissions.viewCRM, permissionsLoading]);

  useEffect(() => {
    if (status === 'authenticated' && permissions.viewCRM) {
      loadMetrics();
    }
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stagesRes, dealsRes, activitiesRes, contactsRes, clientsRes] = await Promise.all([
        fetch('/api/crm/pipeline-stages?activeOnly=true'),
        fetch('/api/crm/deals'),
        fetch('/api/crm/activities?limit=10'),
        fetch('/api/crm/contacts'),
        fetch('/api/clients?activeOnly=true'),
      ]);

      const stagesData = await stagesRes.json();
      const dealsData = await dealsRes.json();
      const activitiesData = await activitiesRes.json();
      const contactsData = await contactsRes.json();
      const clientsData = await clientsRes.json();

      setStages(Array.isArray(stagesData) ? stagesData : []);
      setDeals(Array.isArray(dealsData) ? dealsData : []);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      setContactsCount(Array.isArray(contactsData) ? contactsData.length : 0);
      setClientsCount(Array.isArray(clientsData) ? clientsData.length : 0);

      await loadMetrics();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const res = await fetch(`/api/crm/analytics?period=${selectedPeriod}`);
      const data = await res.json();
      if (!data.error) {
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const formatCurrency = (value: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calcular métricas adicionales locales
  const openDeals = deals.filter(d => !d.stageId.isClosed);
  const totalPipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);

  // Deals próximos a cerrar (próximos 30 días)
  const today = new Date();
  const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingDeals = openDeals
    .filter(d => d.expectedCloseDate && new Date(d.expectedCloseDate) <= next30Days)
    .sort((a, b) => new Date(a.expectedCloseDate!).getTime() - new Date(b.expectedCloseDate!).getTime())
    .slice(0, 5);

  // Deals por etapa
  const dealsByStage = stages
    .filter(s => !s.isClosed)
    .map(stage => ({
      ...stage,
      deals: deals.filter(d => d.stageId._id === stage._id),
      value: deals.filter(d => d.stageId._id === stage._id).reduce((sum, d) => sum + d.value, 0),
    }));

  const activityIcons: Record<string, string> = {
    note: '📝',
    call: '📞',
    email: '📧',
    meeting: '🤝',
    task: '✅',
    channel_message: '💬',
  };

  const periodLabels = {
    month: 'Este Mes',
    quarter: 'Este Trimestre',
    year: 'Este Año'
  };

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={40} />
          <div className="text-gray-600 dark:text-gray-400">Cargando dashboard...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-500/25">
                <Handshake size={24} />
              </div>
              Dashboard CRM
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Metricas de ventas y rendimiento comercial
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              {(['month', 'quarter', 'year'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {periodLabels[period]}
                </button>
              ))}
            </div>
            {permissions.canManagePipelineStages && (
              <button
                onClick={() => router.push('/admin/pipeline')}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition border border-gray-200 dark:border-gray-700"
              >
                <Settings size={18} />
                Configurar
              </button>
            )}
          </div>
        </div>

        {/* Help Card */}
        <CrmHelpCard
          id="crm-dashboard-guide"
          title="Bienvenido al CRM"
          description="Este es tu centro de control para gestionar ventas y clientes"
          variant="guide"
          className="mb-6"
          defaultCollapsed={true}
          steps={[
            { title: 'Registra clientes y contactos', description: 'Agrega las empresas y personas con las que trabajas' },
            { title: 'Crea oportunidades (Deals)', description: 'Cada deal representa un posible negocio en tu pipeline' },
            { title: 'Mueve los deals por el pipeline', description: 'Arrastra los deals entre etapas conforme avanzan' },
            { title: 'Registra actividades', description: 'Documenta llamadas, emails y reuniones' },
          ]}
        />

        {/* AI Next Actions */}
        <CrmAINextActions limit={5} compact className="mb-6" />

        {metrics && (
          <>
            {/* Main KPIs Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <KPICard
                title="Pipeline Total"
                value={metrics.totalPipelineValue}
                subtitle={`${metrics.openDeals} deals abiertos`}
                icon={DollarSign}
                format="currency"
                color="blue"
              />
              <KPICard
                title="Forecast"
                value={metrics.forecast}
                subtitle="Valor ponderado"
                icon={Target}
                format="currency"
                color="purple"
              />
              <KPICard
                title="Ganados"
                value={metrics.quotaAchieved}
                subtitle={`${metrics.wonDeals} deals cerrados`}
                icon={CheckCircle}
                trend={metrics.periodComparison.wonValueChange}
                trendLabel="vs periodo anterior"
                format="currency"
                color="emerald"
              />
              <KPICard
                title="Ticket Promedio"
                value={metrics.averageDealSize}
                subtitle="Por deal ganado"
                icon={BarChart3}
                format="currency"
                color="cyan"
              />
              <KPICard
                title="Ciclo de Venta"
                value={metrics.avgSalesCycleDays}
                subtitle="Dias promedio"
                icon={Timer}
                format="days"
                color="amber"
              />
              <KPICard
                title="Velocidad Pipeline"
                value={metrics.pipelineVelocity}
                subtitle="$/dia potencial"
                icon={Zap}
                format="currency"
                color="rose"
              />
            </div>

            {/* Conversion Metrics - Circular Gauges */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Win Rate, Conversion, Quota */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <Percent className="text-blue-500" size={20} />
                  Tasas de Conversion
                </h3>
                <div className="flex justify-around">
                  <CircularGauge
                    value={metrics.winRate}
                    label="Win Rate"
                    sublabel="Deals ganados vs cerrados"
                    color="#10b981"
                    showTrend
                    trendValue={metrics.periodComparison.winRateChange}
                  />
                  <CircularGauge
                    value={metrics.conversionRate}
                    label="Conversion"
                    sublabel="Deals cerrados vs total"
                    color="#3b82f6"
                  />
                  <CircularGauge
                    value={metrics.quotaAttainment}
                    maxValue={100}
                    label="Cuota"
                    sublabel={metrics.quotaTarget > 0 ? formatCurrency(metrics.quotaTarget) : 'Sin meta'}
                    color={metrics.quotaAttainment >= 100 ? '#10b981' : metrics.quotaAttainment >= 75 ? '#f59e0b' : '#ef4444'}
                  />
                </div>
              </div>

              {/* Lead Temperature */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <Thermometer className="text-orange-500" size={20} />
                  Temperatura de Leads
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                        <Flame className="text-red-600" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">Calientes</p>
                        <p className="text-xs text-gray-500">Alta probabilidad</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-red-600">{metrics.hotLeads}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                        <Thermometer className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">Tibios</p>
                        <p className="text-xs text-gray-500">En seguimiento</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-amber-600">{metrics.warmLeads}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Snowflake className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">Frios</p>
                        <p className="text-xs text-gray-500">Requieren trabajo</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{metrics.coldLeads}</span>
                  </div>
                </div>
              </div>

              {/* Activity Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <Activity className="text-purple-500" size={20} />
                  Metricas de Actividad
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="text-gray-400" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Actividades / Deal</span>
                    </div>
                    <span className="font-bold text-gray-800 dark:text-gray-100">{metrics.activitiesPerDeal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="text-gray-400" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">No-Show Reuniones</span>
                    </div>
                    <span className={`font-bold ${metrics.meetingNoShowRate > 20 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>
                      {metrics.meetingNoShowRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="text-gray-400" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Clientes Recurrentes</span>
                    </div>
                    <span className="font-bold text-emerald-600">{metrics.recurringCustomersRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="text-gray-400" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Lead a Oportunidad</span>
                    </div>
                    <span className="font-bold text-gray-800 dark:text-gray-100">{metrics.leadToOpportunityRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendedores Performance */}
            {metrics.dealsByOwner.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Users className="text-indigo-500" size={20} />
                  Rendimiento por Vendedor
                </h3>
                <div className="space-y-4">
                  {metrics.dealsByOwner.slice(0, 5).map((owner, idx) => {
                    const maxValue = metrics.dealsByOwner[0]?.wonValue || 1;
                    return (
                      <div key={owner.ownerId} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-800 dark:text-gray-100">{owner.ownerName}</span>
                            <div className="text-right">
                              <span className="font-bold text-emerald-600">{formatCurrency(owner.wonValue)}</span>
                              <span className="text-xs text-gray-500 ml-2">({owner.count} deals)</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${(owner.wonValue / maxValue) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline por Etapa */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <PieChart className="text-blue-500" size={20} />
                Pipeline por Etapa
              </h3>
              <button
                onClick={() => router.push('/crm/deals')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Ver Pipeline <ArrowRight size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {dealsByStage.map(stage => (
                <div key={stage._id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-gray-700 dark:text-gray-300">{stage.name}</span>
                      <span className="text-gray-400">({stage.deals.length})</span>
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {formatCurrency(stage.value)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${totalPipelineValue > 0 ? (stage.value / totalPipelineValue) * 100 : 0}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Clock className="text-amber-500" size={20} />
              Actividad Reciente
            </h3>

            <div className="space-y-3">
              {activities.slice(0, 8).map(activity => (
                <div key={activity._id} className="flex items-start gap-3">
                  <span className="text-lg">{activityIcons[activity.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.clientId?.name || activity.dealId?.title || ''}
                      {' • '}
                      {new Date(activity.createdAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>
              ))}

              {activities.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Sin actividades recientes
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Próximos a Cerrar */}
        {upcomingDeals.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="text-orange-500" size={20} />
                Proximos a Cerrar (30 dias)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Deal</th>
                    <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Cliente</th>
                    <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Etapa</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                    <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingDeals.map(deal => {
                    const daysUntil = Math.ceil(
                      (new Date(deal.expectedCloseDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysUntil <= 7;

                    return (
                      <tr
                        key={deal._id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => router.push('/crm/deals')}
                      >
                        <td className="py-3 text-gray-800 dark:text-gray-200 font-medium">
                          {deal.title}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {deal.clientId.name}
                        </td>
                        <td className="py-3">
                          <span
                            className="px-2 py-1 rounded text-xs text-white"
                            style={{ backgroundColor: deal.stageId.color }}
                          >
                            {deal.stageId.name}
                          </span>
                        </td>
                        <td className="py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(deal.value, deal.currency)}
                        </td>
                        <td className={`py-3 text-right ${isUrgent ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                          {new Date(deal.expectedCloseDate!).toLocaleDateString('es-MX')}
                          {isUrgent && <span className="ml-1">⚠️</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { path: '/crm/deals', icon: DollarSign, label: 'Pipeline', sublabel: 'Gestionar deals', color: 'emerald' },
            { path: '/crm/contacts', icon: UserCircle, label: 'Contactos', sublabel: 'Ver directorio', color: 'blue' },
            { path: '/crm/clients', icon: Building2, label: 'Clientes', sublabel: 'Empresas', color: 'purple' },
            { path: '/crm/calendar', icon: Calendar, label: 'Calendario', sublabel: 'Actividades', color: 'amber' },
            { path: '/crm/products', icon: Package, label: 'Productos', sublabel: 'Catalogo', color: 'orange' },
            { path: '/crm/import', icon: Upload, label: 'Importar', sublabel: 'CSV/Excel', color: 'cyan' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
            >
              <div className={`p-2 bg-${item.color}-100 dark:bg-${item.color}-900/50 rounded-lg group-hover:scale-110 transition-transform`}>
                <item.icon className={`text-${item.color}-600 dark:text-${item.color}-400`} size={20} />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800 dark:text-gray-100">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

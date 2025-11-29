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
  Calendar,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Package,
  Upload
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

interface Activity {
  _id: string;
  type: string;
  title: string;
  createdAt: string;
  clientId?: { name: string };
  dealId?: { title: string };
}

export default function CRMDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contactsCount, setContactsCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    // Wait for permissions to load before checking access
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.viewCRM) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, permissions.viewCRM, permissionsLoading]);

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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calcular métricas
  const openDeals = deals.filter(d => !d.stageId.isClosed);
  const wonDeals = deals.filter(d => d.stageId.isClosed && d.stageId.isWon);
  const lostDeals = deals.filter(d => d.stageId.isClosed && !d.stageId.isWon);

  const totalPipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedPipelineValue = openDeals.reduce(
    (sum, d) => sum + (d.value * d.stageId.probability / 100),
    0
  );
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

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

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={40} />
          <div className="text-gray-600 dark:text-gray-400">Cargando dashboard...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Handshake className="text-emerald-500" />
              Dashboard CRM
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Resumen de tu pipeline de ventas
            </p>
          </div>
          {permissions.canManagePipelineStages && (
            <button
              onClick={() => router.push('/admin/pipeline')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <Settings size={20} />
              Configurar Pipeline
            </button>
          )}
        </div>

        {/* Help Card */}
        <CrmHelpCard
          id="crm-dashboard-guide"
          title="Bienvenido al CRM"
          description="Este es tu centro de control para gestionar ventas y clientes"
          variant="guide"
          className="mb-6"
          steps={[
            {
              title: 'Registra tus clientes y contactos',
              description: 'Comienza agregando las empresas y personas con las que trabajas',
            },
            {
              title: 'Crea oportunidades de venta (Deals)',
              description: 'Cada oportunidad representa un posible negocio en tu pipeline',
            },
            {
              title: 'Mueve los deals por el pipeline',
              description: 'Arrastra los deals entre etapas conforme avanzan las negociaciones',
            },
            {
              title: 'Registra actividades',
              description: 'Documenta llamadas, emails y reuniones para dar seguimiento',
            },
          ]}
        />

        {/* AI Next Actions */}
        <CrmAINextActions
          limit={5}
          compact
          className="mb-6"
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pipeline Total</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                  {formatCurrency(totalPipelineValue)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Ponderado: {formatCurrency(weightedPipelineValue)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Deals Abiertos</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                  {openDeals.length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
            <div className="flex gap-4 text-xs mt-2">
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={12} />
                {wonDeals.length} ganados
              </span>
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                <XCircle size={12} />
                {lostDeals.length} perdidos
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Clientes</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                  {clientsCount}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <Building2 className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {contactsCount} contactos registrados
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ganados</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(wonValue)}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {wonDeals.length} deals cerrados
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline por Etapa */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">Pipeline por Etapa</h2>
              <button
                onClick={() => router.push('/crm/deals')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Ver Pipeline <ArrowRight size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {dealsByStage.map(stage => {
                const percentage = totalPipelineValue > 0
                  ? (stage.value / totalPipelineValue) * 100
                  : 0;

                return (
                  <div key={stage._id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-gray-700 dark:text-gray-300">{stage.name}</span>
                        <span className="text-gray-400 dark:text-gray-500">({stage.deals.length})</span>
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Actividad Reciente</h2>

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
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="text-orange-500" size={20} />
                Próximos a Cerrar (30 días)
              </h2>
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
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <button
            onClick={() => router.push('/crm/deals')}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition"
          >
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
              <DollarSign className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800 dark:text-gray-100">Pipeline de Ventas</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestionar deals</p>
            </div>
            <ArrowRight className="ml-auto text-gray-400" size={20} />
          </button>

          <button
            onClick={() => router.push('/crm/contacts')}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition"
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <UserCircle className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800 dark:text-gray-100">Contactos</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ver directorio</p>
            </div>
            <ArrowRight className="ml-auto text-gray-400" size={20} />
          </button>

          <button
            onClick={() => router.push('/crm/clients')}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition"
          >
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Building2 className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800 dark:text-gray-100">Clientes</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestionar empresas</p>
            </div>
            <ArrowRight className="ml-auto text-gray-400" size={20} />
          </button>

          <button
            onClick={() => router.push('/crm/products')}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition"
          >
            <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
              <Package className="text-orange-600 dark:text-orange-400" size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800 dark:text-gray-100">Productos</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Catálogo</p>
            </div>
            <ArrowRight className="ml-auto text-gray-400" size={20} />
          </button>

          <button
            onClick={() => router.push('/crm/import')}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-md transition"
          >
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg">
              <Upload className="text-cyan-600 dark:text-cyan-400" size={20} />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800 dark:text-gray-100">Importar</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">CSV/Excel</p>
            </div>
            <ArrowRight className="ml-auto text-gray-400" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

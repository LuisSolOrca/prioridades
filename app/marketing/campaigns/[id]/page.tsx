'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  Users,
  Target,
  Calendar,
  Tag,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  platform: string;
  objective: string;
  status: string;
  budgetType: string;
  budget: number;
  currency: string;
  spentAmount: number;
  startDate?: string;
  endDate?: string;
  targeting?: {
    locations?: string[];
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    interests?: string[];
  };
  metrics?: {
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    spend: number;
    conversions: number;
    conversionValue: number;
    costPerResult: number;
    costPerClick: number;
    frequency: number;
  };
  tags?: string[];
  createdAt: string;
  lastSyncAt?: string;
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  META: { name: 'Meta', icon: '📘', color: '#1877F2' },
  LINKEDIN: { name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  TWITTER: { name: 'Twitter/X', icon: '🐦', color: '#1DA1F2' },
  TIKTOK: { name: 'TikTok', icon: '🎵', color: '#000000' },
  YOUTUBE: { name: 'YouTube', icon: '▶️', color: '#FF0000' },
  WHATSAPP: { name: 'WhatsApp', icon: '💬', color: '#25D366' },
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  PENDING_REVIEW: { label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  ACTIVE: { label: 'Activa', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  PAUSED: { label: 'Pausada', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  COMPLETED: { label: 'Completada', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  ARCHIVED: { label: 'Archivada', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  AWARENESS: 'Reconocimiento',
  TRAFFIC: 'Tráfico',
  ENGAGEMENT: 'Interacción',
  LEADS: 'Leads',
  CONVERSIONS: 'Conversiones',
  MESSAGES: 'Mensajes',
  VIDEO_VIEWS: 'Vistas de Video',
  APP_INSTALLS: 'Instalaciones de App',
};

export default function CampaignDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`);

      if (!response.ok) {
        throw new Error('Campaign not found');
      }

      const data = await response.json();
      setCampaign(data);
    } catch (error) {
      console.error('Error loading campaign:', error);
      router.push('/marketing/campaigns');
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadCampaign();
    }
  }, [status, router, loadCampaign]);

  const handleSync = async () => {
    if (!campaign) return;

    setSyncing(true);
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaign._id}/sync`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadCampaign();
      }
    } catch (error) {
      console.error('Error syncing campaign:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleStatusChange = async (action: 'pause' | 'resume' | 'archive') => {
    if (!campaign) return;

    setActionLoading(true);
    try {
      const newStatus = action === 'pause' ? 'PAUSED' : action === 'resume' ? 'ACTIVE' : 'ARCHIVED';

      const response = await fetch(`/api/marketing/campaigns/${campaign._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await loadCampaign();
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;

    if (!confirm('¿Estás seguro de eliminar esta campaña? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/marketing/campaigns/${campaign._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/marketing/campaigns');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const formatCurrency = (value: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-MX').format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">Campaña no encontrada</p>
            <button
              onClick={() => router.push('/marketing/campaigns')}
              className="mt-4 text-blue-600 hover:underline"
            >
              Volver a campañas
            </button>
          </div>
        </div>
      </div>
    );
  }

  const platformInfo = PLATFORM_INFO[campaign.platform] || { name: campaign.platform, icon: '📊', color: '#666' };
  const statusInfo = STATUS_INFO[campaign.status] || { label: campaign.status, color: 'bg-gray-100 text-gray-800' };
  const budgetUtilization = campaign.budget > 0 ? (campaign.spentAmount / campaign.budget) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/marketing/campaigns')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mt-1"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{platformInfo.icon}</span>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {campaign.name}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              {campaign.description && (
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
                  {campaign.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {OBJECTIVE_LABELS[campaign.objective] || campaign.objective}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                </span>
                {campaign.lastSyncAt && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-4 h-4" />
                    Sync: {new Date(campaign.lastSyncAt).toLocaleString('es-MX')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>

            {campaign.status === 'ACTIVE' && (
              <button
                onClick={() => handleStatusChange('pause')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                Pausar
              </button>
            )}

            {campaign.status === 'PAUSED' && (
              <button
                onClick={() => handleStatusChange('resume')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Reanudar
              </button>
            )}

            <button
              onClick={() => router.push(`/marketing/campaigns/${campaign._id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Impresiones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(campaign.metrics?.impressions || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Clicks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(campaign.metrics?.clicks || 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  CTR: {((campaign.metrics?.ctr || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <MousePointer className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Conversiones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(campaign.metrics?.conversions || 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Costo: {formatCurrency(campaign.metrics?.costPerResult || 0, campaign.currency)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gastado</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(campaign.spentAmount, campaign.currency)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  de {formatCurrency(campaign.budget, campaign.currency)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Utilización del Presupuesto
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {budgetUtilization.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetUtilization > 90 ? 'bg-red-500' : budgetUtilization > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, budgetUtilization)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Gastado: {formatCurrency(campaign.spentAmount, campaign.currency)}</span>
            <span>Presupuesto {campaign.budgetType === 'DAILY' ? 'Diario' : 'Total'}: {formatCurrency(campaign.budget, campaign.currency)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Detalles de la Campaña
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Plataforma</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{platformInfo.icon}</span>
                  {platformInfo.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Objetivo</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {OBJECTIVE_LABELS[campaign.objective] || campaign.objective}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Duración</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Creada</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(campaign.createdAt)}
                </p>
              </div>

              {campaign.tags && campaign.tags.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Etiquetas</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Targeting */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Segmentación
            </h3>
            <div className="space-y-4">
              {campaign.targeting?.locations && campaign.targeting.locations.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Ubicaciones</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.targeting.locations.map((loc) => (
                      <span
                        key={loc}
                        className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(campaign.targeting?.ageMin || campaign.targeting?.ageMax) && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Rango de Edad</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {campaign.targeting.ageMin || 18} - {campaign.targeting.ageMax || 65} años
                  </p>
                </div>
              )}

              {campaign.targeting?.genders && campaign.targeting.genders.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Género</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {campaign.targeting.genders.join(', ').replace('all', 'Todos').replace('male', 'Hombres').replace('female', 'Mujeres')}
                  </p>
                </div>
              )}

              {campaign.targeting?.interests && campaign.targeting.interests.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Intereses</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.targeting.interests.map((interest) => (
                      <span
                        key={interest}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!campaign.targeting && (
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Sin segmentación configurada
                </p>
              )}
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Resumen de Rendimiento
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Alcance</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatNumber(campaign.metrics?.reach || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Frecuencia</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(campaign.metrics?.frequency || 0).toFixed(2)}x
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">CTR</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {((campaign.metrics?.ctr || 0) * 100).toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">CPC</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(campaign.metrics?.costPerClick || 0, campaign.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Costo por Resultado</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(campaign.metrics?.costPerResult || 0, campaign.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Valor de Conversiones</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(campaign.metrics?.conversionValue || 0, campaign.currency)}
                </span>
              </div>

              {campaign.metrics?.spend && campaign.metrics.conversionValue ? (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ROAS</span>
                    <span className="font-bold text-green-600">
                      {(campaign.metrics.conversionValue / campaign.metrics.spend).toFixed(2)}x
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

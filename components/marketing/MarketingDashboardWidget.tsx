'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface MarketingOverview {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: number;
  avgCpc: number;
  roas: number;
  activeCampaigns: number;
  connectedPlatforms: number;
  platformStatuses: {
    platform: string;
    connected: boolean;
    activeCampaigns: number;
    spend: number;
  }[];
  trends: {
    spendChange: number;
    impressionsChange: number;
    clicksChange: number;
    conversionsChange: number;
  };
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  META: { name: 'Meta', icon: '📘', color: '#1877F2' },
  LINKEDIN: { name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  TWITTER: { name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
  TIKTOK: { name: 'TikTok', icon: '🎵', color: '#000000' },
  YOUTUBE: { name: 'YouTube', icon: '▶️', color: '#FF0000' },
  WHATSAPP: { name: 'WhatsApp', icon: '💬', color: '#25D366' },
};

export default function MarketingDashboardWidget() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MarketingOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketing/analytics/overview');
      if (!response.ok) throw new Error('Failed to load marketing data');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Marketing
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Marketing
          </h3>
          <Link
            href="/marketing"
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            Ver más <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-center text-gray-500 dark:text-gray-400 py-4">
          {error || 'No hay datos de marketing disponibles'}
        </p>
        <Link
          href="/admin/marketing-integrations"
          className="block text-center text-sm text-blue-600 hover:underline mt-2"
        >
          Conectar plataformas de marketing
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Marketing
        </h3>
        <Link
          href="/marketing"
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
        >
          Ver más <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.totalSpend)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Inversión</p>
          <div className={`flex items-center justify-center gap-1 text-xs ${getTrendColor(data.trends.spendChange)}`}>
            {getTrendIcon(data.trends.spendChange)}
            {Math.abs(data.trends.spendChange).toFixed(1)}%
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Eye className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.totalImpressions)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Impresiones</p>
          <div className={`flex items-center justify-center gap-1 text-xs ${getTrendColor(data.trends.impressionsChange)}`}>
            {getTrendIcon(data.trends.impressionsChange)}
            {Math.abs(data.trends.impressionsChange).toFixed(1)}%
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <MousePointer className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.totalClicks)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Clicks</p>
          <div className={`flex items-center justify-center gap-1 text-xs ${getTrendColor(data.trends.clicksChange)}`}>
            {getTrendIcon(data.trends.clicksChange)}
            {Math.abs(data.trends.clicksChange).toFixed(1)}%
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Target className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.totalConversions)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Conversiones</p>
          <div className={`flex items-center justify-center gap-1 text-xs ${getTrendColor(data.trends.conversionsChange)}`}>
            {getTrendIcon(data.trends.conversionsChange)}
            {Math.abs(data.trends.conversionsChange).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {(data.avgCtr * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">CTR Promedio</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.avgCpc)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">CPC Promedio</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {data.roas.toFixed(2)}x
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">ROAS</p>
        </div>
      </div>

      {/* Platform Status */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Plataformas ({data.connectedPlatforms} conectadas)
        </p>
        <div className="flex flex-wrap gap-2">
          {data.platformStatuses.map((platform) => {
            const info = PLATFORM_INFO[platform.platform] || {
              name: platform.platform,
              icon: '📊',
              color: '#666',
            };
            return (
              <div
                key={platform.platform}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  platform.connected
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <span>{info.icon}</span>
                <span className={platform.connected ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                  {info.name}
                </span>
                {platform.connected ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign Count */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {data.activeCampaigns} campañas activas
        </span>
        <Link
          href="/marketing/campaigns"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Ver campañas <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

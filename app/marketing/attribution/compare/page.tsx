'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitBranch, RefreshCw, BarChart3, Info } from 'lucide-react';

interface CompareData {
  dateRange: { startDate: string; endDate: string; days: number };
  models: string[];
  channels: string[];
  comparison: Record<string, Record<string, { attributedValue: number; conversions: number }>>;
  variance: Record<string, { min: number; max: number; variance: number; percentDiff: number }>;
}

const MODEL_INFO: Record<string, { label: string; description: string }> = {
  first_touch: {
    label: 'First Touch',
    description: '100% crédito al primer touchpoint. Mide awareness y top of funnel.',
  },
  last_touch: {
    label: 'Last Touch',
    description: '100% crédito al último touchpoint. Mide conversión directa.',
  },
  linear: {
    label: 'Linear',
    description: 'Distribución igual entre todos. Para journeys largos donde todos importan.',
  },
  time_decay: {
    label: 'Time Decay',
    description: 'Más peso a los touchpoints recientes. Para ciclos cortos con enfoque en cierre.',
  },
  u_shaped: {
    label: 'U-Shaped',
    description: '40% primero, 40% último, 20% resto. Balance awareness + conversión.',
  },
  w_shaped: {
    label: 'W-Shaped',
    description: '30% primero, 30% MQL, 30% último. Para B2B con etapas de calificación.',
  },
};

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  paid_social: 'bg-pink-500',
  organic_social: 'bg-purple-500',
  paid_search: 'bg-green-500',
  organic_search: 'bg-teal-500',
  direct: 'bg-gray-500',
  referral: 'bg-orange-500',
  display: 'bg-yellow-500',
  video: 'bg-red-500',
  other: 'bg-slate-500',
};

export default function CompareModelsPage() {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [showInfo, setShowInfo] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marketing/attribution/compare-models?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching comparison data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/marketing/attribution" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-purple-600" />
              Comparar Modelos de Atribución
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Compara cómo cada modelo distribuye el crédito entre canales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={60}>Últimos 60 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Model Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {data?.models.map((model) => {
          const info = MODEL_INFO[model];
          return (
            <div
              key={model}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 relative cursor-pointer hover:border-purple-300 dark:hover:border-purple-600"
              onClick={() => setShowInfo(showInfo === model ? null : model)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{info?.label || model}</span>
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              {showInfo === model && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{info?.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700">
                  Canal
                </th>
                {data?.models.map((model) => (
                  <th key={model} className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {MODEL_INFO[model]?.label || model}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Varianza
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data?.channels.map((channel) => {
                const variance = data.variance[channel];
                const isHighVariance = variance && variance.percentDiff > 50;

                return (
                  <tr key={channel} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 sticky left-0 bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${CHANNEL_COLORS[channel] || 'bg-gray-500'}`}></div>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {channel.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    {data.models.map((model) => {
                      const value = data.comparison[channel]?.[model]?.attributedValue || 0;
                      const conversions = data.comparison[channel]?.[model]?.conversions || 0;
                      const isMax = variance && value === variance.max;
                      const isMin = variance && value === variance.min && variance.min !== variance.max;

                      return (
                        <td key={model} className="px-6 py-4 text-right">
                          <div className={`
                            ${isMax ? 'text-green-600 dark:text-green-400 font-semibold' : ''}
                            ${isMin ? 'text-red-600 dark:text-red-400' : ''}
                            ${!isMax && !isMin ? 'text-gray-900 dark:text-white' : ''}
                          `}>
                            {formatCurrency(value)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{conversions} conv.</div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm ${isHighVariance ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                        {variance ? `${variance.percentDiff.toFixed(0)}%` : '-'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {variance ? `${formatCurrency(variance.min)} - ${formatCurrency(variance.max)}` : '-'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span>Valor más alto</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
          <span>Valor más bajo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-600 dark:text-orange-400 font-medium">Alta varianza</span>
          <span>= diferente según modelo</span>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-3">Cómo interpretar estos datos</h3>
        <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
          <li>• <strong>Alta varianza</strong> indica que el canal contribuye de forma diferente según el modelo - requiere análisis más profundo.</li>
          <li>• Si <strong>First Touch</strong> es alto pero <strong>Last Touch</strong> es bajo, el canal es bueno para awareness pero no cierra.</li>
          <li>• Si <strong>Last Touch</strong> es alto pero <strong>First Touch</strong> es bajo, el canal convierte pero no atrae nuevos leads.</li>
          <li>• Canales con valores similares en todos los modelos son consistentes en todo el funnel.</li>
          <li>• Usa <strong>U-Shaped</strong> para balance general, <strong>Linear</strong> para ciclos largos, <strong>Time Decay</strong> para decisiones rápidas.</li>
        </ul>
      </div>
    </div>
  );
}

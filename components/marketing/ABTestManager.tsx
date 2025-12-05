'use client';

import { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  Trophy,
  BarChart3,
  Percent,
  Clock,
  Users,
  MousePointer,
  Mail,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export interface ABVariant {
  id: string;
  name: string;
  weight: number;
  subject?: string; // For email campaigns
  content?: any; // Content/sections for the variant
  metrics?: {
    sent?: number;
    opens?: number;
    clicks?: number;
    conversions?: number;
    openRate?: number;
    clickRate?: number;
    conversionRate?: number;
  };
}

export interface ABTestConfig {
  enabled: boolean;
  variants: ABVariant[];
  winnerCriteria: 'opens' | 'clicks' | 'conversions';
  testDuration?: number; // Hours before declaring winner
  testPercentage?: number; // % of audience for testing
  winnerId?: string;
  winnerDeclaredAt?: Date;
}

interface ABTestManagerProps {
  config: ABTestConfig;
  onChange: (config: ABTestConfig) => void;
  type: 'email' | 'landing';
  showMetrics?: boolean;
  readOnly?: boolean;
}

const WINNER_CRITERIA_LABELS = {
  opens: { label: 'Tasa de apertura', icon: Eye },
  clicks: { label: 'Tasa de clics', icon: MousePointer },
  conversions: { label: 'Conversiones', icon: Trophy },
};

const VARIANT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
];

export default function ABTestManager({
  config,
  onChange,
  type,
  showMetrics = false,
  readOnly = false,
}: ABTestManagerProps) {
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  const addVariant = () => {
    const variantCount = config.variants.length;
    const newVariant: ABVariant = {
      id: `variant-${Date.now()}`,
      name: `Variante ${String.fromCharCode(65 + variantCount)}`, // A, B, C, etc.
      weight: Math.floor(100 / (variantCount + 1)),
      subject: type === 'email' ? '' : undefined,
    };

    // Redistribute weights
    const newWeight = Math.floor(100 / (variantCount + 1));
    const updatedVariants = config.variants.map((v) => ({
      ...v,
      weight: newWeight,
    }));

    onChange({
      ...config,
      variants: [...updatedVariants, newVariant],
    });
  };

  const removeVariant = (variantId: string) => {
    if (config.variants.length <= 2) return; // Minimum 2 variants

    const remaining = config.variants.filter((v) => v.id !== variantId);
    const newWeight = Math.floor(100 / remaining.length);
    const updatedVariants = remaining.map((v) => ({
      ...v,
      weight: newWeight,
    }));

    onChange({
      ...config,
      variants: updatedVariants,
    });
  };

  const updateVariant = (variantId: string, updates: Partial<ABVariant>) => {
    onChange({
      ...config,
      variants: config.variants.map((v) =>
        v.id === variantId ? { ...v, ...updates } : v
      ),
    });
  };

  const updateWeight = (variantId: string, newWeight: number) => {
    const otherVariants = config.variants.filter((v) => v.id !== variantId);
    const remainingWeight = 100 - newWeight;
    const weightPerOther = Math.floor(remainingWeight / otherVariants.length);

    onChange({
      ...config,
      variants: config.variants.map((v) =>
        v.id === variantId ? { ...v, weight: newWeight } : { ...v, weight: weightPerOther }
      ),
    });
  };

  const normalizeWeights = () => {
    const total = config.variants.reduce((sum, v) => sum + v.weight, 0);
    if (total === 100) return;

    const factor = 100 / total;
    let normalized = config.variants.map((v) => ({
      ...v,
      weight: Math.floor(v.weight * factor),
    }));

    // Adjust rounding errors
    const newTotal = normalized.reduce((sum, v) => sum + v.weight, 0);
    if (newTotal !== 100 && normalized.length > 0) {
      normalized[0].weight += 100 - newTotal;
    }

    onChange({ ...config, variants: normalized });
  };

  const getWinningVariant = (): ABVariant | null => {
    if (!showMetrics || config.variants.length === 0) return null;

    const criteria = config.winnerCriteria;
    let winner: ABVariant | null = null;
    let bestValue = -1;

    for (const variant of config.variants) {
      let value = 0;
      if (criteria === 'opens') value = variant.metrics?.openRate || 0;
      else if (criteria === 'clicks') value = variant.metrics?.clickRate || 0;
      else if (criteria === 'conversions') value = variant.metrics?.conversionRate || 0;

      if (value > bestValue) {
        bestValue = value;
        winner = variant;
      }
    }

    return winner;
  };

  const winningVariant = getWinningVariant();
  const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FlaskConical className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Prueba A/B
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Compara variantes para optimizar resultados
              </p>
            </div>
          </div>

          {!readOnly && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => {
                  if (e.target.checked && config.variants.length === 0) {
                    // Initialize with 2 variants
                    onChange({
                      ...config,
                      enabled: true,
                      variants: [
                        { id: 'control', name: 'Control (A)', weight: 50 },
                        { id: 'variant-b', name: 'Variante B', weight: 50 },
                      ],
                    });
                  } else {
                    onChange({ ...config, enabled: e.target.checked });
                  }
                }}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Activar
              </span>
            </label>
          )}
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Winner criteria */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Criterio ganador:
                </span>
              </div>
              <div className="flex gap-2">
                {(Object.keys(WINNER_CRITERIA_LABELS) as Array<keyof typeof WINNER_CRITERIA_LABELS>).map((criteria) => {
                  const { label, icon: Icon } = WINNER_CRITERIA_LABELS[criteria];
                  return (
                    <button
                      key={criteria}
                      onClick={() => !readOnly && onChange({ ...config, winnerCriteria: criteria })}
                      disabled={readOnly}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        config.winnerCriteria === criteria
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weight visualization */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Distribución del tráfico
              </span>
              {totalWeight !== 100 && (
                <button
                  onClick={normalizeWeights}
                  className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  Normalizar ({totalWeight}%)
                </button>
              )}
            </div>
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {config.variants.map((variant, index) => (
                <div
                  key={variant.id}
                  className={`${VARIANT_COLORS[index % VARIANT_COLORS.length]} transition-all`}
                  style={{ width: `${variant.weight}%` }}
                  title={`${variant.name}: ${variant.weight}%`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {config.variants.map((variant, index) => (
                <span
                  key={variant.id}
                  className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${VARIANT_COLORS[index % VARIANT_COLORS.length]}`}
                  />
                  {variant.weight}%
                </span>
              ))}
            </div>
          </div>

          {/* Variants */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {config.variants.map((variant, index) => {
              const isWinner = showMetrics && winningVariant?.id === variant.id;
              const isExpanded = expandedVariant === variant.id;

              return (
                <div
                  key={variant.id}
                  className={`${isWinner ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                >
                  {/* Variant header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    onClick={() => setExpandedVariant(isExpanded ? null : variant.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          VARIANT_COLORS[index % VARIANT_COLORS.length]
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {variant.name}
                          </span>
                          {isWinner && (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">
                              <Trophy className="w-3 h-3" />
                              Ganador
                            </span>
                          )}
                        </div>
                        {type === 'email' && variant.subject && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {variant.subject}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {showMetrics && variant.metrics && (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400">Aperturas</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {variant.metrics.openRate?.toFixed(1) || 0}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400">Clics</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {variant.metrics.clickRate?.toFixed(1) || 0}%
                            </p>
                          </div>
                        </div>
                      )}

                      {!readOnly && config.variants.length > 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVariant(variant.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                      {/* Variant name */}
                      {!readOnly && (
                        <div className="pt-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre de la variante
                          </label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {/* Subject for emails */}
                      {type === 'email' && !readOnly && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Asunto del email
                          </label>
                          <input
                            type="text"
                            value={variant.subject || ''}
                            onChange={(e) => updateVariant(variant.id, { subject: e.target.value })}
                            placeholder="Asunto para esta variante..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {/* Weight slider */}
                      {!readOnly && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Porcentaje de tráfico: {variant.weight}%
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={variant.weight}
                            onChange={(e) => updateWeight(variant.id, parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                          />
                        </div>
                      )}

                      {/* Detailed metrics */}
                      {showMetrics && variant.metrics && (
                        <div className="grid grid-cols-4 gap-4 pt-2">
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <Mail className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {variant.metrics.sent || 0}
                            </p>
                            <p className="text-xs text-gray-500">Enviados</p>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <Eye className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {variant.metrics.opens || 0}
                            </p>
                            <p className="text-xs text-gray-500">Aperturas</p>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <MousePointer className="w-4 h-4 mx-auto text-green-400 mb-1" />
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {variant.metrics.clicks || 0}
                            </p>
                            <p className="text-xs text-gray-500">Clics</p>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <Trophy className="w-4 h-4 mx-auto text-yellow-400 mb-1" />
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {variant.metrics.conversions || 0}
                            </p>
                            <p className="text-xs text-gray-500">Conversiones</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add variant button */}
          {!readOnly && config.variants.length < 6 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={addVariant}
                className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Variante
              </button>
            </div>
          )}

          {/* Winner declared notice */}
          {config.winnerId && config.winnerDeclaredAt && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">
                    Ganador declarado
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {config.variants.find((v) => v.id === config.winnerId)?.name} fue declarado
                    ganador el{' '}
                    {new Date(config.winnerDeclaredAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

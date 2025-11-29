'use client';

import { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';

interface PredictionFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  explanation: string;
}

interface PredictionData {
  predictedProbability: number;
  confidence: 'high' | 'medium' | 'low';
  factors: PredictionFactor[];
  prediction: 'likely_win' | 'uncertain' | 'at_risk' | 'likely_loss';
  recommendations: string[];
  estimatedCloseDate?: string;
}

interface CrmAIPredictionProps {
  dealId: string;
  currentProbability?: number;
  autoLoad?: boolean;
  className?: string;
}

const PREDICTION_STYLES = {
  likely_win: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-400',
    label: 'Probable Cierre',
    icon: CheckCircle,
  },
  uncertain: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-400',
    label: 'Incierto',
    icon: HelpCircle,
  },
  at_risk: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-400',
    label: 'En Riesgo',
    icon: AlertTriangle,
  },
  likely_loss: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
    label: 'Riesgo Alto',
    icon: TrendingDown,
  },
};

const CONFIDENCE_LABELS = {
  high: 'Alta confianza',
  medium: 'Confianza media',
  low: 'Baja confianza',
};

export default function CrmAIPrediction({
  dealId,
  currentProbability,
  autoLoad = false,
  className = '',
}: CrmAIPredictionProps) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [error, setError] = useState('');
  const [showFactors, setShowFactors] = useState(false);

  const loadPrediction = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/crm/ai/predict-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar predicción');
      }

      setPrediction(data.prediction);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <span className="w-4 h-4 flex items-center justify-center">-</span>;
    }
  };

  if (!prediction && !loading && !error) {
    return (
      <div className={`bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Predicción de Cierre
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                IA predice la probabilidad de ganar este deal
              </p>
            </div>
          </div>
          <button
            onClick={loadPrediction}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Predecir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Predicción de Cierre
          </h3>
        </div>
        <button
          onClick={loadPrediction}
          disabled={loading}
          className="p-2 text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            <span className="ml-2 text-gray-500">Analizando...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        ) : prediction ? (
          <div className="space-y-4">
            {/* Main Prediction */}
            <div className={`p-4 rounded-lg ${PREDICTION_STYLES[prediction.prediction].bg} ${PREDICTION_STYLES[prediction.prediction].border} border`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = PREDICTION_STYLES[prediction.prediction].icon;
                    return <Icon className={`w-8 h-8 ${PREDICTION_STYLES[prediction.prediction].text}`} />;
                  })()}
                  <div>
                    <div className={`text-2xl font-bold ${PREDICTION_STYLES[prediction.prediction].text}`}>
                      {prediction.predictedProbability}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {PREDICTION_STYLES[prediction.prediction].label}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {CONFIDENCE_LABELS[prediction.confidence]}
                  </div>
                  {currentProbability !== undefined && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">vs </span>
                      <span className={
                        prediction.predictedProbability > currentProbability
                          ? 'text-green-600'
                          : prediction.predictedProbability < currentProbability
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }>
                        {currentProbability}% actual
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {prediction.estimatedCloseDate && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-500">Cierre estimado: </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {new Date(prediction.estimatedCloseDate).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Factors Toggle */}
            <button
              onClick={() => setShowFactors(!showFactors)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Factores de análisis ({prediction.factors.length})
              </span>
              {showFactors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Factors List */}
            {showFactors && (
              <div className="space-y-2">
                {prediction.factors.map((factor, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                  >
                    <div className={getImpactColor(factor.impact)}>
                      {getImpactIcon(factor.impact)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {factor.factor}
                        </span>
                        <span className="text-xs text-gray-500">
                          Peso: {Math.round(factor.weight * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {factor.explanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {prediction.recommendations.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                <h4 className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                  <Sparkles className="w-4 h-4" />
                  Recomendaciones
                </h4>
                <ul className="space-y-1">
                  {prediction.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-600 dark:text-blue-300">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

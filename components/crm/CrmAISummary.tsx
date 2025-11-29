'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CrmAISummaryProps {
  entityType: 'deal' | 'client' | 'contact';
  entityId: string;
  autoLoad?: boolean;
  compact?: boolean;
  className?: string;
}

interface SummaryData {
  executiveSummary: string;
  keyInsights: string[];
  risks: string[];
  opportunities: string[];
  recommendedActions: string[];
}

export default function CrmAISummary({
  entityType,
  entityId,
  autoLoad = false,
  compact = false,
  className = '',
}: CrmAISummaryProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    if (autoLoad && entityId) {
      loadSummary();
    }
  }, [entityId, autoLoad]);

  const loadSummary = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/crm/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar resumen');
      }

      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const entityLabels = {
    deal: 'Deal',
    client: 'Cliente',
    contact: 'Contacto',
  };

  if (!summary && !loading && !error) {
    return (
      <div className={`bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Resumen Inteligente
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Genera un análisis con IA de este {entityLabels[entityType].toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={loadSummary}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Generar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Resumen Inteligente
            </h3>
            {summary && !expanded && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {summary.executiveSummary}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadSummary();
            }}
            disabled={loading}
            className="p-2 text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
              <span className="ml-2 text-gray-500">Analizando...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          ) : summary ? (
            <>
              {/* Executive Summary */}
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  {summary.executiveSummary}
                </p>
              </div>

              {/* Key Insights */}
              {summary.keyInsights.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    Insights Clave
                  </h4>
                  <ul className="space-y-1">
                    {summary.keyInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-purple-500 mt-1">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Risks */}
                {summary.risks.length > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Riesgos
                    </h4>
                    <ul className="space-y-1">
                      {summary.risks.map((risk, i) => (
                        <li key={i} className="text-sm text-red-600 dark:text-red-300">
                          • {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Opportunities */}
                {summary.opportunities.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      Oportunidades
                    </h4>
                    <ul className="space-y-1">
                      {summary.opportunities.map((opp, i) => (
                        <li key={i} className="text-sm text-green-600 dark:text-green-300">
                          • {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommended Actions */}
              {summary.recommendedActions.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                    <Target className="w-4 h-4" />
                    Acciones Recomendadas
                  </h4>
                  <ul className="space-y-1">
                    {summary.recommendedActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-300">
                        <span className="font-medium">{i + 1}.</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  Users,
  FileText,
  ArrowRight,
  CheckSquare,
  Calendar,
  AlertCircle,
  ChevronRight,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface NextAction {
  dealId: string;
  dealTitle: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  suggestedDate?: string;
  actionType: 'call' | 'email' | 'meeting' | 'proposal' | 'followup' | 'close' | 'other';
}

interface CrmAINextActionsProps {
  ownerId?: string;
  limit?: number;
  autoLoad?: boolean;
  compact?: boolean;
  className?: string;
}

const ACTION_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  proposal: FileText,
  followup: ArrowRight,
  close: CheckSquare,
  other: Zap,
};

const PRIORITY_STYLES = {
  high: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    icon: 'text-red-500',
  },
  medium: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    icon: 'text-yellow-500',
  },
  low: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    icon: 'text-green-500',
  },
};

export default function CrmAINextActions({
  ownerId,
  limit = 5,
  autoLoad = true,
  compact = false,
  className = '',
}: CrmAINextActionsProps) {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<NextAction[]>([]);
  const [error, setError] = useState('');
  const [dealsAnalyzed, setDealsAnalyzed] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (autoLoad) {
      loadActions();
    }
  }, [ownerId, autoLoad]);

  const loadActions = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (ownerId) params.set('ownerId', ownerId);

      const res = await fetch(`/api/crm/ai/next-actions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener recomendaciones');
      }

      setActions(data.actions || []);
      setDealsAnalyzed(data.dealsAnalyzed || 0);
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      high: 'Urgente',
      medium: 'Importante',
      low: 'Normal',
    };
    return labels[priority] || priority;
  };

  // Show initial state only if never loaded
  if (!hasLoaded && !loading) {
    return (
      <div className={`bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Siguiente Mejor Acción
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                IA analiza tus deals y recomienda acciones
              </p>
            </div>
          </div>
          <button
            onClick={loadActions}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Analizar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Siguiente Mejor Acción
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dealsAnalyzed} deals analizados
            </p>
          </div>
        </div>
        <button
          onClick={loadActions}
          disabled={loading}
          className="p-2 text-gray-500 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
            <span className="ml-2 text-gray-500">Analizando deals...</span>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        ) : actions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay deals activos para analizar
          </div>
        ) : (
          actions.slice(0, compact ? 3 : limit).map((action, index) => {
            const Icon = ACTION_ICONS[action.actionType] || Zap;
            const styles = PRIORITY_STYLES[action.priority];

            return (
              <div
                key={`${action.dealId}-${index}`}
                className={`p-4 ${styles.bg} hover:bg-opacity-80 transition`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${styles.border} border bg-white dark:bg-gray-800`}>
                    <Icon className={`w-4 h-4 ${styles.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/crm/deals/${action.dealId}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      >
                        {action.dealTitle}
                      </Link>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${styles.badge}`}>
                        {getPriorityLabel(action.priority)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      {action.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {action.reason}
                    </p>
                    {action.suggestedDate && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        Sugerido: {new Date(action.suggestedDate).toLocaleDateString('es-MX')}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/crm/deals/${action.dealId}`}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {actions.length > (compact ? 3 : limit) && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 text-center">
          <button
            onClick={() => {/* Could open a modal with all actions */}}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ver todas las recomendaciones ({actions.length})
          </button>
        </div>
      )}
    </div>
  );
}

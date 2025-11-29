'use client';

import { useState, useEffect } from 'react';
import {
  Lightbulb,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
  Info,
  Sparkles,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

export interface HelpStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export interface CrmHelpCardProps {
  id: string; // Unique ID for localStorage
  title: string;
  description?: string;
  steps?: HelpStep[];
  tips?: string[];
  variant?: 'info' | 'tip' | 'guide' | 'feature';
  dismissible?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

const VARIANT_CONFIG = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-900 dark:text-blue-100',
  },
  tip: {
    icon: Lightbulb,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-900 dark:text-amber-100',
  },
  guide: {
    icon: BookOpen,
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
    titleColor: 'text-purple-900 dark:text-purple-100',
  },
  feature: {
    icon: Sparkles,
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    titleColor: 'text-emerald-900 dark:text-emerald-100',
  },
};

export default function CrmHelpCard({
  id,
  title,
  description,
  steps,
  tips,
  variant = 'info',
  dismissible = true,
  collapsible = true,
  defaultCollapsed = false,
  className = '',
}: CrmHelpCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = `crm_help_dismissed_${id}`;
  const collapseKey = `crm_help_collapsed_${id}`;

  useEffect(() => {
    // Check localStorage on mount
    const dismissed = localStorage.getItem(storageKey);
    const collapsed = localStorage.getItem(collapseKey);

    if (dismissed === 'true') {
      setIsDismissed(true);
    }
    if (collapsed !== null) {
      setIsCollapsed(collapsed === 'true');
    }
    setIsLoaded(true);
  }, [storageKey, collapseKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(storageKey, 'true');
  };

  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(collapseKey, String(newState));
  };

  // Don't render until we've checked localStorage
  if (!isLoaded || isDismissed) {
    return null;
  }

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div>
            <h4 className={`font-medium ${config.titleColor}`}>{title}</h4>
            {description && !isCollapsed && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {collapsible && (
            <button
              onClick={handleToggleCollapse}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              title={isCollapsed ? 'Expandir' : 'Colapsar'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          )}
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              title="No mostrar de nuevo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (steps || tips) && (
        <div className="px-4 pb-4 pt-1">
          {/* Steps */}
          {steps && steps.length > 0 && (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    {step.icon || (
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {step.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tips */}
          {tips && tips.length > 0 && (
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to reset all help cards (useful for testing or user preference)
export function resetAllHelpCards() {
  const keys = Object.keys(localStorage).filter(
    (key) => key.startsWith('crm_help_dismissed_') || key.startsWith('crm_help_collapsed_')
  );
  keys.forEach((key) => localStorage.removeItem(key));
}

// Quick access cards for common use cases
export function QuickStartCard({ className = '' }: { className?: string }) {
  return (
    <CrmHelpCard
      id="crm-quick-start"
      title="Primeros pasos en el CRM"
      description="Sigue estos pasos para comenzar a gestionar tus ventas"
      variant="guide"
      steps={[
        {
          title: 'Registra tus clientes',
          description: 'Agrega empresas y contactos con los que trabajas',
        },
        {
          title: 'Crea oportunidades (Deals)',
          description: 'Registra cada oportunidad de venta en el pipeline',
        },
        {
          title: 'Registra actividades',
          description: 'Documenta llamadas, emails y reuniones',
        },
        {
          title: 'Mueve deals en el pipeline',
          description: 'Arrastra los deals entre etapas según avanzan',
        },
      ]}
      className={className}
    />
  );
}

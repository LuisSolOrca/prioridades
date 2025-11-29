'use client';

import { useState } from 'react';
import {
  Sparkles,
  Mail,
  FileText,
  Zap,
  Target,
  ChevronRight,
  X,
} from 'lucide-react';
import CrmAIEmailAssistant from './CrmAIEmailAssistant';
import CrmAISummary from './CrmAISummary';
import CrmAINextActions from './CrmAINextActions';
import CrmAIPrediction from './CrmAIPrediction';

interface CrmAIPanelProps {
  // Context - at least one should be provided for full functionality
  dealId?: string;
  contactId?: string;
  clientId?: string;
  // Display options
  showEmailAssistant?: boolean;
  showSummary?: boolean;
  showNextActions?: boolean;
  showPrediction?: boolean;
  // Layout
  layout?: 'horizontal' | 'vertical' | 'grid';
  compact?: boolean;
  className?: string;
}

export default function CrmAIPanel({
  dealId,
  contactId,
  clientId,
  showEmailAssistant = true,
  showSummary = true,
  showNextActions = true,
  showPrediction = true,
  layout = 'vertical',
  compact = false,
  className = '',
}: CrmAIPanelProps) {
  const [activeModal, setActiveModal] = useState<'email' | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Determine entity type for summary
  const entityType = dealId ? 'deal' : clientId ? 'client' : contactId ? 'contact' : null;
  const entityId = dealId || clientId || contactId;

  const aiFeatures = [
    {
      id: 'email',
      label: 'Asistente de Email',
      description: 'Genera emails personalizados con IA',
      icon: Mail,
      color: 'from-purple-500 to-blue-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-700 dark:text-purple-400',
      available: showEmailAssistant && (dealId || contactId || clientId),
      action: () => setActiveModal('email'),
    },
    {
      id: 'summary',
      label: 'Resumen Inteligente',
      description: 'Análisis ejecutivo de la entidad',
      icon: FileText,
      color: 'from-green-500 to-teal-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400',
      available: showSummary && entityType && entityId,
      action: () => setExpandedSection(expandedSection === 'summary' ? null : 'summary'),
    },
    {
      id: 'nextActions',
      label: 'Siguiente Mejor Acción',
      description: 'Recomendaciones priorizadas',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      available: showNextActions,
      action: () => setExpandedSection(expandedSection === 'nextActions' ? null : 'nextActions'),
    },
    {
      id: 'prediction',
      label: 'Predicción de Cierre',
      description: 'Probabilidad de ganar el deal',
      icon: Target,
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      textColor: 'text-indigo-700 dark:text-indigo-400',
      available: showPrediction && dealId,
      action: () => setExpandedSection(expandedSection === 'prediction' ? null : 'prediction'),
    },
  ];

  const availableFeatures = aiFeatures.filter(f => f.available);

  if (availableFeatures.length === 0) {
    return null;
  }

  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-3',
    vertical: 'space-y-3',
    grid: 'grid grid-cols-2 md:grid-cols-4 gap-3',
  };

  return (
    <div className={className}>
      {/* AI Features Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Funciones de IA
        </h3>
      </div>

      {/* Feature Buttons */}
      <div className={layoutClasses[layout]}>
        {availableFeatures.map((feature) => {
          const Icon = feature.icon;
          const isExpanded = expandedSection === feature.id;

          return (
            <button
              key={feature.id}
              onClick={feature.action}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                isExpanded
                  ? `${feature.bgColor} border-current ${feature.textColor}`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${layout === 'grid' ? 'flex-col items-start' : ''}`}
            >
              <div className={`p-2 rounded-lg bg-gradient-to-br ${feature.color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className={layout === 'grid' ? '' : 'flex-1 min-w-0'}>
                <div className={`font-medium text-sm ${
                  isExpanded ? feature.textColor : 'text-gray-900 dark:text-white'
                }`}>
                  {feature.label}
                </div>
                {!compact && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {feature.description}
                  </div>
                )}
              </div>
              {feature.id !== 'email' && (
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded Sections */}
      {expandedSection === 'summary' && entityType && entityId && (
        <div className="mt-4">
          <CrmAISummary
            entityType={entityType}
            entityId={entityId}
            autoLoad
          />
        </div>
      )}

      {expandedSection === 'nextActions' && (
        <div className="mt-4">
          <CrmAINextActions autoLoad />
        </div>
      )}

      {expandedSection === 'prediction' && dealId && (
        <div className="mt-4">
          <CrmAIPrediction
            dealId={dealId}
            autoLoad
          />
        </div>
      )}

      {/* Email Assistant Modal */}
      <CrmAIEmailAssistant
        isOpen={activeModal === 'email'}
        onClose={() => setActiveModal(null)}
        dealId={dealId}
        contactId={contactId}
        clientId={clientId}
      />
    </div>
  );
}

// Compact version for sidebars and cards
export function CrmAIQuickActions({
  dealId,
  contactId,
  clientId,
  className = '',
}: {
  dealId?: string;
  contactId?: string;
  clientId?: string;
  className?: string;
}) {
  const [showEmailModal, setShowEmailModal] = useState(false);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => setShowEmailModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 text-sm"
        title="Generar email con IA"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Email IA</span>
      </button>

      <CrmAIEmailAssistant
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        dealId={dealId}
        contactId={contactId}
        clientId={clientId}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { X, FileText, Sparkles, Loader2, CheckCircle, Circle, AlertTriangle } from 'lucide-react';

interface DynamicMessage {
  _id: string;
  commandType: string;
  commandData: any;
  createdAt: string;
  userId?: {
    name: string;
  };
}

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  dynamics: DynamicMessage[];
  projectId: string;
}

const DYNAMIC_TYPE_LABELS: Record<string, string> = {
  'poll': 'Encuesta',
  'dot-voting': 'Dot Voting',
  'blind-vote': 'Votación Ciega',
  'fist-of-five': 'Puño de Cinco',
  'confidence-vote': 'Voto de Confianza',
  'nps': 'NPS',
  'brainstorm': 'Lluvia de Ideas',
  'mind-map': 'Mapa Mental',
  'pros-cons': 'Pros y Contras',
  'decision-matrix': 'Matriz de Decisión',
  'ranking': 'Ranking',
  'retrospective': 'Retrospectiva',
  'retro': 'Retro',
  'team-health': 'Salud del Equipo',
  'mood': 'Estado de Ánimo',
  'action-items': 'Acciones',
  'checklist': 'Checklist',
  'agenda': 'Agenda',
  'parking-lot': 'Parking Lot',
  'pomodoro': 'Pomodoro',
  'estimation-poker': 'Planning Poker',
  'kudos-wall': 'Muro de Kudos',
  'icebreaker': 'Icebreaker',
  'swot': 'SWOT',
  'soar': 'SOAR',
  'six-hats': 'Sombreros de Bono',
  'crazy-8s': 'Crazy 8s',
  'affinity-map': 'Mapa de Afinidad',
  'rose-bud-thorn': 'Rosa-Brote-Espina',
  'sailboat': 'Sailboat',
  'start-stop-continue': 'Start-Stop-Continue',
  'standup': 'Standup'
};

export default function GenerateDocumentModal({
  isOpen,
  onClose,
  dynamics,
  projectId
}: GenerateDocumentModalProps) {
  const [selectedDynamics, setSelectedDynamics] = useState<string[]>([]);
  const [documentTitle, setDocumentTitle] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleDynamic = (dynamicId: string) => {
    setSelectedDynamics(prev =>
      prev.includes(dynamicId)
        ? prev.filter(id => id !== dynamicId)
        : [...prev, dynamicId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDynamics.length === dynamics.length) {
      setSelectedDynamics([]);
    } else {
      setSelectedDynamics(dynamics.map(d => d._id));
    }
  };

  const handleGenerate = async () => {
    if (selectedDynamics.length === 0) {
      setError('Selecciona al menos una dinámica');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const selectedDynamicsData = dynamics.filter(d => selectedDynamics.includes(d._id));

      const response = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dynamics: selectedDynamicsData,
          documentTitle: documentTitle.trim() || undefined,
          additionalContext: additionalContext.trim() || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al generar documento');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentTitle || 'Documento'}_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset and close
      setSelectedDynamics([]);
      setDocumentTitle('');
      setAdditionalContext('');
      onClose();

    } catch (err: any) {
      console.error('Error generating document:', err);
      setError(err.message || 'Error al generar el documento');
    } finally {
      setGenerating(false);
    }
  };

  const getDynamicTitle = (dynamic: DynamicMessage) => {
    return dynamic.commandData?.title ||
           dynamic.commandData?.question ||
           dynamic.commandData?.topic ||
           'Sin título';
  };

  const getDynamicLabel = (type: string) => {
    return DYNAMIC_TYPE_LABELS[type] || type;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-500 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Generar Documento con IA</h2>
              <p className="text-sm text-white/80">Crea un documento profesional basado en tus dinámicas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Document Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título del documento (opcional)
            </label>
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Ej: Resumen de Retrospectiva Sprint 5"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Dynamics Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Selecciona las dinámicas a incluir
              </label>
              <button
                onClick={handleSelectAll}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                {selectedDynamics.length === dynamics.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>

            {dynamics.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="mx-auto mb-2" size={32} />
                <p>No hay dinámicas disponibles</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {dynamics.map((dynamic) => (
                  <label
                    key={dynamic._id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                      selectedDynamics.includes(dynamic._id)
                        ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700'
                        : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {selectedDynamics.includes(dynamic._id) ? (
                        <CheckCircle className="text-purple-500" size={20} />
                      ) : (
                        <Circle className="text-gray-400" size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {getDynamicTitle(dynamic)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getDynamicLabel(dynamic.commandType)} •{' '}
                        {new Date(dynamic.createdAt).toLocaleDateString('es-ES')}
                        {dynamic.commandData?.closed && ' • Cerrada'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedDynamics.includes(dynamic._id)}
                      onChange={() => handleToggleDynamic(dynamic._id)}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {selectedDynamics.length} de {dynamics.length} seleccionadas
            </p>
          </div>

          {/* Additional Context */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contexto adicional (opcional)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Proporciona información adicional que la IA debe considerar al generar el documento. Ej: El proyecto está en fase de lanzamiento, enfocarse en acciones prioritarias..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
              <AlertTriangle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || selectedDynamics.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Generando...
              </>
            ) : (
              <>
                <FileText size={18} />
                Generar DOCX
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

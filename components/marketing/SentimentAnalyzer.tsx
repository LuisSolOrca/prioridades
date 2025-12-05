'use client';

import { useState } from 'react';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  Lightbulb,
  Tag,
} from 'lucide-react';

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  confidence?: number;
  emotions?: { emotion: string; intensity: 'low' | 'medium' | 'high' }[];
  intent?: { type: string; description: string };
  urgency?: 'low' | 'medium' | 'high';
  suggestedAction?: string;
  keyPhrases?: string[];
  summary?: string;
}

interface SentimentAnalyzerProps {
  text?: string;
  onAnalyze?: (result: SentimentResult) => void;
  showInput?: boolean;
  compact?: boolean;
  className?: string;
}

const SENTIMENT_CONFIG = {
  positive: {
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    icon: TrendingUp,
    label: 'Positivo',
  },
  negative: {
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    icon: TrendingDown,
    label: 'Negativo',
  },
  neutral: {
    color: 'text-gray-600',
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    icon: Minus,
    label: 'Neutral',
  },
  mixed: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: AlertTriangle,
    label: 'Mixto',
  },
};

const URGENCY_CONFIG = {
  low: { color: 'text-green-600', bg: 'bg-green-100', label: 'Baja' },
  medium: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Media' },
  high: { color: 'text-red-600', bg: 'bg-red-100', label: 'Alta' },
};

const INTENT_LABELS: Record<string, string> = {
  inquiry: 'Consulta',
  complaint: 'Queja',
  praise: 'Elogio',
  request: 'Solicitud',
  feedback: 'Feedback',
  other: 'Otro',
};

export default function SentimentAnalyzer({
  text: initialText = '',
  onAnalyze,
  showInput = true,
  compact = false,
  className = '',
}: SentimentAnalyzerProps) {
  const [text, setText] = useState(initialText);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [error, setError] = useState('');

  const analyzeSentiment = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/ai/analyze-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          analysisType: compact ? 'quick' : 'full',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al analizar');
      }

      const data = await response.json();
      setResult(data);
      onAnalyze?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sentimentConfig = result ? SENTIMENT_CONFIG[result.sentiment] : null;
  const SentimentIcon = sentimentConfig?.icon || Minus;

  if (compact && result) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`p-1.5 rounded-full ${sentimentConfig?.bg}`}>
          <SentimentIcon className={`w-4 h-4 ${sentimentConfig?.color}`} />
        </div>
        <span className={`text-sm font-medium ${sentimentConfig?.color}`}>
          {sentimentConfig?.label}
        </span>
        {result.urgency === 'high' && (
          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
            Urgente
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showInput && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-gray-900 dark:text-white">
              Análisis de Sentimiento
            </h4>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el texto del mensaje o respuesta a analizar..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
          />

          <button
            onClick={analyzeSentiment}
            disabled={isAnalyzing || !text.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Analizar Sentimiento
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className={`${showInput ? 'mt-6' : ''} space-y-4`}>
          {/* Main Sentiment */}
          <div className={`p-4 rounded-xl ${sentimentConfig?.bg} ${sentimentConfig?.border} border`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-white dark:bg-gray-800`}>
                  <SentimentIcon className={`w-6 h-6 ${sentimentConfig?.color}`} />
                </div>
                <div>
                  <p className={`font-semibold ${sentimentConfig?.color}`}>
                    Sentimiento {sentimentConfig?.label}
                  </p>
                  {result.confidence && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Confianza: {Math.round(result.confidence * 100)}%
                    </p>
                  )}
                </div>
              </div>

              {/* Score Meter */}
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.score > 0 ? '+' : ''}{result.score.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">Puntuación</p>
              </div>
            </div>

            {/* Score Bar */}
            <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  result.score > 0 ? 'bg-green-500' : result.score < 0 ? 'bg-red-500' : 'bg-gray-400'
                }`}
                style={{
                  width: `${Math.abs(result.score) * 50 + 50}%`,
                  marginLeft: result.score < 0 ? `${50 - Math.abs(result.score) * 50}%` : '50%',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Negativo (-1)</span>
              <span>Neutral (0)</span>
              <span>Positivo (+1)</span>
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                Resumen
              </p>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{result.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Intent */}
            {result.intent && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" />
                  Intención
                </p>
                <p className="mt-1 font-semibold text-blue-900 dark:text-blue-300">
                  {INTENT_LABELS[result.intent.type] || result.intent.type}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {result.intent.description}
                </p>
              </div>
            )}

            {/* Urgency */}
            {result.urgency && (
              <div className={`p-4 rounded-lg ${URGENCY_CONFIG[result.urgency].bg}`}>
                <p className={`text-sm font-medium flex items-center gap-2 ${URGENCY_CONFIG[result.urgency].color}`}>
                  <Clock className="w-4 h-4" />
                  Urgencia
                </p>
                <p className={`mt-1 font-semibold ${URGENCY_CONFIG[result.urgency].color}`}>
                  {URGENCY_CONFIG[result.urgency].label}
                </p>
              </div>
            )}
          </div>

          {/* Emotions */}
          {result.emotions && result.emotions.length > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-3">
                Emociones Detectadas
              </p>
              <div className="flex flex-wrap gap-2">
                {result.emotions.map((emotion, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-full text-sm ${
                      emotion.intensity === 'high'
                        ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
                        : emotion.intensity === 'medium'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                    }`}
                  >
                    {emotion.emotion}
                    <span className="ml-1 opacity-60">
                      ({emotion.intensity === 'high' ? 'alta' : emotion.intensity === 'medium' ? 'media' : 'baja'})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Phrases */}
          {result.keyPhrases && result.keyPhrases.length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4" />
                Frases Clave
              </p>
              <div className="flex flex-wrap gap-2">
                {result.keyPhrases.map((phrase, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300"
                  >
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Action */}
          {result.suggestedAction && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Acción Sugerida
              </p>
              <p className="mt-2 text-green-800 dark:text-green-300">
                {result.suggestedAction}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

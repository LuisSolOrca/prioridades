'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  MessageSquare,
  Clock,
  Lightbulb,
  Tag,
  Upload,
  FileText,
  BarChart3,
  Trash2,
  ChevronLeft,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

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

interface BatchResult {
  index: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  summary: string;
  urgency: 'low' | 'medium' | 'high';
  originalText?: string;
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

export default function SentimentAnalysisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Single analysis state
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [error, setError] = useState('');

  // Batch analysis state
  const [batchMode, setBatchMode] = useState(false);
  const [batchTexts, setBatchTexts] = useState<string[]>(['']);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchStats, setBatchStats] = useState<any>(null);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [batchError, setBatchError] = useState('');

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
          analysisType: 'full',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al analizar');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeBatch = async () => {
    const validTexts = batchTexts.filter(t => t.trim());
    if (validTexts.length === 0) return;

    setIsAnalyzingBatch(true);
    setBatchError('');
    setBatchResults([]);
    setBatchStats(null);

    try {
      const response = await fetch('/api/ai/analyze-sentiment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: validTexts }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al analizar');
      }

      const data = await response.json();
      // Add original text to results
      const resultsWithText = data.results.map((r: BatchResult, i: number) => ({
        ...r,
        originalText: validTexts[i],
      }));
      setBatchResults(resultsWithText);
      setBatchStats(data.stats);
    } catch (err: any) {
      setBatchError(err.message);
    } finally {
      setIsAnalyzingBatch(false);
    }
  };

  const addBatchText = () => {
    if (batchTexts.length < 20) {
      setBatchTexts([...batchTexts, '']);
    }
  };

  const removeBatchText = (index: number) => {
    setBatchTexts(batchTexts.filter((_, i) => i !== index));
  };

  const updateBatchText = (index: number, value: string) => {
    const newTexts = [...batchTexts];
    newTexts[index] = value;
    setBatchTexts(newTexts);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const sentimentConfig = result ? SENTIMENT_CONFIG[result.sentiment] : null;
  const SentimentIcon = sentimentConfig?.icon || Minus;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/marketing"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Brain className="w-7 h-7 text-purple-600" />
            Análisis de Sentimiento
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analiza respuestas de clientes para entender su sentimiento e intención
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setBatchMode(false)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            !batchMode
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Análisis Individual
        </button>
        <button
          onClick={() => setBatchMode(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            batchMode
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Análisis por Lotes
        </button>
      </div>

      {!batchMode ? (
        /* Single Analysis Mode */
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Texto a Analizar
            </h2>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Pega aquí el mensaje del cliente, respuesta de email, comentario o cualquier texto que quieras analizar..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm resize-none"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-500">
                {text.length} caracteres
              </span>
              <button
                onClick={analyzeSentiment}
                disabled={isAnalyzing || !text.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
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

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {!result && !isAnalyzing && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Brain className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Ingresa un texto y haz clic en "Analizar" para ver los resultados
                </p>
              </div>
            )}

            {result && (
              <>
                {/* Main Sentiment */}
                <div className={`p-5 rounded-xl ${sentimentConfig?.bg} ${sentimentConfig?.border} border`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-white dark:bg-gray-800">
                        <SentimentIcon className={`w-6 h-6 ${sentimentConfig?.color}`} />
                      </div>
                      <div>
                        <p className={`font-semibold text-lg ${sentimentConfig?.color}`}>
                          Sentimiento {sentimentConfig?.label}
                        </p>
                        {result.confidence && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Confianza: {Math.round(result.confidence * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
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
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
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
                    <div className={`rounded-xl p-4 border ${URGENCY_CONFIG[result.urgency].bg} border-opacity-50`}>
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
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
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
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4" />
                      Frases Clave
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.keyPhrases.map((phrase, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300"
                        >
                          "{phrase}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Action */}
                {result.suggestedAction && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Acción Sugerida
                    </p>
                    <p className="mt-2 text-green-800 dark:text-green-300">
                      {result.suggestedAction}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Batch Analysis Mode */
        <div className="space-y-6">
          {/* Batch Input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Textos a Analizar ({batchTexts.filter(t => t.trim()).length}/20)
              </h2>
              <button
                onClick={addBatchText}
                disabled={batchTexts.length >= 20}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {batchTexts.map((txt, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded text-xs flex items-center justify-center text-gray-500">
                    {idx + 1}
                  </span>
                  <textarea
                    value={txt}
                    onChange={(e) => updateBatchText(idx, e.target.value)}
                    placeholder="Ingresa un mensaje..."
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm resize-none"
                  />
                  {batchTexts.length > 1 && (
                    <button
                      onClick={() => removeBatchText(idx)}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={analyzeBatch}
                disabled={isAnalyzingBatch || batchTexts.filter(t => t.trim()).length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
              >
                {isAnalyzingBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analizando lote...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Analizar Todos
                  </>
                )}
              </button>
            </div>

            {batchError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{batchError}</p>
              </div>
            )}
          </div>

          {/* Batch Stats */}
          {batchStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{batchStats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <p className="text-2xl font-bold text-green-600">{batchStats.positive}</p>
                <p className="text-sm text-green-600">Positivos</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <p className="text-2xl font-bold text-red-600">{batchStats.negative}</p>
                <p className="text-sm text-red-600">Negativos</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{batchStats.neutral}</p>
                <p className="text-sm text-gray-500">Neutrales</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <p className="text-2xl font-bold text-yellow-600">{batchStats.mixed}</p>
                <p className="text-sm text-yellow-600">Mixtos</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-2xl font-bold text-purple-600">
                  {batchStats.avgScore > 0 ? '+' : ''}{batchStats.avgScore.toFixed(2)}
                </p>
                <p className="text-sm text-purple-600">Promedio</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <p className="text-2xl font-bold text-red-600">{batchStats.urgentCount}</p>
                <p className="text-sm text-red-600">Urgentes</p>
              </div>
            </div>
          )}

          {/* Batch Results */}
          {batchResults.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Resultados del Análisis</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {batchResults.map((res, idx) => {
                  const config = SENTIMENT_CONFIG[res.sentiment];
                  const Icon = config.icon;
                  return (
                    <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${config.bg} flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            "{res.originalText}"
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white">{res.summary}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              Score: {res.score > 0 ? '+' : ''}{res.score.toFixed(2)}
                            </span>
                            {res.urgency === 'high' && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                Urgente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

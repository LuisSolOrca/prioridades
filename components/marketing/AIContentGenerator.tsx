'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';

interface ContentType {
  id: string;
  label: string;
  description: string;
}

interface AIContentGeneratorProps {
  contentTypes: ContentType[];
  onContentGenerated: (content: any, type: string) => void;
  context?: {
    product?: string;
    audience?: string;
    keywords?: string[];
  };
  compact?: boolean;
  className?: string;
  buttonLabel?: string;
}

const TONES = [
  { id: 'professional', label: 'Profesional' },
  { id: 'casual', label: 'Casual' },
  { id: 'urgent', label: 'Urgente' },
  { id: 'friendly', label: 'Amigable' },
  { id: 'luxury', label: 'Premium' },
  { id: 'playful', label: 'Creativo' },
];

export default function AIContentGenerator({
  contentTypes,
  onContentGenerated,
  context = {},
  compact = false,
  className = '',
  buttonLabel = 'Generar con IA'
}: AIContentGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState(contentTypes[0]?.id || '');
  const [tone, setTone] = useState('professional');
  const [customContext, setCustomContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = async () => {
    if (!selectedType) return;

    setIsGenerating(true);
    setError('');
    setGeneratedContent(null);

    try {
      const response = await fetch('/api/ai/generate-marketing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: selectedType,
          tone,
          context: customContext,
          product: context.product,
          audience: context.audience,
          keywords: context.keywords,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al generar contenido');
      }

      const data = await response.json();
      setGeneratedContent(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseContent = () => {
    if (generatedContent) {
      onContentGenerated(generatedContent, selectedType);
      setIsOpen(false);
      setGeneratedContent(null);
    }
  };

  const handleCopy = async () => {
    const textContent = typeof generatedContent === 'string'
      ? generatedContent
      : JSON.stringify(generatedContent, null, 2);

    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (content: any) => {
    if (typeof content === 'string') {
      // Split by newlines for multi-option content
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length > 1) {
        return (
          <div className="space-y-2">
            {lines.map((line, i) => (
              <button
                key={i}
                onClick={() => {
                  onContentGenerated(line.trim(), selectedType);
                  setIsOpen(false);
                  setGeneratedContent(null);
                }}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-sm text-gray-700 dark:text-gray-300"
              >
                {line.trim()}
              </button>
            ))}
          </div>
        );
      }
      return (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {content}
        </div>
      );
    }

    // Handle JSON content
    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((item, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {typeof item === 'object' ? (
                <div>
                  {item.title && <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>}
                  {item.value && <p className="font-bold text-2xl text-purple-600">{item.value}</p>}
                  {item.label && <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>}
                  {item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>}
                  {item.question && (
                    <>
                      <p className="font-medium text-gray-900 dark:text-white">{item.question}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.answer}</p>
                    </>
                  )}
                  {item.quote && (
                    <>
                      <p className="italic text-gray-700 dark:text-gray-300">"{item.quote}"</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">— {item.author}, {item.role} at {item.company}</p>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300">{String(item)}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (typeof content === 'object') {
      return (
        <div className="space-y-3">
          {Object.entries(content).map(([key, value]) => (
            <div key={key} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{key}</p>
              <p className="text-sm text-gray-900 dark:text-white">{String(value)}</p>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          {buttonLabel}
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 min-w-[320px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-500" />
                Generar con IA
              </h4>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Tipo de contenido
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {contentTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Tono
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {TONES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Contexto adicional (opcional)
                </label>
                <textarea
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="Describe tu producto, audiencia, objetivo..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedType}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-all"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generar
                  </>
                )}
              </button>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              {generatedContent && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Resultados</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleCopy}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Copiar"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={handleGenerate}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Regenerar"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {renderContent(generatedContent)}
                  </div>
                  <button
                    onClick={handleUseContent}
                    className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Usar este contenido
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full panel mode
  return (
    <div className={`bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Asistente de Contenido IA
        </h4>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ¿Qué quieres generar?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedType === type.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                }`}
              >
                <p className="font-medium text-sm text-gray-900 dark:text-white">{type.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tono
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {TONES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Opciones avanzadas
        </button>

        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contexto adicional
            </label>
            <textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Describe tu producto, audiencia objetivo, palabras clave, objetivo de la campaña..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedType}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-all font-medium"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Generando contenido...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generar Contenido
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {generatedContent && (
          <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900 dark:text-white">Contenido Generado</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 rounded"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerar
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {renderContent(generatedContent)}
            </div>
            <button
              onClick={handleUseContent}
              className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Usar este contenido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

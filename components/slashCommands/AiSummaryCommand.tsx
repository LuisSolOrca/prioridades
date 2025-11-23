'use client';

import { useState, useEffect } from 'react';
import { Brain, Sparkles, Loader2, X, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiSummaryCommandProps {
  projectId: string;
  messages: any[];
  args: string[];
  messageId?: string;
  existingSummary?: string;
  existingMessagesAnalyzed?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AiSummaryCommand({
  projectId,
  messages,
  args,
  messageId,
  existingSummary,
  existingMessagesAnalyzed,
  onClose,
  onSuccess
}: AiSummaryCommandProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(existingSummary || '');
  const [error, setError] = useState('');
  const [messagesAnalyzed, setMessagesAnalyzed] = useState(existingMessagesAnalyzed || 0);

  useEffect(() => {
    // Solo generar si no hay resumen existente (nuevo comando)
    if (!existingSummary) {
      generateSummary();
    }
  }, []);

  const generateSummary = async () => {
    setLoading(true);
    setError('');
    setSummary('');

    try {
      // Determinar cuántos mensajes analizar (por defecto 50)
      const maxMessages = args[0] ? parseInt(args[0], 10) : 50;

      if (isNaN(maxMessages) || maxMessages < 1) {
        setError('Por favor proporciona un número válido de mensajes a analizar.');
        setLoading(false);
        return;
      }

      if (messages.length === 0) {
        setError('No hay mensajes en el chat para analizar.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/ai/chat-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          maxMessages
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el resumen');
      }

      const data = await response.json();
      setSummary(data.summary);
      setMessagesAnalyzed(data.messagesAnalyzed);

      // Guardar el resumen como mensaje en el chat (solo si no es una regeneración de un mensaje existente)
      if (!messageId) {
        try {
          const saveResponse = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/ai-summary ${maxMessages}`,
              commandType: 'ai-summary',
              commandData: {
                summary: data.summary,
                messagesAnalyzed: data.messagesAnalyzed,
                maxMessages,
                generatedAt: new Date().toISOString()
              }
            })
          });

          if (saveResponse.ok && onSuccess) {
            onSuccess();
          }
        } catch (saveError) {
          console.error('Error saving summary to chat:', saveError);
          // No mostramos el error al usuario, el resumen ya se generó correctamente
        }
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setError(err.message || 'Error al generar el resumen del chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-300 dark:border-purple-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Brain className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
              Resumen Inteligente del Chat
              <Sparkles className="text-purple-600 dark:text-purple-400" size={16} />
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Generado por IA - Groq (Llama 3.3 70B)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && summary && !messageId && (
            <button
              onClick={generateSummary}
              className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
              title="Regenerar resumen"
            >
              <RefreshCw size={18} />
            </button>
          )}
          {!messageId && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center">
          <Loader2 className="animate-spin mx-auto mb-3 text-purple-600" size={48} />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Analizando conversación con IA...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Esto puede tomar unos segundos
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 font-medium">❌ Error</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      )}

      {summary && !loading && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Brain size={16} />
              <span>
                Resumen de <strong className="text-gray-900 dark:text-gray-100">{messagesAnalyzed}</strong> mensajes
              </span>
            </div>
            <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
              IA Generado
            </span>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 mt-4" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 mt-3" {...props} />,
                p: ({ node, ...props }) => <p className="text-gray-700 dark:text-gray-300 mb-2" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 mb-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300 mb-2" {...props} />,
                li: ({ node, ...props }) => <li className="text-gray-700 dark:text-gray-300" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />,
                code: ({ node, ...props }) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props} />,
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              💡 Este resumen ha sido generado automáticamente por IA. Revisa la información importante directamente en el chat.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/ai-summary {args.join(' ')}</code>
      </div>
    </div>
  );
}

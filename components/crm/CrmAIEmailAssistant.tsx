'use client';

import { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  Copy,
  Mail,
  RefreshCw,
  Check,
  ChevronDown,
} from 'lucide-react';

interface CrmAIEmailAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  dealId?: string;
  contactId?: string;
  clientId?: string;
  defaultType?: 'introduction' | 'followup' | 'proposal' | 'closing' | 'reactivation' | 'custom';
  onEmailGenerated?: (email: { subject: string; body: string }) => void;
}

const EMAIL_TYPES = [
  { value: 'introduction', label: 'Presentación', description: 'Primer contacto' },
  { value: 'followup', label: 'Seguimiento', description: 'Después de reunión' },
  { value: 'proposal', label: 'Propuesta', description: 'Enviar cotización' },
  { value: 'closing', label: 'Cierre', description: 'Cerrar el deal' },
  { value: 'reactivation', label: 'Reactivación', description: 'Contacto inactivo' },
  { value: 'custom', label: 'Personalizado', description: 'Instrucciones custom' },
];

const TONES = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'persuasive', label: 'Persuasivo' },
];

export default function CrmAIEmailAssistant({
  isOpen,
  onClose,
  dealId,
  contactId,
  clientId,
  defaultType = 'followup',
  onEmailGenerated,
}: CrmAIEmailAssistantProps) {
  const [emailType, setEmailType] = useState(defaultType);
  const [tone, setTone] = useState<'formal' | 'casual' | 'persuasive'>('formal');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [context, setContext] = useState<any>(null);
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setGeneratedEmail(null);

    try {
      const res = await fetch('/api/crm/ai/email-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          contactId,
          clientId,
          emailType,
          tone,
          customInstructions: emailType === 'custom' ? customInstructions : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar email');
      }

      setGeneratedEmail(data.email);
      setContext(data.context);

      if (onEmailGenerated) {
        onEmailGenerated(data.email);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (type: 'subject' | 'body') => {
    if (!generatedEmail) return;

    const text = type === 'subject' ? generatedEmail.subject : generatedEmail.body;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyAll = async () => {
    if (!generatedEmail) return;

    const fullEmail = `Asunto: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied('body');
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Asistente de Email con IA
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Genera emails personalizados automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Email Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Email
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMAIL_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setEmailType(type.value as any)}
                  className={`p-3 rounded-lg border text-left transition ${
                    emailType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`font-medium text-sm ${
                    emailType === type.value ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tono
            </label>
            <div className="flex gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value as any)}
                  className={`px-4 py-2 rounded-lg border transition ${
                    tone === t.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          {emailType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instrucciones Personalizadas
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Describe qué tipo de email quieres generar..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
          )}

          {/* Context Info */}
          {context && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
              <div className="text-gray-500 dark:text-gray-400 mb-1">Contexto detectado:</div>
              <div className="flex flex-wrap gap-2">
                {context.clientName && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                    {context.clientName}
                  </span>
                )}
                {context.contactName && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                    {context.contactName}
                  </span>
                )}
                {context.dealTitle && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                    {context.dealTitle}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Generated Email */}
          {generatedEmail && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-white">Email Generado</h3>
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {copied === 'body' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  Copiar todo
                </button>
              </div>

              {/* Subject */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Asunto
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedEmail.subject}
                    onChange={(e) => setGeneratedEmail({ ...generatedEmail, subject: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleCopy('subject')}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    {copied === 'subject' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Cuerpo del Email
                </label>
                <textarea
                  value={generatedEmail.body}
                  onChange={(e) => setGeneratedEmail({ ...generatedEmail, body: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cerrar
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || (emailType === 'custom' && !customInstructions.trim())}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {generatedEmail ? 'Regenerar' : 'Generar Email'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

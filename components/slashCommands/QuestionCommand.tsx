'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { HelpCircle, User as UserIcon, Calendar, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { LinkifyText } from '@/lib/linkify';

interface QuestionCommandProps {
  projectId: string;
  messageId: string;
  question: string;
  askedTo: string;
  askedToId: string;
  askedBy: string;
  createdAt: string;
  answered: boolean;
  answer?: string;
  answeredAt?: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function QuestionCommand({
  projectId,
  messageId,
  question,
  askedTo,
  askedToId,
  askedBy,
  createdAt,
  answered,
  answer,
  answeredAt,
  onClose,
  onUpdate
}: QuestionCommandProps) {
  const { data: session } = useSession();
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canAnswer = session?.user?.id === askedToId || session?.user?.role === 'ADMIN';

  const formattedDate = new Date(createdAt).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedAnswerDate = answeredAt ? new Date(answeredAt).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || submitting) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answerText.trim(),
          answeredAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar la respuesta');
      }

      setShowAnswerForm(false);
      setAnswerText('');

      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      alert(error.message || 'Error al enviar la respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <HelpCircle className="text-white" size={24} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="text-amber-600 dark:text-amber-400" size={20} />
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
              Pregunta Importante
            </h3>
            {answered && (
              <span className="ml-2 flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                <CheckCircle size={14} />
                Respondida
              </span>
            )}
            {!answered && (
              <span className="ml-2 flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                ⏳ Pendiente
              </span>
            )}
          </div>

          {/* Question */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 shadow-sm border-l-4 border-amber-500">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                Pregunta de {askedBy}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Para: <strong className="text-amber-700 dark:text-amber-300">{askedTo}</strong>
              </span>
            </div>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-base font-medium">
              <LinkifyText text={question} />
            </p>
          </div>

          {/* Answer Section */}
          {answered && answer ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-600 dark:text-green-400" size={18} />
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                  Respuesta de {askedTo}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                <LinkifyText text={answer} />
              </p>
              {formattedAnswerDate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Respondido el {formattedAnswerDate}
                </p>
              )}
            </div>
          ) : canAnswer && !showAnswerForm ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                💡 <strong>Esta pregunta está dirigida a ti.</strong> Por favor proporciona una respuesta.
              </p>
              <button
                onClick={() => setShowAnswerForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium"
              >
                <Send size={16} />
                Responder Pregunta
              </button>
            </div>
          ) : canAnswer && showAnswerForm ? (
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border-2 border-amber-400 dark:border-amber-600">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tu Respuesta:
              </label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!answerText.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
                >
                  <Send size={16} />
                  {submitting ? 'Enviando...' : 'Enviar Respuesta'}
                </button>
                <button
                  onClick={() => {
                    setShowAnswerForm(false);
                    setAnswerText('');
                  }}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : !answered ? (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ⏳ Esperando respuesta de <strong className="text-gray-900 dark:text-gray-100">{askedTo}</strong>
              </p>
            </div>
          ) : null}

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-4">
            <div className="flex items-center gap-2">
              <UserIcon size={16} className="text-amber-600 dark:text-amber-400" />
              <span>
                Pregunta de <strong className="text-gray-900 dark:text-gray-100">{askedBy}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-amber-600 dark:text-amber-400" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Info Footer */}
          <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
              💡 <strong>Tip:</strong> Las preguntas y respuestas quedan registradas en el canal para consulta futura del equipo.
            </p>
          </div>
        </div>
      </div>

      {/* Visual separator */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-700 to-transparent"></div>
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">PREGUNTA IMPORTANTE</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-700 to-transparent"></div>
      </div>
    </div>
  );
}

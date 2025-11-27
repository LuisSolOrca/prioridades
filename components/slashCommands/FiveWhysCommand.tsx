'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { HelpCircle, Plus, ChevronRight } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';
import { LinkifyText } from '@/lib/linkify';

interface WhyEntry {
  why: string;
  answer: string;
  userId: string;
  userName: string;
}

interface FiveWhysCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  problem: string;
  whys: WhyEntry[];
  rootCause: string;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function FiveWhysCommand({
  projectId,
  messageId,
  channelId,
  title,
  problem,
  whys: initialWhys,
  rootCause: initialRootCause,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: FiveWhysCommandProps) {
  const { data: session } = useSession();
  const [whys, setWhys] = useState<WhyEntry[]>(initialWhys || []);
  const [rootCause, setRootCause] = useState(initialRootCause || '');
  const [closed, setClosed] = useState(initialClosed);
  const [newWhy, setNewWhy] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWhys(initialWhys || []);
    setRootCause(initialRootCause || '');
    setClosed(initialClosed);
  }, [initialWhys, initialRootCause, initialClosed]);

  const handleAddWhy = async () => {
    if (!session?.user || !newWhy.trim() || !newAnswer.trim() || submitting || whys.length >= 5) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/five-whys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ why: newWhy.trim(), answer: newAnswer.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setWhys(data.commandData.whys || []);
      setNewWhy('');
      setNewAnswer('');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetRootCause = async () => {
    if (!session?.user || !rootCause.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/five-whys`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootCause: rootCause.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error');
        return;
      }

      const data = await response.json();
      setRootCause(data.commandData.rootCause || '');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'five-whys',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/five-whys`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <HelpCircle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              5 Whys - Análisis de Causa Raíz {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Problem Statement */}
      <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-4 mb-4 border-l-4 border-amber-500">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Problema:</p>
        <p className="text-gray-800 dark:text-gray-200">
          <LinkifyText text={problem || title} />
        </p>
      </div>

      {/* Why Chain */}
      <div className="space-y-3 mb-4">
        {whys.map((entry, index) => (
          <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-4 border-l-4 border-amber-400">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                  ¿Por qué {entry.why}?
                </p>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-600 rounded p-2">
                  <LinkifyText text={entry.answer} />
                </p>
                <p className="text-xs text-gray-500 mt-1">— {entry.userName}</p>
              </div>
            </div>
            {index < whys.length - 1 && (
              <div className="flex justify-center mt-2">
                <ChevronRight className="text-amber-400 rotate-90" size={24} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Why */}
      {!closed && whys.length < 5 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 border-2 border-dashed border-amber-300">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            ¿Por qué #{whys.length + 1}?
          </p>
          <input
            type="text"
            value={newWhy}
            onChange={(e) => setNewWhy(e.target.value)}
            placeholder="¿Por qué...?"
            className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            disabled={submitting}
          />
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Porque..."
            rows={2}
            className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 resize-none"
            disabled={submitting}
          />
          <button
            onClick={handleAddWhy}
            disabled={!newWhy.trim() || !newAnswer.trim() || submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Agregar Por Qué
          </button>
        </div>
      )}

      {/* Root Cause */}
      {whys.length >= 3 && (
        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 mb-4 border-2 border-green-400">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
            Causa Raíz Identificada:
          </p>
          {!closed ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="La causa raíz es..."
                className="flex-1 px-3 py-2 border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                disabled={submitting}
              />
              <button
                onClick={handleSetRootCause}
                disabled={!rootCause.trim() || submitting}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium"
              >
                Guardar
              </button>
            </div>
          ) : (
            <p className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 rounded p-3">
              <LinkifyText text={rootCause || 'No se identificó causa raíz'} />
            </p>
          )}
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && whys.length > 0 && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Análisis
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Análisis cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/five-whys</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Coffee, Send, User } from 'lucide-react';

interface Response {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface IcebreakerCommandProps {
  projectId: string;
  messageId?: string;
  channelId: string;
  question: string;
  responses: Response[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function IcebreakerCommand({
  projectId,
  messageId,
  channelId,
  question,
  responses: initialResponses,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: IcebreakerCommandProps) {
  const { data: session } = useSession();
  const [responses, setResponses] = useState<Response[]>(initialResponses || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newResponse, setNewResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync state when props change (Pusher updates)
  useEffect(() => {
    setResponses(initialResponses || []);
    setClosed(initialClosed);
  }, [initialResponses, initialClosed]);

  const hasResponded = responses.some(r => r.userId === session?.user?.id);

  const handleSubmitResponse = async () => {
    if (!session?.user?.id || closed || submitting || !newResponse.trim()) return;

    setSubmitting(true);
    try {
      const response: Response = {
        id: Date.now().toString(),
        userId: session.user.id,
        userName: session.user.name || 'Usuario',
        text: newResponse.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedResponses = [...responses, response];

      const res = await fetch(`/api/projects/${projectId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandData: {
            question,
            responses: updatedResponses,
            createdBy,
            closed
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResponses(data.commandData.responses || updatedResponses);
        setNewResponse('');
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-cyan-400 dark:border-cyan-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Coffee className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Icebreaker</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {closed ? 'Finalizado' : `${responses.length} respuesta${responses.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-6 mb-4 border-l-4 border-cyan-500">
        <div className="text-center">
          <p className="text-2xl mb-3">💬</p>
          <p className="text-lg text-gray-800 dark:text-gray-100 font-medium">
            {question}
          </p>
        </div>
      </div>

      {/* Response Input */}
      {!closed && session?.user && !hasResponded && (
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitResponse()}
              placeholder="Escribe tu respuesta..."
              className="flex-1 px-4 py-3 rounded-lg border border-cyan-200 dark:border-cyan-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={submitting}
            />
            <button
              onClick={handleSubmitResponse}
              disabled={!newResponse.trim() || submitting}
              className="px-4 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {hasResponded && !closed && (
        <div className="mb-4 p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg text-center text-sm text-cyan-700 dark:text-cyan-300">
          ✓ Ya compartiste tu respuesta
        </div>
      )}

      {/* Responses List */}
      {responses.length > 0 && (
        <div className="space-y-3 mb-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm">
            Respuestas del equipo:
          </h4>
          <div className="grid gap-3">
            {responses.map((response) => (
              <div
                key={response.id}
                className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {response.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {response.userName}
                      {response.userId === session?.user?.id && (
                        <span className="ml-2 text-xs text-cyan-600 dark:text-cyan-400">(tú)</span>
                      )}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {response.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {responses.length === 0 && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <User size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sé el primero en compartir tu respuesta</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-cyan-100 dark:bg-cyan-900/30 rounded-lg p-3 text-sm text-cyan-800 dark:text-cyan-200">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p className="text-xs">
          Las respuestas ayudan a conocerse mejor y crear un ambiente más relajado antes de comenzar.
        </p>
      </div>
    </div>
  );
}

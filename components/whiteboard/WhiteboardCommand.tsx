'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PenTool, ExternalLink, Loader2, Users, Clock } from 'lucide-react';

interface WhiteboardCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  whiteboardId?: string;
  createdBy: string;
  createdByName?: string;
  onUpdate?: () => void;
}

export default function WhiteboardCommand({
  projectId,
  messageId,
  channelId,
  title,
  whiteboardId: initialWhiteboardId,
  createdBy,
  createdByName,
  onUpdate
}: WhiteboardCommandProps) {
  const { data: session } = useSession();
  const [creating, setCreating] = useState(false);
  const [whiteboardId, setWhiteboardId] = useState(initialWhiteboardId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWhiteboardId(initialWhiteboardId);
  }, [initialWhiteboardId]);

  const handleCreate = async () => {
    if (creating || whiteboardId) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/messages/${messageId}/whiteboard`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error creando pizarra');
      }

      const data = await response.json();
      setWhiteboardId(data.whiteboard._id);
      onUpdate?.();
    } catch (err: any) {
      console.error('Error creating whiteboard:', err);
      setError(err.message || 'Error creando pizarra');
    } finally {
      setCreating(false);
    }
  };

  const isCreator = (session?.user as any)?.id === createdBy;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl border-2 border-indigo-300 dark:border-indigo-600 p-6 my-2 shadow-lg max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
          <PenTool className="text-white" size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 truncate">
            {title}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              Pizarra Colaborativa
            </span>
            {createdByName && (
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users size={14} />
                {createdByName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Espacio de dibujo colaborativo en tiempo real. Crea diagramas, mapas mentales,
        wireframes y más con tu equipo.
      </p>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Action button */}
      {whiteboardId ? (
        <Link
          href={`/whiteboard/${whiteboardId}`}
          target="_blank"
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
        >
          <ExternalLink size={18} />
          Abrir Pizarra
        </Link>
      ) : (
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Creando pizarra...
            </>
          ) : (
            <>
              <PenTool size={18} />
              Crear Pizarra
            </>
          )}
        </button>
      )}

      {/* Footer info */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>Colaboración en tiempo real</span>
        </div>
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
          /whiteboard
        </code>
      </div>
    </div>
  );
}

'use client';

import { Webhook, ExternalLink, Database, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface WebhookMessageCardProps {
  content: string;
  webhookName: string;
  username?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function WebhookMessageCard({
  content,
  webhookName,
  username = 'Webhook',
  metadata = {},
  createdAt
}: WebhookMessageCardProps) {
  const [showMetadata, setShowMetadata] = useState(false);

  return (
    <div className="my-2 max-w-3xl">
      {/* Header con icono y nombre del webhook */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-t-lg flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <Webhook size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{username}</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Sistema Externo</span>
          </div>
          <div className="text-xs opacity-90 flex items-center gap-1">
            <Database size={12} />
            vía {webhookName}
          </div>
        </div>
        <div className="text-xs opacity-75">
          {new Date(createdAt).toLocaleString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short'
          })}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white dark:bg-gray-800 border-x-2 border-purple-500 dark:border-purple-600 px-6 py-4">
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words m-0">
            {content}
          </p>
        </div>
      </div>

      {/* Footer con metadata */}
      {Object.keys(metadata).length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border-2 border-t-0 border-purple-500 dark:border-purple-600 rounded-b-lg">
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition"
          >
            <span className="flex items-center gap-2">
              <AlertCircle size={14} />
              Datos Adicionales
            </span>
            <span>{showMetadata ? '▲' : '▼'}</span>
          </button>

          {showMetadata && (
            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
              <div className="mt-3 space-y-2">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="font-semibold text-purple-600 dark:text-purple-400 min-w-[100px] break-words">
                      {key}:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1 break-words font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Indicador visual inferior */}
      <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 rounded-b-lg"></div>
    </div>
  );
}

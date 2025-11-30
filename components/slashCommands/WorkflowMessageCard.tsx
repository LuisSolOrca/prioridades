'use client';

import { Zap, Bot, Clock } from 'lucide-react';

interface WorkflowMessageCardProps {
  content: string;
  workflowName: string;
  username?: string;
  createdAt: string;
}

export default function WorkflowMessageCard({
  content,
  workflowName,
  username = 'CRM Workflow',
  createdAt
}: WorkflowMessageCardProps) {
  return (
    <div className="my-2 max-w-3xl">
      {/* Header con icono y nombre del workflow */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-t-lg flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <Zap size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Bot size={16} />
            <span className="font-semibold">{username}</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Automatización</span>
          </div>
          <div className="text-xs opacity-90 flex items-center gap-1">
            <Clock size={12} />
            {workflowName}
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
      <div className="bg-white dark:bg-gray-800 border-x-2 border-amber-500 dark:border-amber-600 px-6 py-4">
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words m-0">
            {content}
          </p>
        </div>
      </div>

      {/* Indicador visual inferior */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-b-lg"></div>
    </div>
  );
}

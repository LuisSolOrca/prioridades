'use client';

import { Lightbulb, User as UserIcon, Calendar, FileCheck } from 'lucide-react';
import { LinkifyText } from '@/lib/linkify';

interface DecisionCommandProps {
  projectId: string;
  messageId?: string;
  decision: string;
  createdBy: string;
  createdAt: string;
  onClose: () => void;
}

export default function DecisionCommand({
  projectId,
  messageId,
  decision,
  createdBy,
  createdAt,
  onClose
}: DecisionCommandProps) {
  const formattedDate = new Date(createdAt).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <Lightbulb className="text-white" size={24} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <FileCheck className="text-amber-600 dark:text-amber-400" size={20} />
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
              Decisión Registrada
            </h3>
          </div>

          {/* Decision Text */}
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 shadow-sm">
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-base">
              <LinkifyText text={decision} />
            </p>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <UserIcon size={16} className="text-amber-600 dark:text-amber-400" />
              <span>
                Registrado por <strong className="text-gray-900 dark:text-gray-100">{createdBy}</strong>
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
              💡 <strong>Tip:</strong> Las decisiones registradas se pueden buscar después usando <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">/search decision</code>
            </p>
          </div>
        </div>
      </div>

      {/* Visual separator */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-700 to-transparent"></div>
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">DECISIÓN IMPORTANTE</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-700 to-transparent"></div>
      </div>
    </div>
  );
}

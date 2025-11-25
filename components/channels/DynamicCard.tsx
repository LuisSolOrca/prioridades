'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Vote,
  Lightbulb,
  RotateCcw,
  Target,
  Heart,
  Users,
  Lock,
  Play,
  Trash2,
  Loader2,
  Layers
} from 'lucide-react';

interface DynamicCardProps {
  dynamic: {
    _id: string;
    commandType: string;
    commandData: {
      title?: string;
      question?: string;
      closed?: boolean;
      createdBy?: string;
    };
    userId?: {
      _id: string;
      name: string;
    };
    createdAt?: string;
  };
  participantCount?: number;
  onClick: () => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

const DYNAMIC_ICONS: Record<string, { icon: typeof Vote; color: string; bg: string }> = {
  // Votación
  'poll': { icon: Vote, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'dot-voting': { icon: Vote, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'blind-vote': { icon: Vote, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'fist-of-five': { icon: Vote, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'confidence-vote': { icon: Vote, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'nps': { icon: Vote, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  // Ideación
  'brainstorm': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  'mind-map': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  'pros-cons': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  'decision-matrix': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  'ranking': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  // Retrospectiva
  'retrospective': { icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  'retro': { icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  'team-health': { icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  'mood': { icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  // Productividad
  'action-items': { icon: Target, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  'checklist': { icon: Target, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  'agenda': { icon: Target, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  'parking-lot': { icon: Target, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  'pomodoro': { icon: Target, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  'estimation': { icon: Target, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  'estimation-poker': { icon: Target, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  // Reconocimiento
  'kudos-wall': { icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  'icebreaker': { icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  // Frameworks
  'inception-deck': { icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  'delegation-poker': { icon: Users, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  'moving-motivators': { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
};

export default function DynamicCard({ dynamic, participantCount = 0, onClick, onDelete, canDelete }: DynamicCardProps) {
  const [deleting, setDeleting] = useState(false);

  // Safety check - return null if dynamic is invalid
  if (!dynamic || !dynamic._id) {
    return null;
  }

  const iconConfig = DYNAMIC_ICONS[dynamic.commandType || ''] || {
    icon: Target,
    color: 'text-gray-600',
    bg: 'bg-gray-100 dark:bg-gray-900/30'
  };
  const Icon = iconConfig.icon;
  const isClosed = dynamic.commandData?.closed ?? false;
  const title = dynamic.commandData?.title || dynamic.commandData?.question || 'Sin título';
  const userName = dynamic.userId?.name || 'Usuario';

  // Safe date formatting
  let timeAgo = 'hace un momento';
  try {
    if (dynamic.createdAt) {
      timeAgo = formatDistanceToNow(new Date(dynamic.createdAt), {
        addSuffix: true,
        locale: es
      });
    }
  } catch {
    timeAgo = 'hace un momento';
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || !confirm('¿Eliminar esta dinámica del historial?')) return;

    setDeleting(true);
    await onDelete(dynamic._id);
    setDeleting(false);
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
          isClosed
            ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-75'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${iconConfig.bg}`}>
            <Icon className={iconConfig.color} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {title}
              </h4>
              {isClosed && (
                <Lock size={14} className="text-gray-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              por {userName} · {timeAgo}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                isClosed
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>
                {isClosed ? 'Cerrada' : 'Activa'}
              </span>
              {participantCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Users size={12} />
                  {participantCount}
                </span>
              )}
            </div>
          </div>
          {!isClosed && (
            <div className="flex-shrink-0">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Play size={16} />
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Delete button - shows on hover for closed dynamics */}
      {canDelete && onDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all disabled:opacity-50"
          title="Eliminar dinámica"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      )}
    </div>
  );
}

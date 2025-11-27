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
  Layers,
  Mail
} from 'lucide-react';

interface DynamicCardProps {
  dynamic: {
    _id: string;
    projectId?: string;
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
  projectId?: string;
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
  // Análisis estratégico
  'swot': { icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  'soar': { icon: Target, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  'six-hats': { icon: Lightbulb, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-900/30' },
  'crazy-8s': { icon: Lightbulb, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
  'affinity-map': { icon: Layers, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  // Retros adicionales
  'rose-bud-thorn': { icon: RotateCcw, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  'sailboat': { icon: RotateCcw, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  'start-stop-continue': { icon: RotateCcw, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  // Standup
  'standup': { icon: Users, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  // Nuevos widgets de ideación
  'scamper': { icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  'starbursting': { icon: Lightbulb, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  'reverse-brainstorm': { icon: Lightbulb, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  'worst-idea': { icon: Lightbulb, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  'lotus-blossom': { icon: Lightbulb, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  // Nuevos widgets de análisis
  'five-whys': { icon: Target, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  'impact-effort': { icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  'opportunity-tree': { icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  // Nuevos widgets batch 2
  'empathy-map': { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  'moscow': { icon: Target, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  '4ls': { icon: RotateCcw, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  'pre-mortem': { icon: Target, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  'lean-coffee': { icon: Users, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  'user-story-mapping': { icon: Layers, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  // Nuevos widgets batch 3
  'starfish': { icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  'mad-sad-glad': { icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  'how-might-we': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  'fishbone': { icon: Target, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  'raci': { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  'roman-voting': { icon: Vote, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  // Nuevos widgets batch 4
  'lean-canvas': { icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  'customer-journey': { icon: Users, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  'risk-matrix': { icon: Target, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  'rice': { icon: Target, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'working-agreements': { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  'brainwriting': { icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  // Nuevos widgets batch 5
  'hot-air-balloon': { icon: RotateCcw, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
  'kalm': { icon: RotateCcw, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  'persona': { icon: Users, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  'assumption-mapping': { icon: Target, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  'team-canvas': { icon: Users, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
};

export default function DynamicCard({ dynamic, projectId, participantCount = 0, onClick, onDelete, canDelete }: DynamicCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

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
    try {
      await onDelete(dynamic._id);
      // En éxito el componente se desmonta, no necesitamos resetear
    } catch (error) {
      console.error('Error deleting dynamic:', error);
      alert('Error al eliminar la dinámica');
      setDeleting(false);
    }
  };

  const handleSendEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const effectiveProjectId = projectId || dynamic.projectId;
    if (!effectiveProjectId) {
      alert('No se puede enviar: falta el ID del proyecto');
      return;
    }

    if (!confirm('¿Enviar resumen de esta dinámica por correo a todos los participantes?')) return;

    setSendingEmail(true);
    try {
      const response = await fetch(`/api/projects/${effectiveProjectId}/messages/${dynamic._id}/send-email`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar');
      }

      alert(`✅ ${data.message}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(error.message || 'Error al enviar el correo');
    } finally {
      setSendingEmail(false);
    }
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

      {/* Action buttons - shows on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {/* Send email button - shows for closed dynamics */}
        {isClosed && (projectId || dynamic.projectId) && (
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all disabled:opacity-50"
            title="Enviar por correo a participantes"
          >
            {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          </button>
        )}

        {/* Delete button */}
        {canDelete && onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all disabled:opacity-50"
            title="Eliminar dinámica"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Target,
  User,
  Building2,
  FolderKanban,
  Loader2,
  CheckCircle,
  Circle,
  Clock,
  ExternalLink,
  Link2,
  AlertTriangle,
  Flag,
  Edit,
  MessageCircle,
  Send,
} from 'lucide-react';

interface ChecklistItem {
  _id: string;
  text: string;
  completed: boolean;
  completedHours?: number;
}

interface EvidenceLink {
  _id: string;
  title: string;
  url: string;
  createdAt: string;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface Comment {
  _id: string;
  text: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  weekStart: string;
  weekEnd: string;
  completionPercentage: number;
  status: string;
  type: string;
  wasEdited: boolean;
  isCarriedOver: boolean;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  initiativeIds: Initiative[];
  clientId?: {
    _id: string;
    name: string;
  };
  projectId?: {
    _id: string;
    name: string;
  };
  checklist: ChecklistItem[];
  evidenceLinks: EvidenceLink[];
  createdAt: string;
  updatedAt: string;
}

export default function PriorityDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const priorityId = params.id as string;

  const [priority, setPriority] = useState<Priority | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadPriority();
    }
  }, [status, router, priorityId]);

  const loadPriority = async () => {
    try {
      setLoading(true);
      const [priorityRes, commentsRes] = await Promise.all([
        fetch(`/api/priorities/${priorityId}`),
        fetch(`/api/comments?priorityId=${priorityId}`),
      ]);

      if (!priorityRes.ok) {
        router.push('/priorities');
        return;
      }

      const data = await priorityRes.json();
      setPriority(data);

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }
    } catch (error) {
      console.error('Error loading priority:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorityId,
          text: newComment.trim(),
        }),
      });

      if (res.ok) {
        setNewComment('');
        // Recargar comentarios
        const commentsRes = await fetch(`/api/comments?priorityId=${priorityId}`);
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(commentsData);
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatCommentDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `hace ${diffMins}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETADO':
        return {
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          icon: CheckCircle,
          label: 'Completado'
        };
      case 'EN_TIEMPO':
        return {
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          icon: Clock,
          label: 'En Tiempo'
        };
      case 'EN_RIESGO':
        return {
          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          icon: AlertTriangle,
          label: 'En Riesgo'
        };
      case 'BLOQUEADO':
        return {
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          icon: AlertTriangle,
          label: 'Bloqueado'
        };
      case 'REPROGRAMADO':
        return {
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          icon: Calendar,
          label: 'Reprogramado'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
          icon: Circle,
          label: status
        };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short'
    });
  };

  const completedTasks = priority?.checklist.filter(t => t.completed).length || 0;
  const totalTasks = priority?.checklist.length || 0;
  const totalHours = priority?.checklist.reduce((sum, t) => sum + (t.completedHours || 0), 0) || 0;

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !priority) return null;

  const statusConfig = getStatusConfig(priority.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          href="/priorities"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver a Prioridades
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${statusConfig.color}`}>
                <StatusIcon size={28} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{priority.title}</h1>
                  {priority.isCarriedOver && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs">
                      Reprogramada
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className={`px-2 py-0.5 rounded font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${
                    priority.type === 'ESTRATEGICA'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {priority.type === 'ESTRATEGICA' ? 'Estratégica' : 'Operativa'}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/priorities"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Edit size={18} />
              Editar
            </Link>
          </div>

          {priority.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{priority.description}</p>
          )}

          {/* Initiatives */}
          {priority.initiativeIds && priority.initiativeIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {priority.initiativeIds.map((initiative) => (
                <span
                  key={initiative._id}
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: initiative.color }}
                >
                  {initiative.name}
                </span>
              ))}
            </div>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t dark:border-gray-700 text-sm">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User size={16} />
              {priority.userId?.name || 'Usuario'}
            </span>
            {priority.clientId && (
              <Link
                href={`/crm/clients/${priority.clientId._id}`}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Building2 size={16} />
                {priority.clientId.name}
              </Link>
            )}
            {priority.projectId && (
              <Link
                href={`/projects/${priority.projectId._id}`}
                className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <FolderKanban size={16} />
                {priority.projectId.name}
              </Link>
            )}
          </div>
        </div>

        {/* Progress & Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Progreso</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {priority.completionPercentage}%
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${priority.completionPercentage}%` }}
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tareas</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {completedTasks}/{totalTasks}
            </div>
            <div className="text-xs text-gray-500 mt-1">completadas</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Horas</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {totalHours}h
            </div>
            <div className="text-xs text-gray-500 mt-1">registradas</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Evidencias</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {priority.evidenceLinks.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">enlaces</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Checklist */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <CheckSquare size={20} className="text-indigo-500" />
                  Checklist ({completedTasks}/{totalTasks})
                </h2>
              </div>
              {priority.checklist.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No hay tareas en el checklist
                </div>
              ) : (
                <div className="divide-y dark:divide-gray-700">
                  {priority.checklist.map((item) => (
                    <div key={item._id} className="p-4 flex items-start gap-3">
                      {item.completed ? (
                        <CheckCircle size={20} className="text-green-500 mt-0.5" />
                      ) : (
                        <Circle size={20} className="text-gray-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <span className={`${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {item.text}
                        </span>
                        {item.completedHours && item.completedHours > 0 && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            ({item.completedHours}h)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evidence Links */}
            {priority.evidenceLinks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Link2 size={20} className="text-blue-500" />
                    Enlaces de Evidencia ({priority.evidenceLinks.length})
                  </h2>
                </div>
                <div className="divide-y dark:divide-gray-700">
                  {priority.evidenceLinks.map((link) => (
                    <a
                      key={link._id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-gray-100">{link.title}</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400 truncate max-w-md">{link.url}</p>
                      </div>
                      <ExternalLink size={18} className="text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <MessageCircle size={20} className="text-purple-500" />
                  Comentarios ({comments.length})
                </h2>
              </div>

              {/* Comment List */}
              <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No hay comentarios aún
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment._id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {comment.userId?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                              {comment.userId?.name || 'Usuario'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatCommentDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap break-words">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* New Comment Form */}
              <form onSubmit={handleSubmitComment} className="p-4 border-t dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submittingComment ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Week Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                <Calendar size={20} className="text-purple-500" />
                Semana
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Inicio:</span>
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {formatDate(priority.weekStart)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Fin:</span>
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {formatDate(priority.weekEnd)}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Creada</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {formatShortDate(priority.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Actualizada</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {formatShortDate(priority.updatedAt)}
                  </span>
                </div>
                {priority.wasEdited && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Editada</span>
                    <span className="text-orange-600 dark:text-orange-400">Sí</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

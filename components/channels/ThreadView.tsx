'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  X,
  Send,
  Edit2,
  Trash2,
  Check,
  MessageSquare
} from 'lucide-react';
import MessageContent from './MessageContent';

interface Priority {
  _id: string;
  title: string;
  status: string;
  completionPercentage: number;
  userId?: {
    _id: string;
    name: string;
  };
}

interface Message {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  content: string;
  mentions: any[];
  priorityMentions?: Priority[];
  reactions: Array<{
    userId: { _id: string; name: string };
    emoji: string;
    createdAt: string;
  }>;
  parentMessageId?: string;
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

interface ThreadViewProps {
  projectId: string;
  parentMessage: Message;
  onClose: () => void;
}

export default function ThreadView({ projectId, parentMessage, onClose }: ThreadViewProps) {
  const { data: session } = useSession();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const repliesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReplies();
  }, [parentMessage._id]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const scrollToBottom = () => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadReplies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/messages?parentMessageId=${parentMessage._id}`
      );

      if (!response.ok) {
        throw new Error('Error al cargar respuestas');
      }

      const data = await response.json();
      setReplies((data.messages || []).reverse()); // Invertir para mostrar más recientes abajo
    } catch (err) {
      console.error('Error loading replies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || sending) return;

    try {
      setSending(true);

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newReply.trim(),
          mentions: [], // TODO: detectar menciones
          parentMessageId: parentMessage._id
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar respuesta');
      }

      const reply = await response.json();
      setReplies((prev) => [...prev, reply]);
      setNewReply('');
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Error al enviar respuesta');
    } finally {
      setSending(false);
    }
  };

  const handleEditReply = async (replyId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/messages/${replyId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editContent.trim() })
        }
      );

      if (!response.ok) {
        throw new Error('Error al editar respuesta');
      }

      const updatedReply = await response.json();
      setReplies((prev) =>
        prev.map((r) => (r._id === replyId ? updatedReply : r))
      );
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      console.error('Error editing reply:', err);
      alert('Error al editar respuesta');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta respuesta?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/messages/${replyId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Error al eliminar respuesta');
      }

      setReplies((prev) => prev.filter((r) => r._id !== replyId));
    } catch (err) {
      console.error('Error deleting reply:', err);
      alert('Error al eliminar respuesta');
    }
  };

  const handleReaction = async (replyId: string, emoji: string) => {
    try {
      const reply = replies.find((r) => r._id === replyId);
      const hasReacted = reply?.reactions.some(
        (r) => r.userId._id === session?.user.id && r.emoji === emoji
      );

      if (hasReacted) {
        // DELETE reaction
        const response = await fetch(
          `/api/projects/${projectId}/messages/${replyId}/reactions?emoji=${encodeURIComponent(emoji)}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          const updatedReply = await response.json();
          setReplies((prev) =>
            prev.map((r) => (r._id === replyId ? updatedReply : r))
          );
        }
      } else {
        // POST reaction
        const response = await fetch(
          `/api/projects/${projectId}/messages/${replyId}/reactions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji })
          }
        );

        if (response.ok) {
          const updatedReply = await response.json();
          setReplies((prev) =>
            prev.map((r) => (r._id === replyId ? updatedReply : r))
          );
        }
      }
    } catch (err) {
      console.error('Error handling reaction:', err);
    }
  };

  const getReactionSummary = (reactions: Message['reactions']) => {
    const summary: { [emoji: string]: { count: number; users: string[] } } = {};

    reactions.forEach((r) => {
      if (!summary[r.emoji]) {
        summary[r.emoji] = { count: 0, users: [] };
      }
      summary[r.emoji].count++;
      summary[r.emoji].users.push(r.userId.name);
    });

    return summary;
  };

  const isOwn = (message: Message) => message.userId._id === session?.user.id;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Hilo de conversación
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Parent Message */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                parentMessage.userId._id === 'deleted'
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                  : 'bg-gradient-to-br from-blue-400 to-purple-500'
              }`}>
                {parentMessage.userId.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-semibold ${
                  parentMessage.userId._id === 'deleted'
                    ? 'text-gray-500 dark:text-gray-400 italic'
                    : 'text-gray-800 dark:text-gray-100'
                }`}>
                  {parentMessage.userId.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(parentMessage.createdAt).toLocaleString('es-MX', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <MessageContent
                  content={parentMessage.content}
                  priorityMentions={parentMessage.priorityMentions}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <MessageSquare className="animate-pulse mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-gray-500 dark:text-gray-400">Cargando respuestas...</p>
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400">
                Aún no hay respuestas. Sé el primero en responder.
              </p>
            </div>
          ) : (
            replies.map((reply) => {
              const reactionSummary = getReactionSummary(reply.reactions);

              return (
                <div key={reply._id} className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs ${
                      reply.userId._id === 'deleted'
                        ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                        : 'bg-gradient-to-br from-green-400 to-blue-500'
                    }`}>
                      {reply.userId.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Reply Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${
                        reply.userId._id === 'deleted'
                          ? 'text-gray-500 dark:text-gray-400 italic'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {reply.userId.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(reply.createdAt).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {reply.isEdited && (
                        <span className="text-xs text-gray-400 italic">(editado)</span>
                      )}
                    </div>

                    {editingId === reply._id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditReply(reply._id)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditContent('');
                          }}
                          className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative group">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                          <div className="text-sm text-gray-800 dark:text-gray-100">
                            <MessageContent
                              content={reply.content}
                              priorityMentions={reply.priorityMentions}
                            />
                          </div>

                          {/* Actions */}
                          {isOwn(reply) && !reply.isDeleted && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingId(reply._id);
                                  setEditContent(reply.content);
                                }}
                                className="p-1 bg-white/80 dark:bg-gray-800/80 rounded hover:bg-white dark:hover:bg-gray-800"
                                title="Editar"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteReply(reply._id)}
                                className="p-1 bg-white/80 dark:bg-gray-800/80 rounded hover:bg-white dark:hover:bg-gray-800"
                                title="Eliminar"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reactions */}
                        {Object.keys(reactionSummary).length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {Object.entries(reactionSummary).map(([emoji, data]) => {
                              const hasReacted = reply.reactions.some(
                                (r) => r.userId._id === session?.user.id && r.emoji === emoji
                              );

                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(reply._id, emoji)}
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                    hasReacted
                                      ? 'bg-blue-100 dark:bg-blue-900 border border-blue-500'
                                      : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
                                  }`}
                                  title={data.users.join(', ')}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {data.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Quick Reactions */}
                        <div className="flex gap-1 mt-1">
                          {['👍', '❤️', '😄', '🎉'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(reply._id, emoji)}
                              className="text-sm opacity-50 hover:opacity-100 transition"
                              title={`Reaccionar con ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={repliesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder="Escribe una respuesta... (usa @ para mencionar)"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              onClick={handleSendReply}
              disabled={!newReply.trim() || sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <Send size={18} />
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Presiona Enter para enviar
          </p>
        </div>
      </div>
    </div>
  );
}

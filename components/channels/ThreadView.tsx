'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  X,
  Send,
  Edit2,
  Trash2,
  Check,
  MessageSquare,
  Reply,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import MessageContent from './MessageContent';
import EmojiPicker from './EmojiPicker';
import MarkdownHelp from './MarkdownHelp';

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
  rootMessageId?: string;
  threadDepth?: number;
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

interface ThreadViewProps {
  projectId: string;
  parentMessage: Message;
  channelId: string;
  onClose: () => void;
}

// Maximum nesting depth for visual indentation
const MAX_VISUAL_DEPTH = 4;

export default function ThreadView({ projectId, parentMessage, channelId, onClose }: ThreadViewProps) {
  const { data: session } = useSession();
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(new Set());
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadThreadMessages();
  }, [parentMessage._id]);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages]);

  useEffect(() => {
    // Focus input when replying to a message
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const scrollToBottom = () => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreadMessages = async () => {
    try {
      setLoading(true);
      // Use rootMessageId to load the entire thread tree
      const rootId = parentMessage.rootMessageId || parentMessage._id;
      const response = await fetch(
        `/api/projects/${projectId}/messages?rootMessageId=${rootId}&limit=200`
      );

      if (!response.ok) {
        throw new Error('Error al cargar hilo');
      }

      const data = await response.json();
      // Sort by createdAt ascending to maintain chronological order
      const sorted = (data.messages || []).sort((a: Message, b: Message) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setAllMessages(sorted);
    } catch (err) {
      console.error('Error loading thread:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build a tree structure from flat messages
  const buildMessageTree = (messages: Message[]): Map<string | null, Message[]> => {
    const tree = new Map<string | null, Message[]>();

    messages.forEach(msg => {
      const parentId = msg.parentMessageId || null;
      if (!tree.has(parentId)) {
        tree.set(parentId, []);
      }
      tree.get(parentId)!.push(msg);
    });

    return tree;
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || sending) return;

    try {
      setSending(true);

      // Determine which message to reply to
      const targetParentId = replyingTo?._id || parentMessage._id;

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newReply.trim(),
          channelId: channelId,
          mentions: [],
          parentMessageId: targetParentId
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar respuesta');
      }

      const reply = await response.json();
      setAllMessages((prev) => [...prev, reply]);
      setNewReply('');
      setReplyingTo(null);
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
      setAllMessages((prev) =>
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

      setAllMessages((prev) => prev.filter((r) => r._id !== replyId));
    } catch (err) {
      console.error('Error deleting reply:', err);
      alert('Error al eliminar respuesta');
    }
  };

  const handleReaction = async (replyId: string, emoji: string) => {
    try {
      const reply = allMessages.find((r) => r._id === replyId);
      const hasReacted = reply?.reactions.some(
        (r) => r.userId._id === session?.user.id && r.emoji === emoji
      );

      if (hasReacted) {
        const response = await fetch(
          `/api/projects/${projectId}/messages/${replyId}/reactions?emoji=${encodeURIComponent(emoji)}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          const updatedReply = await response.json();
          setAllMessages((prev) =>
            prev.map((r) => (r._id === replyId ? updatedReply : r))
          );
        }
      } else {
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
          setAllMessages((prev) =>
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

  const toggleCollapse = (messageId: string) => {
    setCollapsedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const isOwn = (message: Message) => message.userId._id === session?.user.id;

  const getDepthColor = (depth: number) => {
    const colors = [
      'border-blue-400',
      'border-green-400',
      'border-purple-400',
      'border-orange-400',
      'border-pink-400'
    ];
    return colors[depth % colors.length];
  };

  // Recursive component to render nested messages
  const renderMessage = (message: Message, tree: Map<string | null, Message[]>, depth: number = 0) => {
    const children = tree.get(message._id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedMessages.has(message._id);
    const reactionSummary = getReactionSummary(message.reactions);
    const isRoot = !message.parentMessageId;
    const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);

    return (
      <div key={message._id} className="relative">
        {/* Indentation line for nested messages */}
        {depth > 0 && (
          <div
            className={`absolute left-0 top-0 bottom-0 w-0.5 ${getDepthColor(depth - 1)}`}
            style={{ marginLeft: `${(visualDepth - 1) * 24 + 4}px` }}
          />
        )}

        <div
          className={`flex gap-3 ${depth > 0 ? 'mt-2' : ''}`}
          style={{ marginLeft: `${visualDepth * 24}px` }}
        >
          {/* Collapse/Expand button for messages with children */}
          {hasChildren && (
            <button
              onClick={() => toggleCollapse(message._id)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-2"
              title={isCollapsed ? 'Expandir respuestas' : 'Colapsar respuestas'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {!hasChildren && depth > 0 && <div className="w-5" />}

          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className={`${isRoot ? 'w-10 h-10' : 'w-8 h-8'} rounded-full flex items-center justify-center text-white font-semibold ${isRoot ? 'text-sm' : 'text-xs'} ${
              message.userId._id === 'deleted'
                ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                : isRoot
                  ? 'bg-gradient-to-br from-blue-400 to-purple-500'
                  : 'bg-gradient-to-br from-green-400 to-blue-500'
            }`}>
              {message.userId.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-semibold ${
                message.userId._id === 'deleted'
                  ? 'text-gray-500 dark:text-gray-400 italic'
                  : 'text-gray-800 dark:text-gray-100'
              }`}>
                {message.userId.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(message.createdAt).toLocaleString('es-MX', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {message.isEdited && (
                <span className="text-xs text-gray-400 italic">(editado)</span>
              )}
              {(message.threadDepth || 0) > 0 && (
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                  Nivel {message.threadDepth}
                </span>
              )}
              {hasChildren && isCollapsed && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                  {children.length} {children.length === 1 ? 'respuesta' : 'respuestas'}
                </span>
              )}
            </div>

            {editingId === message._id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  autoFocus
                />
                <button
                  onClick={() => handleEditReply(message._id)}
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
                <div className={`${isRoot ? 'bg-gray-50 dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-700'} rounded-lg px-3 py-2`}>
                  <div className="text-sm text-gray-800 dark:text-gray-100">
                    <MessageContent
                      content={message.content}
                      priorityMentions={message.priorityMentions}
                    />
                  </div>

                  {/* Actions */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    {/* Reply button - always visible on hover */}
                    <button
                      onClick={() => setReplyingTo(message)}
                      className="p-1 bg-white/80 dark:bg-gray-800/80 rounded hover:bg-white dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400"
                      title="Responder a este mensaje"
                    >
                      <Reply size={12} />
                    </button>
                    {isOwn(message) && !message.isDeleted && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(message._id);
                            setEditContent(message.content);
                          }}
                          className="p-1 bg-white/80 dark:bg-gray-800/80 rounded hover:bg-white dark:hover:bg-gray-800"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteReply(message._id)}
                          className="p-1 bg-white/80 dark:bg-gray-800/80 rounded hover:bg-white dark:hover:bg-gray-800"
                          title="Eliminar"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {Object.keys(reactionSummary).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(reactionSummary).map(([emoji, data]) => {
                      const hasReacted = message.reactions.some(
                        (r) => r.userId._id === session?.user.id && r.emoji === emoji
                      );

                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message._id, emoji)}
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
                <div className="flex gap-1 mt-1 items-center">
                  {['👍', '❤️', '😄', '🎉'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(message._id, emoji)}
                      className="text-sm opacity-50 hover:opacity-100 transition"
                      title={`Reaccionar con ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <EmojiPicker onEmojiSelect={(emoji) => handleReaction(message._id, emoji)} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render children recursively */}
        {hasChildren && !isCollapsed && (
          <div className="mt-2">
            {children.map(child => renderMessage(child, tree, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Find root message and build tree
  const messageTree = buildMessageTree(allMessages);
  const rootMessage = allMessages.find(m => !m.parentMessageId) || parentMessage;
  const totalReplies = allMessages.filter(m => m.parentMessageId).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Hilo de conversación
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalReplies} {totalReplies === 1 ? 'respuesta' : 'respuestas'}
            </span>
            {allMessages.some(m => (m.threadDepth || 0) > 1) && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                Hilo anidado
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thread content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <MessageSquare className="animate-pulse mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-gray-500 dark:text-gray-400">Cargando hilo...</p>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400">
                Aún no hay respuestas. Sé el primero en responder.
              </p>
            </div>
          ) : (
            <>
              {/* Render message tree starting from root */}
              {renderMessage(rootMessage, messageTree, 0)}
            </>
          )}
          <div ref={repliesEndRef} />
        </div>

        {/* Replying to indicator */}
        {replyingTo && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-gray-600 dark:text-gray-400">Respondiendo a</span>
              <span className="font-medium text-gray-800 dark:text-gray-100">
                {replyingTo.userId.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
                "{replyingTo.content.substring(0, 50)}{replyingTo.content.length > 50 ? '...' : ''}"
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder={replyingTo
                ? `Respondiendo a ${replyingTo.userId.name}...`
                : "Escribe una respuesta... (@ para mencionar, Markdown soportado)"
              }
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <MarkdownHelp />
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
            <span className="font-medium">Enter</span> para enviar •
            <span className="font-medium ml-1">Hover</span> sobre un mensaje y click en <Reply size={10} className="inline" /> para responder directamente
          </p>
        </div>
      </div>
    </div>
  );
}

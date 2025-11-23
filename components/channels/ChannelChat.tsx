'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Send,
  Smile,
  MoreVertical,
  Edit2,
  Trash2,
  MessageSquare,
  Check,
  X,
  CornerDownRight,
  Search,
  Pin,
  PinOff,
  Zap
} from 'lucide-react';
import ThreadView from './ThreadView';
import MessageContent from './MessageContent';
import { isSlashCommand, parseSlashCommand, SLASH_COMMANDS } from '@/lib/slashCommands';
import StatusCommand from '../slashCommands/StatusCommand';
import PollCommand from '../slashCommands/PollCommand';
import QuickPriorityCommand from '../slashCommands/QuickPriorityCommand';
import BlockersCommand from '../slashCommands/BlockersCommand';
import RisksCommand from '../slashCommands/RisksCommand';

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
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: {
    _id: string;
    name: string;
  };
  commandType?: string;
  commandData?: any;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

interface ChannelChatProps {
  projectId: string;
}

export default function ChannelChat({ projectId }: ChannelChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [openThread, setOpenThread] = useState<Message | null>(null);
  const [users, setUsers] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCommand, setActiveCommand] = useState<{
    type: string;
    data?: any;
  } | null>(null);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadPinnedMessages();
    loadUsers();
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Detectar comandos slash
    if (newMessage.startsWith('/') && !newMessage.includes(' ')) {
      setShowCommandSuggestions(true);
      setShowUserSuggestions(false);
    } else if (newMessage.startsWith('/')) {
      setShowCommandSuggestions(false);
    } else {
      setShowCommandSuggestions(false);
    }

    // Detectar @ para autocompletado
    if (!newMessage.startsWith('/')) {
      const lastAtIndex = newMessage.lastIndexOf('@');
      if (lastAtIndex !== -1 && lastAtIndex === newMessage.length - 1) {
        setShowUserSuggestions(true);
        setMentionSearch('');
      } else if (lastAtIndex !== -1) {
        const searchText = newMessage.substring(lastAtIndex + 1);
        if (searchText.includes(' ')) {
          setShowUserSuggestions(false);
        } else {
          setMentionSearch(searchText);
          setShowUserSuggestions(true);
        }
      } else {
        setShowUserSuggestions(false);
      }
    }
  }, [newMessage]);

  // Debouncing: esperar 500ms después de que el usuario deje de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cuando cambia la búsqueda debounced, recargar mensajes
  useEffect(() => {
    loadMessages();
  }, [debouncedSearchQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const searchParam = debouncedSearchQuery.trim() ? `&search=${encodeURIComponent(debouncedSearchQuery.trim())}` : '';
      const response = await fetch(`/api/projects/${projectId}/messages?limit=50${searchParam}`);

      if (!response.ok) {
        throw new Error('Error al cargar mensajes');
      }

      const data = await response.json();
      setMessages((data.messages || []).reverse()); // Invertir para mostrar más recientes abajo
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPinnedMessages = async () => {
    try {
      // Fetch pinned messages separately
      const response = await fetch(`/api/projects/${projectId}/messages/pinned`);
      if (response.ok) {
        const data = await response.json();
        setPinnedMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error loading pinned messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    // Detectar si es un comando slash
    if (isSlashCommand(newMessage)) {
      handleSlashCommand(newMessage);
      return;
    }

    try {
      setSending(true);

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.trim(),
          mentions: [] // TODO: detectar menciones @usuario
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar mensaje');
      }

      const message = await response.json();
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleSlashCommand = async (commandText: string) => {
    const parsed = parseSlashCommand(commandText);
    if (!parsed) return;

    switch (parsed.command) {
      case 'status':
        setActiveCommand({ type: 'status' });
        setNewMessage('');
        break;

      case 'blockers':
        setActiveCommand({ type: 'blockers' });
        setNewMessage('');
        break;

      case 'risks':
        setActiveCommand({ type: 'risks' });
        setNewMessage('');
        break;

      case 'poll':
        if (parsed.args.length < 3) {
          alert('Uso: /poll "¿Pregunta?" "Opción 1" "Opción 2" ...');
          return;
        }
        const question = parsed.args[0];
        const options = parsed.args.slice(1);

        // Crear poll persistente en la base de datos
        try {
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/poll ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              commandType: 'poll',
              commandData: {
                question,
                options: options.map((opt: string) => ({ text: opt, votes: [] })),
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            loadMessages(); // Recargar mensajes para mostrar el poll
          }
        } catch (error) {
          console.error('Error creating poll:', error);
          alert('Error al crear la encuesta');
        }
        setNewMessage('');
        break;

      case 'quick-priority':
        if (parsed.args.length < 1) {
          alert('Uso: /quick-priority "Título de la prioridad"');
          return;
        }
        const title = parsed.args[0];
        setActiveCommand({ type: 'quick-priority', data: { title } });
        setNewMessage('');
        break;

      case 'help':
        setActiveCommand({ type: 'help' });
        setNewMessage('');
        break;

      default:
        alert(`Comando desconocido: ${parsed.command}\nEscribe /help para ver comandos disponibles`);
        return;
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/messages/${messageId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editContent.trim() })
        }
      );

      if (!response.ok) {
        throw new Error('Error al editar mensaje');
      }

      const updatedMessage = await response.json();
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updatedMessage : m))
      );
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      console.error('Error editing message:', err);
      alert('Error al editar mensaje');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('¿Estás seguro de eliminar este mensaje?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/messages/${messageId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Error al eliminar mensaje');
      }

      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Error al eliminar mensaje');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find((m) => m._id === messageId);
      const hasReacted = message?.reactions.some(
        (r) => r.userId._id === session?.user.id && r.emoji === emoji
      );

      if (hasReacted) {
        // Eliminar reacción
        const response = await fetch(
          `/api/projects/${projectId}/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          const updatedMessage = await response.json();
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? updatedMessage : m))
          );
        }
      } else {
        // Agregar reacción
        const response = await fetch(
          `/api/projects/${projectId}/messages/${messageId}/reactions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji })
          }
        );

        if (response.ok) {
          const updatedMessage = await response.json();
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? updatedMessage : m))
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

  const handlePinMessage = async (messageId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/messages/${messageId}/pin`,
        { method: 'PUT' }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al anclar mensaje');
        return;
      }

      // Reload pinned messages
      await loadPinnedMessages();

      // Update message in regular list if present
      const updatedMessage = await response.json();
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updatedMessage : m))
      );
    } catch (err) {
      console.error('Error pinning message:', err);
      alert('Error al anclar mensaje');
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/messages/${messageId}/pin`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al desanclar mensaje');
        return;
      }

      // Reload pinned messages
      await loadPinnedMessages();

      // Update message in regular list if present
      const updatedMessage = await response.json();
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updatedMessage : m))
      );
    } catch (err) {
      console.error('Error unpinning message:', err);
      alert('Error al desanclar mensaje');
    }
  };

  const handleMentionSelect = (user: { name: string }) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    const beforeAt = newMessage.substring(0, lastAtIndex);
    setNewMessage(`${beforeAt}@${user.name} `);
    setShowUserSuggestions(false);
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MessageSquare className="animate-pulse mx-auto mb-3 text-gray-400" size={32} />
          <p className="text-gray-500 dark:text-gray-400">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Search Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar mensajes... (contenido, usuario)"
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {debouncedSearchQuery && (
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'} encontrados
          </div>
        )}
      </div>

      {/* Pinned Messages Section */}
      {pinnedMessages.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/10">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Pin size={16} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Mensajes Anclados ({pinnedMessages.length}/5)
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pinnedMessages.map((message) => (
                <div
                  key={message._id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {message.userId.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
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
                    </div>
                    <button
                      onClick={() => handleUnpinMessage(message._id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex-shrink-0"
                      title="Desanclar"
                    >
                      <PinOff size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 ml-8">
                    <MessageContent
                      content={message.content}
                      priorityMentions={message.priorityMentions}
                    />
                  </div>
                  {message.pinnedBy && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-8 mt-1">
                      Anclado por {message.pinnedBy.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {debouncedSearchQuery && messages.length === 0 ? (
          <div className="text-center py-12">
            <Search className="mx-auto mb-3 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              No se encontraron mensajes
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Intenta con otro término de búsqueda
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto mb-3 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Inicia la conversación
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Sé el primero en enviar un mensaje en este canal
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.userId._id === session?.user.id;
            const reactionSummary = getReactionSummary(message.reactions);

            return (
              <div
                key={message._id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {message.userId.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-xl ${isOwn ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {message.userId.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(message.createdAt).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {message.isEdited && (
                      <span className="text-xs text-gray-400 italic">(editado)</span>
                    )}
                  </div>

                  {editingId === message._id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditMessage(message._id)}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditContent('');
                        }}
                        className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : message.commandType === 'poll' && message.commandData ? (
                    /* Render Poll Command */
                    <PollCommand
                      projectId={projectId}
                      messageId={message._id}
                      question={message.commandData.question}
                      options={message.commandData.options || []}
                      createdBy={message.commandData.createdBy}
                      closed={message.commandData.closed || false}
                      onClose={() => {}}
                      onUpdate={loadMessages}
                    />
                  ) : (
                    <div
                      className={`relative group rounded-lg px-4 py-2 ${
                        isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      <div className="text-sm">
                        <MessageContent
                          content={message.content}
                          priorityMentions={message.priorityMentions}
                        />
                      </div>

                      {/* Actions Menu */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                          <div className="flex gap-1">
                            {message.isPinned ? (
                              <button
                                onClick={() => handleUnpinMessage(message._id)}
                                className="p-1 bg-white/20 rounded hover:bg-white/30"
                                title="Desanclar mensaje"
                              >
                                <PinOff size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePinMessage(message._id)}
                                className="p-1 bg-white/20 rounded hover:bg-white/30"
                                title="Anclar mensaje"
                              >
                                <Pin size={14} />
                              </button>
                            )}
                            {isOwn && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(message._id);
                                    setEditContent(message.content);
                                  }}
                                  className="p-1 bg-white/20 rounded hover:bg-white/30"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(message._id)}
                                  className="p-1 bg-white/20 rounded hover:bg-white/30"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                            className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
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
                        onClick={() => handleReaction(message._id, emoji)}
                        className="text-lg opacity-50 hover:opacity-100 transition"
                        title={`Reaccionar con ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Reply Button */}
                  {message.replyCount > 0 && (
                    <button
                      onClick={() => setOpenThread(message)}
                      className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <CornerDownRight size={14} />
                      {message.replyCount} {message.replyCount === 1 ? 'respuesta' : 'respuestas'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Active Command Display */}
      {activeCommand && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {activeCommand.type === 'status' && (
            <StatusCommand
              projectId={projectId}
              onClose={() => setActiveCommand(null)}
            />
          )}
          {activeCommand.type === 'blockers' && (
            <BlockersCommand
              projectId={projectId}
              onClose={() => setActiveCommand(null)}
            />
          )}
          {activeCommand.type === 'risks' && (
            <RisksCommand
              projectId={projectId}
              onClose={() => setActiveCommand(null)}
            />
          )}
          {activeCommand.type === 'poll' && activeCommand.data && (
            <PollCommand
              projectId={projectId}
              question={activeCommand.data.question}
              options={activeCommand.data.options}
              onClose={() => setActiveCommand(null)}
            />
          )}
          {activeCommand.type === 'quick-priority' && activeCommand.data && (
            <QuickPriorityCommand
              projectId={projectId}
              initialTitle={activeCommand.data.title}
              onClose={() => setActiveCommand(null)}
              onSuccess={() => {
                loadMessages();
                setActiveCommand(null);
              }}
            />
          )}
          {activeCommand.type === 'help' && (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-gray-300 dark:border-gray-700 p-6 my-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <Zap className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Comandos Disponibles</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Escribe / para ver comandos</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveCommand(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                {SLASH_COMMANDS.map(cmd => (
                  <div key={cmd.name} className="bg-white dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-mono">
                        /{cmd.name}
                      </code>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                        {cmd.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{cmd.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{cmd.usage}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {/* Command Suggestions */}
        {showCommandSuggestions && (
          <div className="mb-2 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                <Zap size={14} />
                Comandos Disponibles
              </div>
            </div>
            {SLASH_COMMANDS
              .filter(cmd => cmd.name.startsWith(newMessage.substring(1).toLowerCase()))
              .map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => {
                    setNewMessage(`/${cmd.name} `);
                    setShowCommandSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <code className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-sm font-mono font-bold">
                      /{cmd.name}
                    </code>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{cmd.category}</span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{cmd.description}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{cmd.usage}</div>
                </button>
              ))}
          </div>
        )}

        {/* User Suggestions */}
        {showUserSuggestions && filteredUsers.length > 0 && (
          <div className="mb-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredUsers.slice(0, 5).map((user) => (
              <button
                key={user._id}
                onClick={() => handleMentionSelect(user)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {user.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Escribe un mensaje... (@ para mencionar, / para comandos)"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Send size={18} />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>

      {/* Thread View Modal */}
      {openThread && (
        <ThreadView
          projectId={projectId}
          parentMessage={openThread}
          onClose={() => setOpenThread(null)}
        />
      )}
    </div>
  );
}

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
  Zap,
  Paperclip,
  Flower2,
  Ship,
  PlayCircle,
  Target
} from 'lucide-react';
import ThreadView from './ThreadView';
import MessageContent from './MessageContent';
import ChannelSelector from '../ChannelSelector';
import EmojiPicker from './EmojiPicker';
import MarkdownHelp from './MarkdownHelp';
import { isSlashCommand, parseSlashCommand, SLASH_COMMANDS } from '@/lib/slashCommands';
import { getPusherClient } from '@/lib/pusher-client';
import type Pusher from 'pusher-js';
import type { PresenceChannel } from 'pusher-js';
import StatusCommand from '../slashCommands/StatusCommand';
import PollCommand from '../slashCommands/PollCommand';
import BrainstormCommand from '../slashCommands/BrainstormCommand';
import DotVotingCommand from '../slashCommands/DotVotingCommand';
import BlindVoteCommand from '../slashCommands/BlindVoteCommand';
import RetroCommand from '../slashCommands/RetroCommand';
import NPSCommand from '../slashCommands/NPSCommand';
import DecisionMatrixCommand from '../slashCommands/DecisionMatrixCommand';
import MindMapCommand from '../slashCommands/MindMapCommand';
import QuickPriorityCommand from '../slashCommands/QuickPriorityCommand';
import BlockersCommand from '../slashCommands/BlockersCommand';
import RisksCommand from '../slashCommands/RisksCommand';
import SummaryCommand from '../slashCommands/SummaryCommand';
import ProgressCommand from '../slashCommands/ProgressCommand';
import TeamLoadCommand from '../slashCommands/TeamLoadCommand';
import BurndownCommand from '../slashCommands/BurndownCommand';
import VelocityCommand from '../slashCommands/VelocityCommand';
import SearchCommand from '../slashCommands/SearchCommand';
import PrioritiesCommand from '../slashCommands/PrioritiesCommand';
import RecentCommand from '../slashCommands/RecentCommand';
import StandupCommand from '../slashCommands/StandupCommand';
import CelebrateCommand from '../slashCommands/CelebrateCommand';
import AiSummaryCommand from '../slashCommands/AiSummaryCommand';
import MyStatsCommand from '../slashCommands/MyStatsCommand';
import DecisionCommand from '../slashCommands/DecisionCommand';
import ScheduleCommand from '../slashCommands/ScheduleCommand';
import MentionStatsCommand from '../slashCommands/MentionStatsCommand';
import QuestionCommand from '../slashCommands/QuestionCommand';
import ExportCommand from '../slashCommands/ExportCommand';
import EstimationPokerCommand from '../slashCommands/EstimationPokerCommand';
import RetrospectiveCommand from '../slashCommands/RetrospectiveCommand';
import IncidentCommand from '../slashCommands/IncidentCommand';
import VoteCommand from '../slashCommands/VoteCommand';
import FistOfFiveCommand from '../slashCommands/FistOfFiveCommand';
import ChecklistCommand from '../slashCommands/ChecklistCommand';
import TimerCommand from '../slashCommands/TimerCommand';
import WheelCommand from '../slashCommands/WheelCommand';
import MoodCommand from '../slashCommands/MoodCommand';
import ProsConsCommand from '../slashCommands/ProsConsCommand';
import RankingCommand from '../slashCommands/RankingCommand';
import WebhookMessageCard from '../slashCommands/WebhookMessageCard';
import FileUpload from '../FileUpload';
import AttachmentCard from '../AttachmentCard';

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

interface Attachment {
  _id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
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
  attachments?: Attachment[];
}

interface ChannelChatProps {
  projectId: string;
}

export default function ChannelChat({ projectId }: ChannelChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [openThread, setOpenThread] = useState<Message | null>(null);
  const [users, setUsers] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [userGroups, setUserGroups] = useState<Array<{ _id: string; name: string; tag: string; color: string; members: any[] }>>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedChannelName, setSelectedChannelName] = useState<string>('');
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCommand, setActiveCommand] = useState<{
    type: string;
    data?: any;
    args?: string[];
  } | null>(null);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Pusher states
  const [pusherChannel, setPusherChannel] = useState<PresenceChannel | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: string; info: { name: string; email: string } }>>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Infinite scroll states
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadUsers();
    loadUserGroups();
    // No cargar mensajes aquí, esperar a que se seleccione un canal
  }, [projectId]);

  // Cargar mensajes cuando se selecciona un canal o cambia la búsqueda
  useEffect(() => {
    if (selectedChannelId) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannelId, debouncedSearchQuery]);

  useEffect(() => {
    if (initialLoad) {
      scrollToBottom();
      // Marcar como cargado después del primer scroll
      setTimeout(() => setInitialLoad(false), 100);
    }
  }, [messages, initialLoad]);

  // Listener de scroll para infinite scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Si el usuario hace scroll hasta arriba (con un threshold de 100px)
      if (container.scrollTop < 100 && hasMore && !loadingMore) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, nextCursor]);

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

    // Detectar @ para autocompletado (funciona en mensajes normales Y comandos slash)
    const lastAtIndex = newMessage.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === newMessage.length - 1) {
      setShowUserSuggestions(true);
      setMentionSearch('');
    } else if (lastAtIndex !== -1) {
      const searchText = newMessage.substring(lastAtIndex + 1);
      // Cerrar si hay espacio o comilla después del @ (significa que el usuario terminó de escribir el nombre)
      if (searchText.includes(' ') || searchText.includes('"')) {
        setShowUserSuggestions(false);
      } else {
        setMentionSearch(searchText);
        setShowUserSuggestions(true);
      }
    } else {
      setShowUserSuggestions(false);
    }
  }, [newMessage]);

  // Debouncing: esperar 500ms después de que el usuario deje de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cuando cambia la búsqueda debounced o el canal seleccionado, recargar mensajes
  useEffect(() => {
    if (selectedChannelId) {
      // Resetear estados de paginación
      setHasMore(true);
      setNextCursor(null);
      setInitialLoad(true);

      loadMessages();
      loadPinnedMessages();
    }
  }, [debouncedSearchQuery, selectedChannelId]);

  // Pusher: suscribirse al canal cuando se selecciona un channelId
  useEffect(() => {
    if (!selectedChannelId) return;

    const pusher = getPusherClient();
    const channelName = `presence-channel-${selectedChannelId}`;
    const channel = pusher.subscribe(channelName) as PresenceChannel;

    // Evento: nuevo mensaje
    channel.bind('new-message', (newMsg: Message) => {
      // Siempre agregar mensajes de webhook, o si no es del usuario actual
      const isWebhookMessage = newMsg.commandType === 'webhook-incoming';
      const isFromCurrentUser = newMsg.userId._id === session?.user.id;

      if (isWebhookMessage || !isFromCurrentUser) {
        setMessages((prev) => {
          // Evitar duplicados
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        // Solo hacer scroll si el usuario está cerca del fondo
        scrollToBottomIfNearBottom();
      }
    });

    // Evento: mensaje actualizado (widgets colaborativos)
    channel.bind('message-updated', (updatedMsg: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    });

    // Evento: usuario escribiendo
    channel.bind('client-typing', (data: { userId: string; userName: string }) => {
      if (data.userId !== session?.user.id) {
        setTypingUsers((prev) => {
          if (prev.includes(data.userName)) return prev;
          return [...prev, data.userName];
        });

        // Auto-remover después de 3 segundos
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
        }, 3000);
      }
    });

    // Evento: usuario dejó de escribir
    channel.bind('client-stop-typing', (data: { userId: string; userName: string }) => {
      setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
    });

    // Presencia: suscripción exitosa
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const membersList: Array<{ id: string; info: { name: string; email: string } }> = [];
      members.each((member: any) => {
        membersList.push({
          id: member.id,
          info: member.info
        });
      });
      setOnlineUsers(membersList);
    });

    // Presencia: miembro agregado
    channel.bind('pusher:member_added', (member: any) => {
      setOnlineUsers((prev) => {
        if (prev.some((m) => m.id === member.id)) return prev;
        return [...prev, { id: member.id, info: member.info }];
      });
    });

    // Presencia: miembro removido
    channel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers((prev) => prev.filter((m) => m.id !== member.id));
    });

    setPusherChannel(channel);

    // Cleanup
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      setPusherChannel(null);
      setTypingUsers([]);
      setOnlineUsers([]);
    };
  }, [selectedChannelId, session?.user.id, session?.user.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Verificar si el usuario está cerca del fondo del scroll
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const threshold = 200; // píxeles desde el fondo
    const position = container.scrollHeight - container.scrollTop - container.clientHeight;
    return position < threshold;
  };

  // Hacer scroll solo si el usuario está cerca del fondo
  const scrollToBottomIfNearBottom = () => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  };

  const loadUsers = async () => {
    try {
      // includeAll=true permite incluir a todos los usuarios (incluyendo Francisco Puente) para menciones y preguntas
      const response = await fetch('/api/users?includeAll=true');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadUserGroups = async () => {
    try {
      const response = await fetch('/api/user-groups');
      if (response.ok) {
        const data = await response.json();
        setUserGroups(data || []);
      }
    } catch (err) {
      console.error('Error loading user groups:', err);
    }
  };

  const loadMessages = async () => {
    if (!selectedChannelId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const searchParam = debouncedSearchQuery.trim() ? `&search=${encodeURIComponent(debouncedSearchQuery.trim())}` : '';
      const response = await fetch(`/api/projects/${projectId}/messages?limit=50&channelId=${selectedChannelId}${searchParam}`);

      if (!response.ok) {
        throw new Error('Error al cargar mensajes');
      }

      const data = await response.json();
      const newMessages = (data.messages || []).reverse(); // Invertir para mostrar más recientes abajo

      // Deduplicar mensajes por _id
      const messageMap = new Map();
      newMessages.forEach((msg: Message) => {
        messageMap.set(msg._id, msg);
      });

      setMessages(Array.from(messageMap.values()));
      setHasMore(data.pagination?.hasMore || false);
      setNextCursor(data.pagination?.nextCursor || null);
      setInitialLoad(false);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedChannelId || loadingMore || !hasMore || !nextCursor) {
      return;
    }

    try {
      setLoadingMore(true);

      // Guardar altura del scroll antes de cargar
      const container = messagesContainerRef.current;
      const previousScrollHeight = container?.scrollHeight || 0;

      const searchParam = debouncedSearchQuery.trim() ? `&search=${encodeURIComponent(debouncedSearchQuery.trim())}` : '';
      const response = await fetch(`/api/projects/${projectId}/messages?limit=50&cursor=${nextCursor}&channelId=${selectedChannelId}${searchParam}`);

      if (!response.ok) {
        throw new Error('Error al cargar más mensajes');
      }

      const data = await response.json();
      const olderMessages = (data.messages || []).reverse(); // Invertir para mostrar más recientes abajo

      if (olderMessages.length > 0) {
        setMessages((prev) => {
          // Agregar mensajes antiguos al inicio
          const messageMap = new Map();

          // Primero agregar los nuevos mensajes antiguos
          olderMessages.forEach((msg: Message) => {
            messageMap.set(msg._id, msg);
          });

          // Luego agregar los existentes (esto evita duplicados)
          prev.forEach((msg: Message) => {
            messageMap.set(msg._id, msg);
          });

          return Array.from(messageMap.values());
        });

        setNextCursor(data.pagination?.nextCursor || null);
        setHasMore(data.pagination?.hasMore || false);

        // Restaurar posición del scroll
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - previousScrollHeight;
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadPinnedMessages = async () => {
    if (!selectedChannelId) {
      return;
    }

    try {
      // Fetch pinned messages separately
      const response = await fetch(`/api/projects/${projectId}/messages/pinned?channelId=${selectedChannelId}`);
      if (response.ok) {
        const data = await response.json();
        setPinnedMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error loading pinned messages:', err);
    }
  };

  // Emitir evento de typing
  const handleTyping = () => {
    if (!pusherChannel || !session?.user) return;

    // Emitir evento client-typing
    pusherChannel.trigger('client-typing', {
      userId: session.user.id,
      userName: session.user.name
    });

    // Cancelar timeout anterior si existe
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emitir stop-typing después de 1 segundo sin escribir
    typingTimeoutRef.current = setTimeout(() => {
      if (pusherChannel) {
        pusherChannel.trigger('client-stop-typing', {
          userId: session.user.id,
          userName: session.user.name
        });
      }
    }, 1000);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    // Emitir stop-typing al enviar mensaje
    if (pusherChannel && session?.user) {
      pusherChannel.trigger('client-stop-typing', {
        userId: session.user.id,
        userName: session.user.name
      });
    }

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
          channelId: selectedChannelId,
          mentions: [] // TODO: detectar menciones @usuario
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar mensaje');
      }

      const message = await response.json();
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      // Siempre hacer scroll cuando el usuario envía su propio mensaje
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!selectedChannelId) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    // Buscar imágenes en el clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevenir pegar texto de la imagen

        const blob = item.getAsFile();
        if (!blob) continue;

        // Crear nombre de archivo con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = blob.type.split('/')[1] || 'png';
        const fileName = `pasted-image-${timestamp}.${extension}`;

        // Convertir blob a File
        const file = new File([blob], fileName, { type: blob.type });

        // Validar tamaño (50MB)
        if (file.size > 50 * 1024 * 1024) {
          alert('La imagen excede el tamaño máximo permitido (50MB)');
          return;
        }

        try {
          setSending(true);

          // Subir archivo
          const formData = new FormData();
          formData.append('file', file);
          formData.append('channelId', selectedChannelId);

          const uploadResponse = await fetch(`/api/projects/${projectId}/attachments`, {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) {
            throw new Error('Error al subir imagen');
          }

          const { attachment } = await uploadResponse.json();

          // Crear mensaje con el attachment
          const messageResponse = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `📸 Pegó una imagen: **${attachment.originalName}**`,
              channelId: selectedChannelId,
              attachments: [attachment._id]
            })
          });

          if (messageResponse.ok) {
            const message = await messageResponse.json();
            setMessages((prev) => [...prev, message]);
            // Hacer scroll cuando el usuario pega una imagen
            scrollToBottom();
          } else {
            loadMessages();
          }
        } catch (error) {
          console.error('Error uploading pasted image:', error);
          alert('Error al subir la imagen pegada');
        } finally {
          setSending(false);
        }

        break; // Solo procesar la primera imagen
      }
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

      case 'summary':
        const period = parsed.args[0] as '24h' | 'week' | 'month' | undefined;
        setActiveCommand({ type: 'summary', data: { period: period || 'week' } });
        setNewMessage('');
        break;

      case 'progress':
        setActiveCommand({ type: 'progress' });
        setNewMessage('');
        break;

      case 'team-load':
        setActiveCommand({ type: 'team-load' });
        setNewMessage('');
        break;

      case 'burndown':
        setActiveCommand({ type: 'burndown' });
        setNewMessage('');
        break;

      case 'velocity':
        setActiveCommand({ type: 'velocity' });
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

      case 'celebrate':
        if (parsed.args.length < 2) {
          alert('Uso: /celebrate @usuario "descripción del logro"');
          return;
        }
        if (sending) return; // Evitar duplicados
        const userName = parsed.args[0].replace('@', '');
        const achievement = parsed.args[1];

        // Crear celebración persistente en la base de datos
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/celebrate @${userName} "${achievement}"`,
              channelId: selectedChannelId,
              commandType: 'celebrate',
              commandData: {
                userName,
                achievement,
                createdBy: session?.user?.name,
                createdAt: new Date().toISOString()
              }
            })
          });

          if (response.ok) {
            const message = await response.json();
            // Agregar mensaje directamente en lugar de recargar todos
            setMessages((prev) => [...prev, message]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating celebration:', error);
          alert('Error al crear la celebración');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'poll':
        if (parsed.args.length < 3) {
          alert('Uso: /poll "¿Pregunta?" "Opción 1" "Opción 2" ...');
          return;
        }
        if (sending) return; // Evitar duplicados
        const question = parsed.args[0];
        const options = parsed.args.slice(1);

        // Crear poll persistente en la base de datos
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/poll ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
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
            const pollMessage = await response.json();
            // Agregar mensaje directamente en lugar de recargar todos
            setMessages((prev) => [...prev, pollMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating poll:', error);
          alert('Error al crear la encuesta');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'brainstorm':
        if (parsed.args.length < 1) {
          alert('Uso: /brainstorm "¿Tema o pregunta?"');
          return;
        }
        if (sending) return; // Evitar duplicados
        const brainstormTopic = parsed.args[0];

        // Crear brainstorm persistente en la base de datos
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/brainstorm ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'brainstorm',
              commandData: {
                topic: brainstormTopic,
                ideas: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const brainstormMessage = await response.json();
            // Agregar mensaje directamente en lugar de recargar todos
            setMessages((prev) => [...prev, brainstormMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating brainstorm:', error);
          alert('Error al crear la sesión de brainstorming');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'dot-voting':
        if (parsed.args.length < 4) {
          alert('Uso: /dot-voting "Pregunta" 5 "Opción 1" "Opción 2" ...');
          return;
        }
        if (sending) return;
        const dotQuestion = parsed.args[0];
        const totalDotsStr = parsed.args[1];
        const totalDots = parseInt(totalDotsStr, 10);

        if (isNaN(totalDots) || totalDots <= 0) {
          alert('El segundo argumento debe ser un número positivo de puntos por persona');
          return;
        }

        const dotOptions = parsed.args.slice(2);
        if (dotOptions.length < 2) {
          alert('Debes proporcionar al menos 2 opciones');
          return;
        }

        // Crear dot-voting persistente en la base de datos
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/dot-voting ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'dot-voting',
              commandData: {
                question: dotQuestion,
                totalDotsPerUser: totalDots,
                options: dotOptions.map((opt: string) => ({ text: opt, dots: [] })),
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const dotVotingMessage = await response.json();
            setMessages((prev) => [...prev, dotVotingMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating dot-voting:', error);
          alert('Error al crear la votación');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'blind-vote':
        if (parsed.args.length < 3) {
          alert('Uso: /blind-vote "Pregunta" "Opción 1" "Opción 2" ...');
          return;
        }
        if (sending) return;
        const blindQuestion = parsed.args[0];
        const blindOptions = parsed.args.slice(1);

        if (blindOptions.length < 2) {
          alert('Debes proporcionar al menos 2 opciones');
          return;
        }

        // Crear blind-vote persistente
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/blind-vote ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'blind-vote',
              commandData: {
                question: blindQuestion,
                options: blindOptions.map((opt: string) => ({ text: opt, votes: [] })),
                createdBy: session?.user?.id,
                revealed: false,
                closed: false
              }
            })
          });

          if (response.ok) {
            const blindVoteMessage = await response.json();
            setMessages((prev) => [...prev, blindVoteMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating blind-vote:', error);
          alert('Error al crear la votación ciega');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'rose-bud-thorn':
        if (parsed.args.length < 1) {
          alert('Uso: /rose-bud-thorn "Sprint o período"');
          return;
        }
        if (sending) return;
        const roseTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/rose-bud-thorn ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'rose-bud-thorn',
              commandData: {
                title: roseTitle,
                sections: [
                  { id: 'rose', title: 'Rosas (Positivo)', icon: '🌹', color: '#ec4899', items: [] },
                  { id: 'bud', title: 'Brotes (Potencial)', icon: '🌱', color: '#10b981', items: [] },
                  { id: 'thorn', title: 'Espinas (Problemas)', icon: '🌵', color: '#f59e0b', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const retroMessage = await response.json();
            setMessages((prev) => [...prev, retroMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating rose-bud-thorn:', error);
          alert('Error al crear retrospectiva');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'sailboat':
        if (parsed.args.length < 1) {
          alert('Uso: /sailboat "Sprint o período"');
          return;
        }
        if (sending) return;
        const sailTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/sailboat ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'sailboat',
              commandData: {
                title: sailTitle,
                sections: [
                  { id: 'wind', title: 'Viento (Impulsa)', icon: '💨', color: '#3b82f6', items: [] },
                  { id: 'anchor', title: 'Ancla (Frena)', icon: '⚓', color: '#64748b', items: [] },
                  { id: 'rocks', title: 'Rocas (Riesgos)', icon: '🪨', color: '#ef4444', items: [] },
                  { id: 'island', title: 'Isla (Meta)', icon: '🏝️', color: '#10b981', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const sailMessage = await response.json();
            setMessages((prev) => [...prev, sailMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating sailboat:', error);
          alert('Error al crear retrospectiva');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'start-stop-continue':
        if (parsed.args.length < 1) {
          alert('Uso: /start-stop-continue "Sprint o período"');
          return;
        }
        if (sending) return;
        const sscTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/start-stop-continue ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'start-stop-continue',
              commandData: {
                title: sscTitle,
                sections: [
                  { id: 'start', title: 'Empezar a hacer', icon: '▶️', color: '#10b981', items: [] },
                  { id: 'stop', title: 'Dejar de hacer', icon: '⏹️', color: '#ef4444', items: [] },
                  { id: 'continue', title: 'Continuar haciendo', icon: '🔄', color: '#3b82f6', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const sscMessage = await response.json();
            setMessages((prev) => [...prev, sscMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating start-stop-continue:', error);
          alert('Error al crear retrospectiva');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'swot':
        if (parsed.args.length < 1) {
          alert('Uso: /swot "Título del análisis"');
          return;
        }
        if (sending) return;
        const swotTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/swot ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'swot',
              commandData: {
                title: swotTitle,
                sections: [
                  { id: 'strengths', title: 'Fortalezas', icon: '💪', color: '#10b981', items: [] },
                  { id: 'weaknesses', title: 'Debilidades', icon: '⚠️', color: '#f59e0b', items: [] },
                  { id: 'opportunities', title: 'Oportunidades', icon: '🎯', color: '#3b82f6', items: [] },
                  { id: 'threats', title: 'Amenazas', icon: '⚡', color: '#ef4444', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const swotMessage = await response.json();
            setMessages((prev) => [...prev, swotMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating swot:', error);
          alert('Error al crear análisis SWOT');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'nps':
        if (parsed.args.length < 1) {
          alert('Uso: /nps "¿Pregunta de satisfacción?"');
          return;
        }
        if (sending) return;
        const npsQuestion = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/nps ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'nps',
              commandData: {
                question: npsQuestion,
                votes: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const npsMessage = await response.json();
            setMessages((prev) => [...prev, npsMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating nps:', error);
          alert('Error al crear encuesta NPS');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'six-hats':
        if (parsed.args.length < 1) {
          alert('Uso: /six-hats "Tema a analizar"');
          return;
        }
        if (sending) return;
        const sixHatsTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/six-hats ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'six-hats',
              commandData: {
                title: sixHatsTitle,
                sections: [
                  { id: 'white', title: 'Blanco (Hechos)', icon: '⚪', color: '#e5e7eb', items: [] },
                  { id: 'red', title: 'Rojo (Emociones)', icon: '🔴', color: '#ef4444', items: [] },
                  { id: 'black', title: 'Negro (Crítica)', icon: '⚫', color: '#1f2937', items: [] },
                  { id: 'yellow', title: 'Amarillo (Beneficios)', icon: '🟡', color: '#eab308', items: [] },
                  { id: 'green', title: 'Verde (Creatividad)', icon: '🟢', color: '#22c55e', items: [] },
                  { id: 'blue', title: 'Azul (Control)', icon: '🔵', color: '#3b82f6', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const sixHatsMessage = await response.json();
            setMessages((prev) => [...prev, sixHatsMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating six-hats:', error);
          alert('Error al crear análisis de 6 sombreros');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'decision-matrix':
        if (parsed.args.length < 3) {
          alert('Uso: /decision-matrix "Decisión" "Criterio 1" "Criterio 2" ...');
          return;
        }
        if (sending) return;
        const matrixTitle = parsed.args[0];
        const matrixCriteria = parsed.args.slice(1);

        if (matrixCriteria.length < 2) {
          alert('Debes proporcionar al menos 2 criterios');
          return;
        }

        // Pedir opciones al usuario
        const optionsInput = prompt('Ingresa las opciones separadas por comas (ej: Opción A, Opción B, Opción C):');
        if (!optionsInput) return;

        const matrixOptions = optionsInput.split(',').map(o => o.trim()).filter(o => o);
        if (matrixOptions.length < 2) {
          alert('Debes proporcionar al menos 2 opciones');
          return;
        }

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/decision-matrix ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'decision-matrix',
              commandData: {
                title: matrixTitle,
                criteria: matrixCriteria,
                options: matrixOptions,
                cells: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const matrixMessage = await response.json();
            setMessages((prev) => [...prev, matrixMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating decision-matrix:', error);
          alert('Error al crear matriz de decisión');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'mind-map':
        if (parsed.args.length < 1) {
          alert('Uso: /mind-map "Tema central"');
          return;
        }
        if (sending) return;
        const mindMapTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/mind-map ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'mind-map',
              commandData: {
                title: mindMapTitle,
                nodes: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const mindMapMessage = await response.json();
            setMessages((prev) => [...prev, mindMapMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating mind-map:', error);
          alert('Error al crear mapa mental');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'crazy-8s':
        if (parsed.args.length < 1) {
          alert('Uso: /crazy-8s "Problema o reto"');
          return;
        }
        if (sending) return;
        const crazy8sTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/crazy-8s ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'crazy-8s',
              commandData: {
                title: crazy8sTitle,
                sections: [
                  { id: 'idea1', title: 'Idea 1', icon: '1️⃣', color: '#ef4444', items: [] },
                  { id: 'idea2', title: 'Idea 2', icon: '2️⃣', color: '#f59e0b', items: [] },
                  { id: 'idea3', title: 'Idea 3', icon: '3️⃣', color: '#eab308', items: [] },
                  { id: 'idea4', title: 'Idea 4', icon: '4️⃣', color: '#84cc16', items: [] },
                  { id: 'idea5', title: 'Idea 5', icon: '5️⃣', color: '#10b981', items: [] },
                  { id: 'idea6', title: 'Idea 6', icon: '6️⃣', color: '#06b6d4', items: [] },
                  { id: 'idea7', title: 'Idea 7', icon: '7️⃣', color: '#3b82f6', items: [] },
                  { id: 'idea8', title: 'Idea 8', icon: '8️⃣', color: '#8b5cf6', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const crazy8sMessage = await response.json();
            setMessages((prev) => [...prev, crazy8sMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating crazy-8s:', error);
          alert('Error al crear Crazy 8s');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'affinity-map':
        if (parsed.args.length < 1) {
          alert('Uso: /affinity-map "Tema"');
          return;
        }
        if (sending) return;
        const affinityTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/affinity-map ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'affinity-map',
              commandData: {
                title: affinityTitle,
                sections: [
                  { id: 'group-a', title: 'Grupo A', icon: '🅰️', color: '#3b82f6', items: [] },
                  { id: 'group-b', title: 'Grupo B', icon: '🅱️', color: '#10b981', items: [] },
                  { id: 'group-c', title: 'Grupo C', icon: '©️', color: '#f59e0b', items: [] },
                  { id: 'ungrouped', title: 'Sin Agrupar', icon: '📝', color: '#6b7280', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const affinityMessage = await response.json();
            setMessages((prev) => [...prev, affinityMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating affinity-map:', error);
          alert('Error al crear mapa de afinidad');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'estimation-poker':
        if (parsed.args.length < 1) {
          alert('Uso: /estimation-poker "¿Tarea o historia?"');
          return;
        }
        if (sending) return;
        const estimationStory = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/estimation-poker ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'estimation-poker',
              commandData: {
                topic: estimationStory,
                estimates: [],
                revealed: false,
                finalEstimate: null,
                closed: false,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const estimationMessage = await response.json();
            setMessages((prev) => [...prev, estimationMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating estimation poker:', error);
          alert('Error al crear la sesión de estimación');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'retrospective':
        if (parsed.args.length < 1) {
          alert('Uso: /retrospective "Sprint o período"');
          return;
        }
        if (sending) return;
        const retroTopic = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/retrospective ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'retrospective',
              commandData: {
                title: retroTopic,
                items: [],
                closed: false,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const retroMessage = await response.json();
            setMessages((prev) => [...prev, retroMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating retrospective:', error);
          alert('Error al crear la retrospectiva');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'incident':
        if (parsed.args.length < 2) {
          alert('Uso: /incident "Título" P0|P1|P2|P3|P4');
          return;
        }
        if (sending) return;
        const incidentTitle = parsed.args[0];
        const severity = (parsed.args[1] || 'P2').toUpperCase();

        if (!['P0', 'P1', 'P2', 'P3', 'P4'].includes(severity)) {
          alert('Severidad debe ser P0, P1, P2, P3 o P4');
          return;
        }

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/incident ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'incident',
              commandData: {
                title: incidentTitle,
                severity,
                commander: null,
                timeline: [],
                resolved: false,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const incidentMessage = await response.json();
            setMessages((prev) => [...prev, incidentMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating incident:', error);
          alert('Error al crear el incidente');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'vote-points':
        if (parsed.args.length < 2) {
          alert('Uso: /vote "Pregunta" 10 "Opción 1" "Opción 2" ...');
          return;
        }
        if (sending) return;
        const voteQuestion = parsed.args[0];
        const totalPoints = parseInt(parsed.args[1], 10);
        const voteOptions = parsed.args.slice(2);

        if (isNaN(totalPoints) || totalPoints <= 0) {
          alert('El segundo argumento debe ser un número de puntos válido');
          return;
        }

        if (voteOptions.length < 2) {
          alert('Debe haber al menos 2 opciones');
          return;
        }

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/vote ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'vote-points',
              commandData: {
                question: voteQuestion,
                options: voteOptions.map((opt: string) => ({ text: opt, points: 0 })),
                totalPoints,
                userVotes: [],
                closed: false,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const voteMessage = await response.json();
            setMessages((prev) => [...prev, voteMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating vote:', error);
          alert('Error al crear la votación');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'fist-of-five':
        if (parsed.args.length < 1) {
          alert('Uso: /fist-of-five "Pregunta o decisión"');
          return;
        }
        if (sending) return;
        const fistQuestion = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/fist-of-five ${fistQuestion}`,
              channelId: selectedChannelId,
              commandType: 'fist-of-five',
              commandData: {
                question: fistQuestion,
                votes: [],
                closed: false,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const fistMessage = await response.json();
            setMessages((prev) => [...prev, fistMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating fist-of-five:', error);
          alert('Error al crear la votación');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'checklist':
        if (parsed.args.length < 1) {
          alert('Uso: /checklist "Título" ["Item 1" "Item 2" ...]');
          return;
        }
        if (sending) return;
        const checklistTitle = parsed.args[0];
        const checklistItems = parsed.args.slice(1).map((text: string, idx: number) => ({
          id: `${Date.now()}-${idx}`,
          text,
          checked: false
        }));

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/checklist ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'checklist',
              commandData: {
                title: checklistTitle,
                items: checklistItems,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const checklistMessage = await response.json();
            setMessages((prev) => [...prev, checklistMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating checklist:', error);
          alert('Error al crear el checklist');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'timer':
        if (parsed.args.length < 1) {
          alert('Uso: /timer "Título" 25 (minutos)');
          return;
        }
        if (sending) return;
        const timerTitle = parsed.args[0];
        const minutes = parseInt(parsed.args[1] || '25', 10);

        if (isNaN(minutes) || minutes <= 0) {
          alert('Minutos deben ser un número positivo');
          return;
        }

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/timer ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'timer',
              commandData: {
                title: timerTitle,
                duration: minutes * 60,
                startTime: Date.now(),
                paused: false,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const timerMessage = await response.json();
            setMessages((prev) => [...prev, timerMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating timer:', error);
          alert('Error al crear el temporizador');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'wheel':
        if (parsed.args.length < 3) {
          alert('Uso: /wheel "Título" "Opción 1" "Opción 2" "Opción 3" ...');
          return;
        }
        if (sending) return;
        const wheelTitle = parsed.args[0];
        const wheelOptions = parsed.args.slice(1);

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/wheel ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'wheel',
              commandData: {
                title: wheelTitle,
                options: wheelOptions,
                winner: null,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const wheelMessage = await response.json();
            setMessages((prev) => [...prev, wheelMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating wheel:', error);
          alert('Error al crear la ruleta');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'mood':
        if (parsed.args.length < 1) {
          alert('Uso: /mood "Pregunta"');
          return;
        }
        if (sending) return;
        const moodQuestion = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/mood ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'mood',
              commandData: {
                question: moodQuestion,
                moods: [],
                closed: false,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const moodMessage = await response.json();
            setMessages((prev) => [...prev, moodMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating mood check-in:', error);
          alert('Error al crear el check-in');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'pros-cons':
        if (parsed.args.length < 1) {
          alert('Uso: /pros-cons "Título"');
          return;
        }
        if (sending) return;
        const prosConsTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/pros-cons ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'pros-cons',
              commandData: {
                title: prosConsTitle,
                pros: [],
                cons: [],
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const prosConsMessage = await response.json();
            setMessages((prev) => [...prev, prosConsMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating pros-cons:', error);
          alert('Error al crear la tabla de pros y contras');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'ranking':
        if (parsed.args.length < 3) {
          alert('Uso: /ranking "Pregunta" "Opción 1" "Opción 2" ...');
          return;
        }
        if (sending) return;
        const rankingQuestion = parsed.args[0];
        const rankingOptions = parsed.args.slice(1);

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/ranking ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'ranking',
              commandData: {
                question: rankingQuestion,
                options: rankingOptions,
                rankings: [],
                closed: false,
                createdBy: session?.user?.id
              }
            })
          });

          if (response.ok) {
            const rankingMessage = await response.json();
            setMessages((prev) => [...prev, rankingMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating ranking:', error);
          alert('Error al crear el ranking');
        } finally {
          setSending(false);
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

      case 'search':
        const searchType = parsed.args[0] || 'all';
        const searchTerm = parsed.args[1] || '';
        setActiveCommand({ type: 'search', data: { type: searchType, term: searchTerm } });
        setNewMessage('');
        break;

      case 'priorities':
        // Parse filters from args if provided
        const filters: any = {};
        parsed.args.forEach((arg) => {
          const [key, value] = arg.split(':');
          if (key && value) {
            filters[key] = value;
          }
        });
        setActiveCommand({ type: 'priorities', data: { filters } });
        setNewMessage('');
        break;

      case 'recent':
        const targetUser = parsed.args[0]?.replace('@', '') || '';
        const daysStr = parsed.args[1] || '7';
        const daysNum = parseInt(daysStr, 10);
        setActiveCommand({
          type: 'recent',
          data: { userName: targetUser, days: isNaN(daysNum) ? 7 : daysNum }
        });
        setNewMessage('');
        break;

      case 'standup':
        setActiveCommand({ type: 'standup' });
        setNewMessage('');
        break;

      case 'ai-summary':
        setActiveCommand({ type: 'ai-summary', args: parsed.args });
        setNewMessage('');
        break;

      case 'my-stats':
        setActiveCommand({ type: 'my-stats' });
        setNewMessage('');
        break;

      case 'schedule':
        const scheduleView = parsed.args[0] as 'week' | 'month' | undefined;
        setActiveCommand({ type: 'schedule', data: { view: scheduleView || 'month' } });
        setNewMessage('');
        break;

      case 'mention-stats':
        setActiveCommand({ type: 'mention-stats' });
        setNewMessage('');
        break;

      case 'decision':
        if (parsed.args.length < 1) {
          alert('Uso: /decision "descripción de la decisión"');
          return;
        }
        if (sending) return; // Evitar duplicados

        const decisionText = parsed.args[0];

        // Crear decisión persistente en la base de datos
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/decision "${decisionText}"`,
              channelId: selectedChannelId,
              commandType: 'decision',
              commandData: {
                decision: decisionText,
                createdBy: session?.user?.name,
                createdAt: new Date().toISOString()
              }
            })
          });

          if (response.ok) {
            const message = await response.json();
            // Agregar mensaje directamente en lugar de recargar todos
            setMessages((prev) => [...prev, message]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating decision:', error);
          alert('Error al registrar la decisión');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'question':
        if (parsed.args.length < 2) {
          alert('Uso: /question @usuario "¿Tu pregunta aquí?"');
          return;
        }
        if (sending) return; // Evitar duplicados

        const questionUser = parsed.args[0].replace('@', '');
        const questionText = parsed.args[1];

        // Buscar usuario mencionado (buscar por nombre completo o parcial)
        const questionedUser = users.find(u =>
          u.name.toLowerCase().includes(questionUser.toLowerCase()) ||
          questionUser.toLowerCase().includes(u.name.toLowerCase())
        );

        if (!questionedUser) {
          alert(`Usuario ${questionUser} no encontrado. Verifica el nombre.`);
          return;
        }

        // Crear pregunta persistente en la base de datos
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/question @${questionUser} "${questionText}"`,
              channelId: selectedChannelId,
              commandType: 'question',
              commandData: {
                question: questionText,
                askedTo: questionedUser.name,
                askedToId: questionedUser._id,
                askedBy: session?.user?.name,
                createdAt: new Date().toISOString(),
                answered: false
              }
            })
          });

          if (response.ok) {
            const message = await response.json();
            // Agregar mensaje directamente en lugar de recargar todos
            setMessages((prev) => [...prev, message]);
            scrollToBottom();

            // Notificar al usuario preguntado
            try {
              await fetch('/api/notifications/question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: questionedUser._id,
                  askerName: session?.user?.name,
                  questionText,
                  projectId,
                  projectName: 'Proyecto', // Nombre genérico por ahora
                  messageId: message._id
                })
              });
            } catch (notifError) {
              console.error('Error sending notification:', notifError);
              // No fallar el comando si la notificación falla
            }
          } else {
            const errorData = await response.json();
            alert(`Error al crear la pregunta: ${errorData.error || 'Error desconocido'}`);
          }
        } catch (error) {
          console.error('Error creating question:', error);
          alert('Error al crear la pregunta');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'export':
        const exportFormat = parsed.args[0] as 'excel' | 'pdf' | 'csv' | undefined;
        setActiveCommand({
          type: 'export',
          data: { format: exportFormat || 'excel' }
        });
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

  const handleMentionSelect = (item: { name?: string; tag?: string; isGroup?: boolean }) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    const beforeAt = newMessage.substring(0, lastAtIndex);
    const mentionText = item.isGroup ? item.tag : item.name;
    setNewMessage(`${beforeAt}@${mentionText} `);
    setShowUserSuggestions(false);
  };

  // Combinar usuarios y grupos para sugerencias de menciones
  const filteredMentions = [
    ...userGroups
      .filter((g) =>
        g.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        g.tag.toLowerCase().includes(mentionSearch.toLowerCase())
      )
      .map((g) => ({ ...g, isGroup: true })),
    ...users
      .filter((u) => u.name.toLowerCase().includes(mentionSearch.toLowerCase()))
      .map((u) => ({ ...u, isGroup: false }))
  ];

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
      {/* Channel Selector & Search Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-3 space-y-3">
        {/* Channel Selector */}
        <div className="flex items-center justify-between">
          <ChannelSelector
            projectId={projectId}
            selectedChannelId={selectedChannelId}
            onChannelSelect={(channelId, channelName) => {
              setSelectedChannelId(channelId);
              setSelectedChannelName(channelName);
            }}
          />
          <div className="flex items-center gap-3">
            {/* Online Users Indicator */}
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400" title={onlineUsers.map(u => u.info.name).join(', ')}>
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="font-medium">{onlineUsers.length} en línea</span>
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedChannelName && `# ${selectedChannelName}`}
            </div>
          </div>
        </div>

        {/* Search Bar */}
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
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${
                        message.userId._id === 'deleted'
                          ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                          : 'bg-gradient-to-br from-blue-400 to-purple-500'
                      }`}>
                        {message.userId.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-xs font-semibold ${
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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Cargando mensajes antiguos...</span>
            </div>
          </div>
        )}

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
            const isOwn = message.userId._id === session?.user.id && message.userId._id !== 'deleted';
            const reactionSummary = getReactionSummary(message.reactions);

            return (
              <div
                key={message._id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                    message.userId._id === 'deleted'
                      ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                      : 'bg-gradient-to-br from-blue-400 to-purple-500'
                  }`}>
                    {message.userId.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-xl ${isOwn ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${
                      message.userId._id === 'deleted'
                        ? 'text-gray-500 dark:text-gray-400 italic'
                        : 'text-gray-800 dark:text-gray-100'
                    }`}>
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
                    <div className="relative group">
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
                      {/* Actions Menu for Poll */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar encuesta"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'brainstorm' && message.commandData ? (
                    /* Render Brainstorm Command */
                    <div className="relative group">
                      <BrainstormCommand
                        projectId={projectId}
                        messageId={message._id}
                        topic={message.commandData.topic}
                        ideas={message.commandData.ideas || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {/* Actions Menu for Brainstorm */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar brainstorming"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'dot-voting' && message.commandData ? (
                    /* Render Dot Voting Command */
                    <div className="relative group">
                      <DotVotingCommand
                        projectId={projectId}
                        messageId={message._id}
                        question={message.commandData.question}
                        options={message.commandData.options || []}
                        totalDotsPerUser={message.commandData.totalDotsPerUser || 5}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {/* Actions Menu for Dot Voting */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar votación"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'blind-vote' && message.commandData ? (
                    /* Render Blind Vote Command */
                    <div className="relative group">
                      <BlindVoteCommand
                        projectId={projectId}
                        messageId={message._id}
                        question={message.commandData.question}
                        options={message.commandData.options || []}
                        createdBy={message.commandData.createdBy}
                        revealed={message.commandData.revealed || false}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {/* Actions Menu for Blind Vote */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar votación"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'mind-map' && message.commandData ? (
                    /* Render Mind Map Command */
                    <div className="relative group">
                      <MindMapCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        nodes={message.commandData.nodes || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {/* Actions Menu for Mind Map */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar mapa mental"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (message.commandType === 'rose-bud-thorn' || message.commandType === 'sailboat' ||
                       message.commandType === 'start-stop-continue' || message.commandType === 'swot' ||
                       message.commandType === 'six-hats' || message.commandType === 'crazy-8s' ||
                       message.commandType === 'affinity-map') &&
                       message.commandData ? (
                    /* Render Retro Command */
                    <div className="relative group">
                      <RetroCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        sections={message.commandData.sections || []}
                        type={message.commandType as any}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        icon={
                          message.commandType === 'rose-bud-thorn' ? <Flower2 className="text-white" size={20} /> :
                          message.commandType === 'sailboat' ? <Ship className="text-white" size={20} /> :
                          message.commandType === 'start-stop-continue' ? <PlayCircle className="text-white" size={20} /> :
                          message.commandType === 'six-hats' ? <span className="text-white text-xl">🎩</span> :
                          message.commandType === 'crazy-8s' ? <span className="text-white text-xl">🎨</span> :
                          message.commandType === 'affinity-map' ? <span className="text-white text-xl">📌</span> :
                          <Target className="text-white" size={20} />
                        }
                        gradient={
                          message.commandType === 'rose-bud-thorn' ? 'from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'sailboat' ? 'from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'start-stop-continue' ? 'from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'six-hats' ? 'from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'crazy-8s' ? 'from-fuchsia-50 to-pink-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'affinity-map' ? 'from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900' :
                          'from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900'
                        }
                        border={
                          message.commandType === 'rose-bud-thorn' ? 'border-pink-400 dark:border-pink-600' :
                          message.commandType === 'sailboat' ? 'border-blue-400 dark:border-blue-600' :
                          message.commandType === 'start-stop-continue' ? 'border-green-400 dark:border-green-600' :
                          message.commandType === 'six-hats' ? 'border-slate-400 dark:border-slate-600' :
                          message.commandType === 'crazy-8s' ? 'border-fuchsia-400 dark:border-fuchsia-600' :
                          message.commandType === 'affinity-map' ? 'border-amber-400 dark:border-amber-600' :
                          'border-purple-400 dark:border-purple-600'
                        }
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {/* Actions Menu for Retro */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar retrospectiva"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'nps' && message.commandData ? (
                    /* Render NPS Command */
                    <div className="relative group">
                      <NPSCommand
                        projectId={projectId}
                        messageId={message._id}
                        question={message.commandData.question}
                        votes={message.commandData.votes || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {/* Actions Menu for NPS */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar NPS"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'decision-matrix' && message.commandData ? (
                    /* Render Decision Matrix Command */
                    <div className="relative group">
                      <DecisionMatrixCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        options={message.commandData.options || []}
                        criteria={message.commandData.criteria || []}
                        cells={message.commandData.cells || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {/* Actions Menu for Decision Matrix */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar matriz"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'estimation-poker' && message.commandData ? (
                    /* Render Estimation Poker Command */
                    <div className="relative group">
                      <EstimationPokerCommand
                        projectId={projectId}
                        messageId={message._id}
                        topic={message.commandData.topic}
                        estimates={message.commandData.estimates || []}
                        revealed={message.commandData.revealed || false}
                        finalEstimate={message.commandData.finalEstimate}
                        closed={message.commandData.closed || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar estimation poker"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'retrospective' && message.commandData ? (
                    /* Render Retrospective Command */
                    <div className="relative group">
                      <RetrospectiveCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        items={message.commandData.items || []}
                        closed={message.commandData.closed || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar retrospectiva"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'incident' && message.commandData ? (
                    /* Render Incident Command */
                    <div className="relative group">
                      <IncidentCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        severity={message.commandData.severity}
                        commander={message.commandData.commander}
                        timeline={message.commandData.timeline || []}
                        resolved={message.commandData.resolved || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar incidente"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'vote-points' && message.commandData ? (
                    /* Render Vote Points Command */
                    <div className="relative group">
                      <VoteCommand
                        projectId={projectId}
                        messageId={message._id}
                        question={message.commandData.question}
                        options={message.commandData.options || []}
                        totalPoints={message.commandData.totalPoints}
                        userVotes={message.commandData.userVotes || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar votación"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'fist-of-five' && message.commandData ? (
                    /* Render Fist of Five Command */
                    <div className="relative group">
                      <FistOfFiveCommand
                        projectId={projectId}
                        messageId={message._id}
                        question={message.commandData.question}
                        votes={message.commandData.votes || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar votación Fist of Five"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'checklist' && message.commandData ? (
                    /* Render Checklist Command */
                    <div className="relative group">
                      <ChecklistCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        items={message.commandData.items || []}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar checklist"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'timer' && message.commandData ? (
                    /* Render Timer Command */
                    <div className="relative group">
                      <TimerCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        duration={message.commandData.duration}
                        startTime={message.commandData.startTime}
                        paused={message.commandData.paused || false}
                        onClose={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar timer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'wheel' && message.commandData ? (
                    /* Render Wheel Command */
                    <div className="relative group">
                      <WheelCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        options={message.commandData.options || []}
                        winner={message.commandData.winner}
                        onClose={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar ruleta"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'mood' && message.commandData ? (
                    /* Render Mood Command */
                    <div className="relative group">
                      <MoodCommand
                        projectId={projectId}
                        messageId={message._id}
                        question={message.commandData.question}
                        moods={message.commandData.moods || []}
                        closed={message.commandData.closed || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar mood check-in"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'pros-cons' && message.commandData ? (
                    /* Render Pros-Cons Command */
                    <div className="relative group">
                      <ProsConsCommand
                        projectId={projectId}
                        messageId={message._id}
                        title={message.commandData.title}
                        pros={message.commandData.pros || []}
                        cons={message.commandData.cons || []}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar pros-cons"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'ranking' && message.commandData ? (
                    /* Render Ranking Command */
                    <div className="relative group">
                      <RankingCommand
                        projectId={projectId}
                        messageId={message._id}
                        question={message.commandData.question}
                        options={message.commandData.options || []}
                        rankings={message.commandData.rankings || []}
                        closed={message.commandData.closed || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar ranking"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'ai-summary' && message.commandData ? (
                    /* Render AI Summary Command */
                    <div className="relative group">
                      <AiSummaryCommand
                        projectId={projectId}
                        messageId={message._id}
                        messages={messages}
                        args={[]}
                        existingSummary={message.commandData.summary}
                        existingMessagesAnalyzed={message.commandData.messagesAnalyzed}
                        onClose={() => {}}
                      />
                      {/* Actions Menu for AI Summary */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'celebrate' && message.commandData ? (
                    /* Render Celebrate Command */
                    <div className="relative group">
                      <CelebrateCommand
                        projectId={projectId}
                        messageId={message._id}
                        userName={message.commandData.userName}
                        achievement={message.commandData.achievement}
                        createdBy={message.commandData.createdBy}
                        createdAt={message.commandData.createdAt}
                        onClose={() => {}}
                      />
                      {/* Actions Menu for Celebrate */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar celebración"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'decision' && message.commandData ? (
                    /* Render Decision Command */
                    <div className="relative group">
                      <DecisionCommand
                        projectId={projectId}
                        messageId={message._id}
                        decision={message.commandData.decision}
                        createdBy={message.commandData.createdBy}
                        createdAt={message.commandData.createdAt}
                        onClose={() => {}}
                      />
                      {/* Actions Menu for Decision */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar decisión"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'question' && message.commandData ? (
                    /* Render Question Command */
                    <div className="relative group">
                      <QuestionCommand
                        projectId={projectId}
                        messageId={message._id}
                        question={message.commandData.question}
                        askedTo={message.commandData.askedTo}
                        askedToId={message.commandData.askedToId}
                        askedBy={message.commandData.askedBy}
                        createdAt={message.commandData.createdAt}
                        answered={message.commandData.answered || false}
                        answer={message.commandData.answer}
                        answeredAt={message.commandData.answeredAt}
                        onClose={() => {}}
                        onUpdate={loadMessages}
                      />
                      {/* Actions Menu for Question */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar pregunta"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'webhook-incoming' && message.commandData ? (
                    /* Render Webhook Message Card */
                    <div className="relative group">
                      <WebhookMessageCard
                        content={message.content}
                        webhookName={message.commandData.webhookName || 'Webhook'}
                        username={message.commandData.username || 'Sistema Externo'}
                        metadata={message.commandData.metadata || {}}
                        createdAt={message.createdAt}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar mensaje de webhook"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`relative group rounded-lg px-4 py-2 ${
                        isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                      } ${
                        message.replyCount > 0
                          ? 'border-l-4 border-blue-500 dark:border-blue-400'
                          : ''
                      }`}
                    >
                      <div className="text-sm">
                        <MessageContent
                          content={message.content}
                          priorityMentions={message.priorityMentions}
                        />
                      </div>

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment) => (
                            <AttachmentCard
                              key={attachment._id}
                              attachment={attachment}
                              projectId={projectId}
                              compact={true}
                              showPreview={false}
                            />
                          ))}
                        </div>
                      )}

                      {/* Actions Menu */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setOpenThread(message)}
                              className="p-1 bg-white/20 rounded hover:bg-white/30"
                              title="Responder en hilo"
                            >
                              <MessageSquare size={14} />
                            </button>
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
                              </>
                            )}
                            {(isOwn || session?.user?.role === 'ADMIN') && (
                              <button
                                onClick={() => handleDeleteMessage(message._id)}
                                className="p-1 bg-white/20 rounded hover:bg-white/30"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
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
                  <div className="flex gap-1 mt-1 items-center">
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
                    {/* Emoji Picker para más opciones */}
                    <EmojiPicker onEmojiSelect={(emoji) => handleReaction(message._id, emoji)} />
                  </div>

                  {/* Reply Button/Counter */}
                  {message.replyCount > 0 && (
                    <button
                      onClick={() => setOpenThread(message)}
                      className="flex items-center gap-1 mt-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition text-xs font-medium"
                    >
                      <MessageSquare size={14} />
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

      {/* Active Command Modal Overlay */}
      {activeCommand && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveCommand(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-7xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
            {activeCommand.type === 'summary' && (
              <SummaryCommand
                projectId={projectId}
                period={activeCommand.data?.period}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'progress' && (
              <ProgressCommand
                projectId={projectId}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'team-load' && (
              <TeamLoadCommand
                projectId={projectId}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'burndown' && (
              <BurndownCommand
                projectId={projectId}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'velocity' && (
              <VelocityCommand
                projectId={projectId}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {/* Poll y Celebrate se renderizan directamente en la lista de mensajes ya que se persisten */}
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
            {activeCommand.type === 'search' && (
              <SearchCommand
                projectId={projectId}
                initialType={activeCommand.data?.type}
                initialTerm={activeCommand.data?.term}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'priorities' && (
              <PrioritiesCommand
                projectId={projectId}
                initialFilters={activeCommand.data?.filters}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'recent' && (
              <RecentCommand
                projectId={projectId}
                userName={activeCommand.data?.userName}
                days={activeCommand.data?.days}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'standup' && (
              <StandupCommand
                projectId={projectId}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand?.type === 'ai-summary' && (
              <AiSummaryCommand
                projectId={projectId}
                messages={messages}
                args={activeCommand.args || []}
                onClose={() => setActiveCommand(null)}
                onSuccess={() => {
                  loadMessages();
                  setActiveCommand(null);
                }}
              />
            )}
            {activeCommand.type === 'my-stats' && (
              <MyStatsCommand
                projectId={projectId}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'schedule' && (
              <ScheduleCommand
                projectId={projectId}
                view={activeCommand.data?.view}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'mention-stats' && (
              <MentionStatsCommand
                projectId={projectId}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'export' && (
              <ExportCommand
                projectId={projectId}
                initialFormat={activeCommand.data?.format}
                onClose={() => setActiveCommand(null)}
              />
            )}
            {activeCommand.type === 'help' && (
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-gray-300 dark:border-gray-700 p-6 m-2">
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
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {/* Typing Indicator - con altura fija para evitar rebote */}
        <div className="mb-2 h-4 text-xs text-gray-500 dark:text-gray-400 italic flex items-center gap-1 transition-opacity duration-200" style={{ opacity: typingUsers.length > 0 ? 1 : 0 }}>
          {typingUsers.length > 0 && (
            <>
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} está escribiendo...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} y ${typingUsers[1]} están escribiendo...`
                  : `${typingUsers[0]}, ${typingUsers[1]} y ${typingUsers.length - 2} más están escribiendo...`}
              </span>
            </>
          )}
        </div>

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

        {/* User and Group Suggestions */}
        {showUserSuggestions && filteredMentions.length > 0 && (
          <div className="mb-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {filteredMentions.slice(0, 8).map((item: any) => (
              <button
                key={item._id}
                onClick={() => handleMentionSelect(item)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 transition"
              >
                {item.isGroup ? (
                  <>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                      style={{ backgroundColor: item.color || '#3b82f6' }}
                    >
                      👥
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {item.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-mono"
                          style={{
                            backgroundColor: `${item.color}20`,
                            color: item.color || '#3b82f6'
                          }}
                        >
                          @{item.tag}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.members?.length || 0} {(item.members?.length || 0) === 1 ? 'miembro' : 'miembros'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                      {item.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.email}
                      </div>
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {/* File Upload Area */}
        {showAttachments && selectedChannelId && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Adjuntar archivo
              </h3>
              <button
                onClick={() => setShowAttachments(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            <FileUpload
              projectId={projectId}
              channelId={selectedChannelId}
              onUploadSuccess={async (attachment) => {
                setShowAttachments(false);

                // Crear mensaje en el chat con el archivo adjunto
                try {
                  const response = await fetch(`/api/projects/${projectId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: `📎 Subió el archivo: **${attachment.originalName}**`,
                      channelId: selectedChannelId,
                      attachments: [attachment._id]
                    })
                  });

                  if (response.ok) {
                    const message = await response.json();
                    setMessages((prev) => [...prev, message]);
            scrollToBottom();
                  } else {
                    // Si falla crear el mensaje, al menos recargar para mostrar en pestaña
                    loadMessages();
                  }
                } catch (error) {
                  console.error('Error creating message with attachment:', error);
                  loadMessages();
                }
              }}
              onUploadError={(error) => {
                console.error('Error uploading file:', error);
              }}
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            disabled={!selectedChannelId}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
            title="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            onPaste={handlePaste}
            placeholder="Escribe un mensaje... (@ para mencionar, / para comandos, Markdown soportado)"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <MarkdownHelp />
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
          <span className="font-medium">Enter</span> para enviar • <span className="font-medium">Shift+Enter</span> para nueva línea • <span className="font-medium">Ctrl+V</span> para pegar imágenes • Soporta <span className="font-medium">Markdown</span> (haz clic en ? para ayuda)
        </p>
      </div>

      {/* Thread View Modal */}
      {openThread && selectedChannelId && (
        <ThreadView
          projectId={projectId}
          parentMessage={openThread}
          channelId={selectedChannelId}
          onClose={async () => {
            // Actualizar solo el mensaje padre en lugar de recargar todos
            try {
              const response = await fetch(`/api/projects/${projectId}/messages?channelId=${selectedChannelId}`);
              if (response.ok) {
                const data = await response.json();
                const updatedParent = data.messages.find((m: Message) => m._id === openThread._id);
                if (updatedParent) {
                  setMessages((prev) =>
                    prev.map((m) => (m._id === openThread._id ? updatedParent : m))
                  );
                }
              }
            } catch (error) {
              console.error('Error updating parent message:', error);
            }
            setOpenThread(null);
          }}
        />
      )}
    </div>
  );
}

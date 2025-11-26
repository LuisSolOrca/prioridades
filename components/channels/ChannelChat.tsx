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
  Target,
  Sparkles,
  Brain,
  Loader2,
  Mic
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
import WhiteboardCommand from '../whiteboard/WhiteboardCommand';
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
import ParkingLotCommand from '../slashCommands/ParkingLotCommand';
import KudosWallCommand from '../slashCommands/KudosWallCommand';
import IcebreakerCommand from '../slashCommands/IcebreakerCommand';
import ActionItemsCommand from '../slashCommands/ActionItemsCommand';
import TeamHealthCommand from '../slashCommands/TeamHealthCommand';
import ConfidenceVoteCommand from '../slashCommands/ConfidenceVoteCommand';
import PomodoroCommand from '../slashCommands/PomodoroCommand';
import AgendaCommand from '../slashCommands/AgendaCommand';
import CapacityCommand from '../slashCommands/CapacityCommand';
import DependencyMapCommand from '../slashCommands/DependencyMapCommand';
import OKRCommand from '../slashCommands/OKRCommand';
import RoadmapCommand from '../slashCommands/RoadmapCommand';
import RiskMatrixCommand from '../slashCommands/RiskMatrixCommand';
import RICECommand from '../slashCommands/RICECommand';
import LeanCanvasCommand from '../slashCommands/LeanCanvasCommand';
import CustomerJourneyCommand from '../slashCommands/CustomerJourneyCommand';
import LeanCoffeeCommand from '../slashCommands/LeanCoffeeCommand';
import UserStoryMappingCommand from '../slashCommands/UserStoryMappingCommand';
import FishboneCommand from '../slashCommands/FishboneCommand';
import RACICommand from '../slashCommands/RACICommand';
import WorkingAgreementsCommand from '../slashCommands/WorkingAgreementsCommand';
import BrainwritingCommand from '../slashCommands/BrainwritingCommand';
import PersonaCommand from '../slashCommands/PersonaCommand';
import AssumptionMappingCommand from '../slashCommands/AssumptionMappingCommand';
import TeamCanvasCommand from '../slashCommands/TeamCanvasCommand';
import FiveWhysCommand from '../slashCommands/FiveWhysCommand';
import ImpactEffortCommand from '../slashCommands/ImpactEffortCommand';
import OpportunityTreeCommand from '../slashCommands/OpportunityTreeCommand';
import LotusBlossomCommand from '../slashCommands/LotusBlossomCommand';
import RomanVotingCommand from '../slashCommands/RomanVotingCommand';
import InceptionDeckCommand from '../slashCommands/InceptionDeckCommand';
import DelegationPokerCommand from '../slashCommands/DelegationPokerCommand';
import MovingMotivatorsCommand from '../slashCommands/MovingMotivatorsCommand';
import WebhookMessageCard from '../slashCommands/WebhookMessageCard';
import FileUpload from '../FileUpload';
import AttachmentCard from '../AttachmentCard';
import VoiceRecorder from './VoiceRecorder';
import VoicePlayer from './VoicePlayer';

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

interface VoiceMessage {
  r2Key: string;
  duration: number;
  mimeType: string;
  waveform?: number[];
  transcription?: string;
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
  voiceMessage?: VoiceMessage;
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
  const [semanticSearchMode, setSemanticSearchMode] = useState(false);
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [semanticSearching, setSemanticSearching] = useState(false);
  const [showSemanticResults, setShowSemanticResults] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
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
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Infinite scroll states
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Read marker state
  const [readMarker, setReadMarker] = useState<{
    lastReadMessageId: string | null;
    lastReadAt: string | null;
  }>({ lastReadMessageId: null, lastReadAt: null });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUsers();
    loadUserGroups();
    // No cargar mensajes aquí, esperar a que se seleccione un canal
  }, [projectId]);

  // Scroll inicial cuando cargan los mensajes
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Usar requestAnimationFrame para asegurar que el DOM se ha actualizado
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          // Scroll directo al fondo sin animación para carga inicial
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, [selectedChannelId]); // Solo cuando cambia el canal

  // Scroll adicional después de la carga inicial de mensajes
  useEffect(() => {
    if (initialLoad && messages.length > 0) {
      // Doble requestAnimationFrame para asegurar renderizado completo
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
          setInitialLoad(false);
        });
      });
    }
  }, [messages, initialLoad]);

  // Listener de scroll para infinite scroll y read markers
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Si el usuario hace scroll hasta arriba (con un threshold de 100px)
      if (container.scrollTop < 100 && hasMore && !loadingMore) {
        loadMoreMessages();
      }

      // Si el usuario llega al fondo, marcar como leído
      const threshold = 100;
      const position = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (position < threshold && unreadCount > 0) {
        markAsRead();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, nextCursor, unreadCount]);

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
      loadReadMarker();
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
      // Mark as read when scrolling to bottom and there are unread messages
      if (unreadCount > 0) {
        markAsRead();
      }
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
      // El scroll inicial se maneja en el useEffect correspondiente
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

  // Load read marker for current channel
  const loadReadMarker = async () => {
    if (!selectedChannelId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/channels/${selectedChannelId}/read-marker`);
      if (response.ok) {
        const data = await response.json();
        if (data.marker) {
          setReadMarker({
            lastReadMessageId: data.marker.lastReadMessageId,
            lastReadAt: data.marker.lastReadAt
          });
          setUnreadCount(data.unreadCount || 0);
        } else {
          setReadMarker({ lastReadMessageId: null, lastReadAt: null });
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error('Error loading read marker:', err);
    }
  };

  // Update read marker (mark all as read)
  const markAsRead = async () => {
    if (!selectedChannelId || messages.length === 0) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/channels/${selectedChannelId}/read-marker`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.marker) {
          setReadMarker({
            lastReadMessageId: data.marker.lastReadMessageId,
            lastReadAt: data.marker.lastReadAt
          });
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Semantic search with Groq AI
  const performSemanticSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) return;

    setSemanticSearching(true);
    setShowSemanticResults(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/messages/semantic-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          channelId: selectedChannelId,
          limit: 10
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSemanticResults(data.results || []);
      } else {
        const error = await response.json();
        console.error('Semantic search error:', error);
        setSemanticResults([]);
      }
    } catch (err) {
      console.error('Error in semantic search:', err);
      setSemanticResults([]);
    } finally {
      setSemanticSearching(false);
    }
  };

  // Scroll to a specific message and highlight it
  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedMessageId(null), 3000);
    } else {
      // Message not in current view - might need to load more messages
      console.log('Message not found in current view:', messageId);
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

    // Validar que hay un canal seleccionado
    if (!selectedChannelId) {
      alert('Por favor selecciona un canal primero');
      return;
    }

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

    // Guardar el mensaje antes de limpiar (para restaurar en caso de error)
    const messageToSend = newMessage.trim();

    try {
      setSending(true);

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageToSend,
          channelId: selectedChannelId,
          mentions: [] // TODO: detectar menciones @usuario
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al enviar mensaje');
      }

      const message = await response.json();
      setMessages((prev) => [...prev, message]);
      // Solo limpiar input después de éxito confirmado
      setNewMessage('');
      // Siempre hacer scroll cuando el usuario envía su propio mensaje
      scrollToBottom();
    } catch (err: any) {
      console.error('Error sending message:', err);
      alert(err.message || 'Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleSendVoiceMessage = async (voiceData: {
    r2Key: string;
    duration: number;
    mimeType: string;
    waveform: number[];
  }) => {
    if (!selectedChannelId || sending) return;

    try {
      setSending(true);

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '🎤 Mensaje de voz',
          channelId: selectedChannelId,
          mentions: [],
          voiceMessage: voiceData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al enviar mensaje de voz');
      }

      const message = await response.json();
      setMessages((prev) => [...prev, message]);
      setShowVoiceRecorder(false);
      scrollToBottom();
    } catch (err: any) {
      console.error('Error sending voice message:', err);
      alert(err.message || 'Error al enviar mensaje de voz');
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

      case 'soar':
        if (parsed.args.length < 1) {
          alert('Uso: /soar "Título del análisis"');
          return;
        }
        if (sending) return;
        const soarTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/soar ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'soar',
              commandData: {
                title: soarTitle,
                sections: [
                  { id: 'strengths', title: 'Fortalezas', icon: '💪', color: '#10b981', items: [] },
                  { id: 'opportunities', title: 'Oportunidades', icon: '🎯', color: '#3b82f6', items: [] },
                  { id: 'aspirations', title: 'Aspiraciones', icon: '✨', color: '#8b5cf6', items: [] },
                  { id: 'results', title: 'Resultados', icon: '🏆', color: '#f59e0b', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const soarMessage = await response.json();
            setMessages((prev) => [...prev, soarMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating soar:', error);
          alert('Error al crear análisis SOAR');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'parking-lot':
        if (parsed.args.length < 1) {
          alert('Uso: /parking-lot "Título"');
          return;
        }
        if (sending) return;
        const parkingLotTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/parking-lot ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'parking-lot',
              commandData: {
                title: parkingLotTitle,
                items: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const parkingLotMessage = await response.json();
            setMessages((prev) => [...prev, parkingLotMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating parking-lot:', error);
          alert('Error al crear parking lot');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'kudos-wall':
        if (parsed.args.length < 1) {
          alert('Uso: /kudos-wall "Título"');
          return;
        }
        if (sending) return;
        const kudosWallTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/kudos-wall ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'kudos-wall',
              commandData: {
                title: kudosWallTitle,
                kudos: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const kudosWallMessage = await response.json();
            setMessages((prev) => [...prev, kudosWallMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating kudos-wall:', error);
          alert('Error al crear muro de kudos');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'icebreaker':
        if (sending) return;

        // Random icebreaker questions
        const icebreakerQuestions = [
          '¿Cuál fue tu primera mascota?',
          '¿Qué superpoder te gustaría tener y por qué?',
          '¿Cuál es tu comida favorita de la infancia?',
          '¿Qué lugar del mundo te gustaría visitar?',
          'Si pudieras cenar con cualquier persona (viva o fallecida), ¿quién sería?',
          '¿Cuál es tu película favorita de todos los tiempos?',
          '¿Qué hobby o actividad te gustaría aprender?',
          'Si pudieras tener cualquier trabajo por un día, ¿cuál sería?',
          '¿Cuál es el mejor consejo que has recibido?',
          '¿Qué te hace reír sin falta?',
          '¿Cuál es tu recuerdo favorito de vacaciones?',
          'Si fueras un animal, ¿cuál serías y por qué?',
          '¿Qué canción no puedes dejar de escuchar últimamente?',
          '¿Cuál es tu tradición familiar favorita?',
          'Si pudieras vivir en cualquier época, ¿cuál elegirías?'
        ];

        const randomQuestion = icebreakerQuestions[Math.floor(Math.random() * icebreakerQuestions.length)];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/icebreaker`,
              channelId: selectedChannelId,
              commandType: 'icebreaker',
              commandData: {
                question: randomQuestion
              }
            })
          });

          if (response.ok) {
            const icebreakerMessage = await response.json();
            setMessages((prev) => [...prev, icebreakerMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating icebreaker:', error);
          alert('Error al crear icebreaker');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'action-items':
        if (parsed.args.length < 1) {
          alert('Uso: /action-items "Título"');
          return;
        }
        if (sending) return;
        const actionItemsTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/action-items ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'action-items',
              commandData: {
                title: actionItemsTitle,
                items: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const actionItemsMessage = await response.json();
            setMessages((prev) => [...prev, actionItemsMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating action-items:', error);
          alert('Error al crear action items');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'team-health':
        if (parsed.args.length < 1) {
          alert('Uso: /team-health "Título"');
          return;
        }
        if (sending) return;
        const teamHealthTitle = parsed.args[0];

        // Áreas predefinidas del Spotify Health Check
        const defaultAreas = [
          { id: 'delivering-value', name: 'Delivering Value', votes: [] },
          { id: 'fun', name: 'Fun', votes: [] },
          { id: 'health-of-codebase', name: 'Health of Codebase', votes: [] },
          { id: 'learning', name: 'Learning', votes: [] },
          { id: 'mission', name: 'Mission', votes: [] },
          { id: 'pawns-or-players', name: 'Pawns or Players', votes: [] },
          { id: 'speed', name: 'Speed', votes: [] },
          { id: 'support', name: 'Support', votes: [] },
          { id: 'teamwork', name: 'Teamwork', votes: [] }
        ];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/team-health ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'team-health',
              commandData: {
                title: teamHealthTitle,
                areas: defaultAreas,
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const teamHealthMessage = await response.json();
            setMessages((prev) => [...prev, teamHealthMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating team-health:', error);
          alert('Error al crear team health');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'confidence-vote':
        if (parsed.args.length < 1) {
          alert('Uso: /confidence-vote "¿Pregunta?"');
          return;
        }
        if (sending) return;
        const confidenceQuestion = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/confidence-vote ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'confidence-vote',
              commandData: {
                question: confidenceQuestion,
                votes: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const confidenceVoteMessage = await response.json();
            setMessages((prev) => [...prev, confidenceVoteMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating confidence-vote:', error);
          alert('Error al crear voto de confianza');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'pomodoro':
        if (parsed.args.length < 1) {
          alert('Uso: /pomodoro "Título"');
          return;
        }
        if (sending) return;
        const pomodoroTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/pomodoro ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'pomodoro',
              commandData: {
                title: pomodoroTitle,
                workMinutes: 25,
                breakMinutes: 5,
                sessionsCompleted: 0,
                isRunning: false,
                isPaused: false,
                isBreak: false,
                timeRemaining: 25 * 60,
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const pomodoroMessage = await response.json();
            setMessages((prev) => [...prev, pomodoroMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating pomodoro:', error);
          alert('Error al crear pomodoro');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'agenda':
        if (parsed.args.length < 1) {
          alert('Uso: /agenda "Título de la reunión"');
          return;
        }
        if (sending) return;
        const agendaTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/agenda ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'agenda',
              commandData: {
                title: agendaTitle,
                items: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const agendaMessage = await response.json();
            setMessages((prev) => [...prev, agendaMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating agenda:', error);
          alert('Error al crear agenda');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'capacity':
        if (parsed.args.length < 1) {
          alert('Uso: /capacity "Título"');
          return;
        }
        if (sending) return;
        const capacityTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/capacity ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'capacity',
              commandData: {
                title: capacityTitle,
                members: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const capacityMessage = await response.json();
            setMessages((prev) => [...prev, capacityMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating capacity:', error);
          alert('Error al crear capacity');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'dependency-map':
        if (parsed.args.length < 1) {
          alert('Uso: /dependency-map "Título"');
          return;
        }
        if (sending) return;
        const dependencyMapTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/dependency-map ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'dependency-map',
              commandData: {
                title: dependencyMapTitle,
                tasks: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const dependencyMapMessage = await response.json();
            setMessages((prev) => [...prev, dependencyMapMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating dependency-map:', error);
          alert('Error al crear mapa de dependencias');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'okr':
        if (parsed.args.length < 1) {
          alert('Uso: /okr "Título"');
          return;
        }
        if (sending) return;
        const okrTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/okr ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'okr',
              commandData: {
                title: okrTitle,
                objectives: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const okrMessage = await response.json();
            setMessages((prev) => [...prev, okrMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating okr:', error);
          alert('Error al crear OKR');
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'roadmap':
        if (parsed.args.length < 1) {
          alert('Uso: /roadmap "Título"');
          return;
        }
        if (sending) return;
        const roadmapTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/roadmap ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'roadmap',
              commandData: {
                title: roadmapTitle,
                milestones: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });

          if (response.ok) {
            const roadmapMessage = await response.json();
            setMessages((prev) => [...prev, roadmapMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating roadmap:', error);
          alert('Error al crear roadmap');
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

      case 'whiteboard':
        if (parsed.args.length < 1) {
          alert('Uso: /whiteboard "Título de la pizarra"');
          return;
        }
        if (sending) return;
        const whiteboardTitle = parsed.args[0];

        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/whiteboard ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'whiteboard',
              commandData: {
                title: whiteboardTitle,
                createdBy: session?.user?.id,
                createdByName: session?.user?.name || 'Usuario'
              }
            })
          });

          if (response.ok) {
            const whiteboardMessage = await response.json();
            setMessages((prev) => [...prev, whiteboardMessage]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating whiteboard:', error);
          alert('Error al crear pizarra');
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

      // ===== BATCH NUEVOS WIDGETS =====

      case 'scamper':
        if (parsed.args.length < 1) {
          alert('Uso: /scamper "Producto o proceso"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/scamper ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'scamper',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'substitute', title: 'Sustituir', icon: '🔄', color: '#ef4444', items: [] },
                  { id: 'combine', title: 'Combinar', icon: '🔗', color: '#f59e0b', items: [] },
                  { id: 'adapt', title: 'Adaptar', icon: '🔧', color: '#eab308', items: [] },
                  { id: 'modify', title: 'Modificar', icon: '✏️', color: '#84cc16', items: [] },
                  { id: 'put', title: 'Propósito', icon: '🎯', color: '#10b981', items: [] },
                  { id: 'eliminate', title: 'Eliminar', icon: '❌', color: '#06b6d4', items: [] },
                  { id: 'reverse', title: 'Reorganizar', icon: '🔀', color: '#8b5cf6', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating scamper:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'starbursting':
        if (parsed.args.length < 1) {
          alert('Uso: /starbursting "Idea o concepto"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/starbursting ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'starbursting',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'what', title: 'Qué', icon: '❓', color: '#ef4444', items: [] },
                  { id: 'who', title: 'Quién', icon: '👤', color: '#f59e0b', items: [] },
                  { id: 'where', title: 'Dónde', icon: '📍', color: '#10b981', items: [] },
                  { id: 'when', title: 'Cuándo', icon: '📅', color: '#3b82f6', items: [] },
                  { id: 'why', title: 'Por qué', icon: '💡', color: '#8b5cf6', items: [] },
                  { id: 'how', title: 'Cómo', icon: '⚙️', color: '#ec4899', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating starbursting:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'reverse-brainstorm':
        if (parsed.args.length < 1) {
          alert('Uso: /reverse-brainstorm "Problema"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/reverse-brainstorm ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'reverse-brainstorm',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'problems', title: 'Causar Problemas', icon: '💥', color: '#ef4444', items: [] },
                  { id: 'solutions', title: 'Soluciones Invertidas', icon: '✅', color: '#10b981', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating reverse-brainstorm:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'worst-idea':
        if (parsed.args.length < 1) {
          alert('Uso: /worst-idea "Reto o problema"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/worst-idea ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'worst-idea',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'worst', title: 'Peores Ideas', icon: '👎', color: '#ef4444', items: [] },
                  { id: 'transformed', title: 'Ideas Transformadas', icon: '✨', color: '#10b981', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating worst-idea:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'empathy-map':
        if (parsed.args.length < 1) {
          alert('Uso: /empathy-map "Usuario o persona"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/empathy-map ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'empathy-map',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'says', title: 'Dice', icon: '💬', color: '#3b82f6', items: [] },
                  { id: 'thinks', title: 'Piensa', icon: '💭', color: '#8b5cf6', items: [] },
                  { id: 'does', title: 'Hace', icon: '🏃', color: '#10b981', items: [] },
                  { id: 'feels', title: 'Siente', icon: '❤️', color: '#ef4444', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating empathy-map:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'moscow':
        if (parsed.args.length < 1) {
          alert('Uso: /moscow "Lista de features"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/moscow ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'moscow',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'must', title: 'Must Have', icon: '🔴', color: '#ef4444', items: [] },
                  { id: 'should', title: 'Should Have', icon: '🟠', color: '#f59e0b', items: [] },
                  { id: 'could', title: 'Could Have', icon: '🟡', color: '#eab308', items: [] },
                  { id: 'wont', title: "Won't Have", icon: '⚪', color: '#6b7280', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating moscow:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case '4ls':
        if (parsed.args.length < 1) {
          alert('Uso: /4ls "Sprint o período"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/4ls ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: '4ls',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'liked', title: 'Liked', icon: '👍', color: '#10b981', items: [] },
                  { id: 'learned', title: 'Learned', icon: '📚', color: '#3b82f6', items: [] },
                  { id: 'lacked', title: 'Lacked', icon: '❌', color: '#ef4444', items: [] },
                  { id: 'longed', title: 'Longed For', icon: '✨', color: '#8b5cf6', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating 4ls:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'pre-mortem':
        if (parsed.args.length < 1) {
          alert('Uso: /pre-mortem "Proyecto o iniciativa"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/pre-mortem ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'pre-mortem',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'failures', title: 'Posibles Fracasos', icon: '💥', color: '#ef4444', items: [] },
                  { id: 'causes', title: 'Causas', icon: '🔍', color: '#f59e0b', items: [] },
                  { id: 'mitigations', title: 'Mitigaciones', icon: '🛡️', color: '#10b981', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating pre-mortem:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'starfish':
        if (parsed.args.length < 1) {
          alert('Uso: /starfish "Sprint o período"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/starfish ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'starfish',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'keep', title: 'Keep Doing', icon: '✅', color: '#10b981', items: [] },
                  { id: 'less', title: 'Less Of', icon: '📉', color: '#f59e0b', items: [] },
                  { id: 'more', title: 'More Of', icon: '📈', color: '#3b82f6', items: [] },
                  { id: 'stop', title: 'Stop Doing', icon: '🛑', color: '#ef4444', items: [] },
                  { id: 'start', title: 'Start Doing', icon: '🚀', color: '#8b5cf6', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating starfish:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'mad-sad-glad':
        if (parsed.args.length < 1) {
          alert('Uso: /mad-sad-glad "Sprint o período"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/mad-sad-glad ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'mad-sad-glad',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'mad', title: 'Mad', icon: '😠', color: '#ef4444', items: [] },
                  { id: 'sad', title: 'Sad', icon: '😢', color: '#3b82f6', items: [] },
                  { id: 'glad', title: 'Glad', icon: '😊', color: '#10b981', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating mad-sad-glad:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'how-might-we':
        if (parsed.args.length < 1) {
          alert('Uso: /how-might-we "Problema u oportunidad"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/how-might-we ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'how-might-we',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'problems', title: 'Problemas', icon: '❓', color: '#ef4444', items: [] },
                  { id: 'hmw', title: 'How Might We...', icon: '💡', color: '#f59e0b', items: [] },
                  { id: 'ideas', title: 'Ideas', icon: '✨', color: '#10b981', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating how-might-we:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'hot-air-balloon':
        if (parsed.args.length < 1) {
          alert('Uso: /hot-air-balloon "Sprint o período"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/hot-air-balloon ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'hot-air-balloon',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'fire', title: 'Fuego (Impulsos)', icon: '🔥', color: '#f97316', items: [] },
                  { id: 'clouds', title: 'Nubes (Obstáculos)', icon: '☁️', color: '#6b7280', items: [] },
                  { id: 'sandbags', title: 'Sacos (Lastre)', icon: '🎒', color: '#78716c', items: [] },
                  { id: 'destination', title: 'Destino (Metas)', icon: '🎯', color: '#10b981', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating hot-air-balloon:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'kalm':
        if (parsed.args.length < 1) {
          alert('Uso: /kalm "Sprint o período"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/kalm ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'kalm',
              commandData: {
                title: parsed.args[0],
                sections: [
                  { id: 'keep', title: 'Keep (Mantener)', icon: '✅', color: '#10b981', items: [] },
                  { id: 'add', title: 'Add (Agregar)', icon: '➕', color: '#3b82f6', items: [] },
                  { id: 'less', title: 'Less (Menos)', icon: '➖', color: '#f59e0b', items: [] },
                  { id: 'more', title: 'More (Más)', icon: '⬆️', color: '#8b5cf6', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating kalm:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'roman-voting':
        if (parsed.args.length < 1) {
          alert('Uso: /roman-voting "¿Pregunta o decisión?"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/roman-voting ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'roman-voting',
              commandData: {
                title: parsed.args[0],
                question: parsed.args[0],
                votes: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating roman-voting:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'lean-coffee':
        if (parsed.args.length < 1) {
          alert('Uso: /lean-coffee "Título de la sesión"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/lean-coffee ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'lean-coffee',
              commandData: {
                title: parsed.args[0],
                topics: [],
                currentTopic: null,
                timePerTopic: 5,
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating lean-coffee:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'user-story-mapping':
        if (parsed.args.length < 1) {
          alert('Uso: /user-story-mapping "Producto o feature"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/user-story-mapping ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'user-story-mapping',
              commandData: {
                title: parsed.args[0],
                activities: [],
                releases: [{ id: 'release-1', title: 'Release 1', color: '#3b82f6' }],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating user-story-mapping:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'fishbone':
        if (parsed.args.length < 1) {
          alert('Uso: /fishbone "Problema a analizar"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/fishbone ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'fishbone',
              commandData: {
                title: parsed.args[0],
                problem: parsed.args[0],
                categories: [
                  { id: 'people', title: 'Personas', icon: '👥', causes: [] },
                  { id: 'process', title: 'Procesos', icon: '⚙️', causes: [] },
                  { id: 'technology', title: 'Tecnología', icon: '💻', causes: [] },
                  { id: 'materials', title: 'Materiales', icon: '📦', causes: [] },
                  { id: 'environment', title: 'Entorno', icon: '🌍', causes: [] },
                  { id: 'measurement', title: 'Medición', icon: '📊', causes: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating fishbone:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'raci':
        if (parsed.args.length < 1) {
          alert('Uso: /raci "Proyecto o iniciativa"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/raci ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'raci',
              commandData: {
                title: parsed.args[0],
                roles: [],
                tasks: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating raci:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'lean-canvas':
        if (parsed.args.length < 1) {
          alert('Uso: /lean-canvas "Nombre del producto"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/lean-canvas ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'lean-canvas',
              commandData: {
                title: parsed.args[0],
                blocks: {
                  problem: { items: [] },
                  customerSegments: { items: [] },
                  uniqueValue: { items: [] },
                  solution: { items: [] },
                  channels: { items: [] },
                  revenueStreams: { items: [] },
                  costStructure: { items: [] },
                  keyMetrics: { items: [] },
                  unfairAdvantage: { items: [] }
                },
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating lean-canvas:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'customer-journey':
        if (parsed.args.length < 1) {
          alert('Uso: /customer-journey "Nombre del cliente"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/customer-journey ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'customer-journey',
              commandData: {
                title: parsed.args[0],
                persona: '',
                stages: [
                  { id: 'awareness', name: 'Descubrimiento', touchpoints: [], emotions: [], painPoints: [], opportunities: [] },
                  { id: 'consideration', name: 'Consideración', touchpoints: [], emotions: [], painPoints: [], opportunities: [] },
                  { id: 'purchase', name: 'Compra', touchpoints: [], emotions: [], painPoints: [], opportunities: [] },
                  { id: 'retention', name: 'Retención', touchpoints: [], emotions: [], painPoints: [], opportunities: [] },
                  { id: 'advocacy', name: 'Recomendación', touchpoints: [], emotions: [], painPoints: [], opportunities: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating customer-journey:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'risk-matrix':
        if (parsed.args.length < 1) {
          alert('Uso: /risk-matrix "Proyecto o iniciativa"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/risk-matrix ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'risk-matrix',
              commandData: {
                title: parsed.args[0],
                risks: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating risk-matrix:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'rice':
        if (parsed.args.length < 1) {
          alert('Uso: /rice "Backlog o lista de features"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/rice ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'rice',
              commandData: {
                title: parsed.args[0],
                items: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating rice:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'working-agreements':
        if (parsed.args.length < 1) {
          alert('Uso: /working-agreements "Nombre del equipo"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/working-agreements ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'working-agreements',
              commandData: {
                title: parsed.args[0],
                categories: [
                  { id: 'communication', title: 'Comunicación', icon: '💬', agreements: [] },
                  { id: 'meetings', title: 'Reuniones', icon: '📅', agreements: [] },
                  { id: 'code', title: 'Código', icon: '💻', agreements: [] },
                  { id: 'collaboration', title: 'Colaboración', icon: '🤝', agreements: [] },
                  { id: 'feedback', title: 'Feedback', icon: '📣', agreements: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating working-agreements:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'brainwriting':
        if (parsed.args.length < 1) {
          alert('Uso: /brainwriting "Tema o reto"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/brainwriting ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'brainwriting',
              commandData: {
                title: parsed.args[0],
                rounds: [],
                currentRound: 0,
                timePerRound: 5,
                ideasPerRound: 3,
                participants: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating brainwriting:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'persona':
        if (parsed.args.length < 1) {
          alert('Uso: /persona "Tipo de usuario"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/persona ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'persona',
              commandData: {
                title: parsed.args[0],
                name: '',
                photo: '',
                demographics: { age: '', occupation: '', location: '', education: '' },
                goals: [],
                frustrations: [],
                motivations: [],
                behaviors: [],
                quote: '',
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating persona:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'assumption-mapping':
        if (parsed.args.length < 1) {
          alert('Uso: /assumption-mapping "Proyecto o hipótesis"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/assumption-mapping ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'assumption-mapping',
              commandData: {
                title: parsed.args[0],
                assumptions: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating assumption-mapping:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'team-canvas':
        if (parsed.args.length < 1) {
          alert('Uso: /team-canvas "Nombre del equipo"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/team-canvas ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'team-canvas',
              commandData: {
                title: parsed.args[0],
                blocks: {
                  people: { items: [] },
                  goals: { items: [] },
                  values: { items: [] },
                  rules: { items: [] },
                  activities: { items: [] },
                  strengths: { items: [] },
                  weaknesses: { items: [] },
                  needs: { items: [] }
                },
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating team-canvas:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'five-whys':
        if (parsed.args.length < 1) {
          alert('Uso: /five-whys "Problema a analizar"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/five-whys ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'five-whys',
              commandData: {
                title: parsed.args[0],
                problem: parsed.args[0],
                whys: [],
                rootCause: '',
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating five-whys:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'impact-effort':
        if (parsed.args.length < 1) {
          alert('Uso: /impact-effort "Lista de opciones"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/impact-effort ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'impact-effort',
              commandData: {
                title: parsed.args[0],
                items: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating impact-effort:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'opportunity-tree':
        if (parsed.args.length < 1) {
          alert('Uso: /opportunity-tree "Objetivo principal"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/opportunity-tree ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'opportunity-tree',
              commandData: {
                title: parsed.args[0],
                objective: parsed.args[0],
                opportunities: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating opportunity-tree:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'lotus-blossom':
        if (parsed.args.length < 1) {
          alert('Uso: /lotus-blossom "Tema central"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/lotus-blossom ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'lotus-blossom',
              commandData: {
                title: parsed.args[0],
                centerIdea: parsed.args[0],
                petals: [
                  { id: 'petal-1', title: 'Pétalo 1', items: [] },
                  { id: 'petal-2', title: 'Pétalo 2', items: [] },
                  { id: 'petal-3', title: 'Pétalo 3', items: [] },
                  { id: 'petal-4', title: 'Pétalo 4', items: [] },
                  { id: 'petal-5', title: 'Pétalo 5', items: [] },
                  { id: 'petal-6', title: 'Pétalo 6', items: [] },
                  { id: 'petal-7', title: 'Pétalo 7', items: [] },
                  { id: 'petal-8', title: 'Pétalo 8', items: [] }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating lotus-blossom:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'inception-deck':
        if (parsed.args.length < 1) {
          alert('Uso: /inception-deck "Nombre del proyecto"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/inception-deck ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'inception-deck',
              commandData: {
                title: parsed.args[0],
                cards: [
                  { id: 'why', title: '¿Por qué estamos aquí?', content: '' },
                  { id: 'elevator', title: 'Elevator Pitch', content: '' },
                  { id: 'product-box', title: 'Product Box', content: '' },
                  { id: 'not-list', title: 'NOT List', inScope: [], outOfScope: [] },
                  { id: 'neighbors', title: 'Conoce a tus vecinos', content: '' },
                  { id: 'solution', title: 'Muestra la solución', content: '' },
                  { id: 'risks', title: '¿Qué nos quita el sueño?', items: [] },
                  { id: 'size', title: 'Tamaño', content: '' },
                  { id: 'tradeoffs', title: 'Trade-offs', items: [] },
                  { id: 'cost', title: '¿Cuánto va a costar?', content: '' }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating inception-deck:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'delegation-poker':
        if (parsed.args.length < 1) {
          alert('Uso: /delegation-poker "Decisión o área"');
          return;
        }
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/delegation-poker ${commandText.substring(commandText.indexOf(' ') + 1)}`,
              channelId: selectedChannelId,
              commandType: 'delegation-poker',
              commandData: {
                title: parsed.args[0],
                decisions: [],
                levels: [
                  { id: 1, name: 'Tell', description: 'Yo decido y les informo' },
                  { id: 2, name: 'Sell', description: 'Yo decido y les convenzo' },
                  { id: 3, name: 'Consult', description: 'Les consulto y luego decido' },
                  { id: 4, name: 'Agree', description: 'Decidimos juntos' },
                  { id: 5, name: 'Advise', description: 'Ellos deciden y yo aconsejo' },
                  { id: 6, name: 'Inquire', description: 'Ellos deciden y me informan' },
                  { id: 7, name: 'Delegate', description: 'Ellos deciden completamente' }
                ],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating delegation-poker:', error);
        } finally {
          setSending(false);
        }
        setNewMessage('');
        break;

      case 'moving-motivators':
        if (sending) return;
        try {
          setSending(true);
          const response = await fetch(`/api/projects/${projectId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `/moving-motivators`,
              channelId: selectedChannelId,
              commandType: 'moving-motivators',
              commandData: {
                title: 'Moving Motivators',
                motivators: [
                  { id: 'curiosity', name: 'Curiosidad', icon: '🔍' },
                  { id: 'honor', name: 'Honor', icon: '🏆' },
                  { id: 'acceptance', name: 'Aceptación', icon: '🤝' },
                  { id: 'mastery', name: 'Maestría', icon: '🎯' },
                  { id: 'power', name: 'Poder', icon: '👑' },
                  { id: 'freedom', name: 'Libertad', icon: '🦅' },
                  { id: 'relatedness', name: 'Relación', icon: '❤️' },
                  { id: 'order', name: 'Orden', icon: '📋' },
                  { id: 'goal', name: 'Meta', icon: '🎪' },
                  { id: 'status', name: 'Estatus', icon: '⭐' }
                ],
                rankings: [],
                createdBy: session?.user?.id,
                closed: false
              }
            })
          });
          if (response.ok) {
            const msg = await response.json();
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error creating moving-motivators:', error);
        } finally {
          setSending(false);
        }
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
    <div className="flex flex-col h-[800px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSemanticResults(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.length >= 3) {
                  performSemanticSearch();
                }
              }}
              placeholder="Buscar mensajes... (contenido, usuario, o usa IA)"
              className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSemanticResults(false);
                  setSemanticResults([]);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {/* Semantic Search Button */}
          <button
            onClick={performSemanticSearch}
            disabled={searchQuery.length < 3 || semanticSearching}
            title="Búsqueda semántica con IA (busca por concepto, no solo palabras)"
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition ${
              searchQuery.length >= 3
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {semanticSearching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Brain size={16} />
            )}
            <span className="hidden sm:inline">IA</span>
          </button>
        </div>

        {/* Regular search results count */}
        {debouncedSearchQuery && !showSemanticResults && (
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'} encontrados
          </div>
        )}

        {/* Semantic Search Results Panel */}
        {showSemanticResults && (
          <div className="mt-2 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Búsqueda Semántica con IA
                </span>
              </div>
              <button
                onClick={() => setShowSemanticResults(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {semanticSearching ? (
              <div className="flex items-center gap-2 py-4 justify-center text-gray-500 dark:text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                <span>Analizando contenido con IA...</span>
              </div>
            ) : semanticResults.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {semanticResults.map((result, idx) => (
                  <div
                    key={result._id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition cursor-pointer"
                    onClick={() => {
                      setShowSemanticResults(false);
                      setSemanticSearchMode(false);
                      setSearchQuery('');
                      // Scroll to the message in the chat
                      scrollToMessage(result._id);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            {result.commandType}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {result.createdBy} · {new Date(result.createdAt).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {result.preview}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Brain size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron resultados semánticamente relevantes</p>
                <p className="text-xs mt-1">Intenta con otra consulta o términos diferentes</p>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Búsqueda por concepto usando Groq AI
            </p>
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
          messages.map((message, index) => {
            const isOwn = message.userId._id === session?.user.id && message.userId._id !== 'deleted';
            const reactionSummary = getReactionSummary(message.reactions);

            // Check if this is the first unread message (show "New Messages" divider)
            const isFirstUnread = readMarker.lastReadAt &&
              new Date(message.createdAt) > new Date(readMarker.lastReadAt) &&
              (index === 0 || new Date(messages[index - 1].createdAt) <= new Date(readMarker.lastReadAt));

            return (
              <div
                key={message._id}
                id={`message-${message._id}`}
                className={`transition-all duration-500 rounded-lg ${
                  highlightedMessageId === message._id
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-400 dark:ring-yellow-500'
                    : ''
                }`}
              >
                {/* New Messages Divider */}
                {isFirstUnread && unreadCount > 0 && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-red-400 dark:bg-red-500"></div>
                    <span className="text-xs font-medium text-red-500 dark:text-red-400 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-full">
                      {unreadCount} mensaje{unreadCount !== 1 ? 's' : ''} nuevo{unreadCount !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-red-400 dark:bg-red-500"></div>
                  </div>
                )}

                <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
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
                <div className={`flex-1 max-w-5xl ${isOwn ? 'items-end' : ''}`}>
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
                        channelId={selectedChannelId || ''}
                        question={message.commandData.question}
                        options={message.commandData.options || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        topic={message.commandData.topic}
                        ideas={message.commandData.ideas || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        question={message.commandData.question}
                        options={message.commandData.options || []}
                        totalDotsPerUser={message.commandData.totalDotsPerUser || 5}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        question={message.commandData.question}
                        options={message.commandData.options || []}
                        createdBy={message.commandData.createdBy}
                        revealed={message.commandData.revealed || false}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        nodes={message.commandData.nodes || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                  ) : message.commandType === 'whiteboard' && message.commandData ? (
                    /* Render Whiteboard Command */
                    <div className="relative group">
                      <WhiteboardCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title || 'Pizarra'}
                        whiteboardId={message.commandData.whiteboardId}
                        createdBy={message.commandData.createdBy || message.userId._id}
                        createdByName={message.commandData.createdByName || message.userId.name}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Whiteboard */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar pizarra"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (message.commandType === 'rose-bud-thorn' || message.commandType === 'sailboat' ||
                       message.commandType === 'start-stop-continue' || message.commandType === 'swot' ||
                       message.commandType === 'soar' || message.commandType === 'six-hats' ||
                       message.commandType === 'crazy-8s' || message.commandType === 'affinity-map' ||
                       message.commandType === 'scamper' || message.commandType === 'starbursting' ||
                       message.commandType === 'reverse-brainstorm' || message.commandType === 'worst-idea' ||
                       message.commandType === 'empathy-map' || message.commandType === 'moscow' ||
                       message.commandType === '4ls' || message.commandType === 'pre-mortem' ||
                       message.commandType === 'starfish' || message.commandType === 'mad-sad-glad' ||
                       message.commandType === 'how-might-we' || message.commandType === 'hot-air-balloon' ||
                       message.commandType === 'kalm') &&
                       message.commandData ? (
                    /* Render Retro Command */
                    <div className="relative group">
                      <RetroCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        sections={message.commandData.sections || []}
                        type={message.commandType as any}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        icon={
                          message.commandType === 'rose-bud-thorn' ? <Flower2 className="text-white" size={20} /> :
                          message.commandType === 'sailboat' ? <Ship className="text-white" size={20} /> :
                          message.commandType === 'start-stop-continue' ? <PlayCircle className="text-white" size={20} /> :
                          message.commandType === 'soar' ? <span className="text-white text-xl">🚀</span> :
                          message.commandType === 'six-hats' ? <span className="text-white text-xl">🎩</span> :
                          message.commandType === 'crazy-8s' ? <span className="text-white text-xl">🎨</span> :
                          message.commandType === 'affinity-map' ? <span className="text-white text-xl">📌</span> :
                          message.commandType === 'scamper' ? <span className="text-white text-xl">🔄</span> :
                          message.commandType === 'starbursting' ? <span className="text-white text-xl">⭐</span> :
                          message.commandType === 'reverse-brainstorm' ? <span className="text-white text-xl">🔀</span> :
                          message.commandType === 'worst-idea' ? <span className="text-white text-xl">👎</span> :
                          message.commandType === 'empathy-map' ? <span className="text-white text-xl">💭</span> :
                          message.commandType === 'moscow' ? <span className="text-white text-xl">📋</span> :
                          message.commandType === '4ls' ? <span className="text-white text-xl">4️⃣</span> :
                          message.commandType === 'pre-mortem' ? <span className="text-white text-xl">💀</span> :
                          message.commandType === 'starfish' ? <span className="text-white text-xl">⭐</span> :
                          message.commandType === 'mad-sad-glad' ? <span className="text-white text-xl">😊</span> :
                          message.commandType === 'how-might-we' ? <span className="text-white text-xl">💡</span> :
                          message.commandType === 'hot-air-balloon' ? <span className="text-white text-xl">🎈</span> :
                          message.commandType === 'kalm' ? <span className="text-white text-xl">🧘</span> :
                          <Target className="text-white" size={20} />
                        }
                        gradient={
                          message.commandType === 'rose-bud-thorn' ? 'from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'sailboat' ? 'from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'start-stop-continue' ? 'from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'soar' ? 'from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'six-hats' ? 'from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'crazy-8s' ? 'from-fuchsia-50 to-pink-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'affinity-map' ? 'from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'scamper' ? 'from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'starbursting' ? 'from-yellow-50 to-amber-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'reverse-brainstorm' ? 'from-rose-50 to-red-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'worst-idea' ? 'from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'empathy-map' ? 'from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'moscow' ? 'from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === '4ls' ? 'from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'pre-mortem' ? 'from-gray-50 to-zinc-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'starfish' ? 'from-cyan-50 to-teal-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'mad-sad-glad' ? 'from-red-50 to-green-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'how-might-we' ? 'from-yellow-50 to-lime-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'hot-air-balloon' ? 'from-sky-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900' :
                          message.commandType === 'kalm' ? 'from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900' :
                          'from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900'
                        }
                        border={
                          message.commandType === 'rose-bud-thorn' ? 'border-pink-400 dark:border-pink-600' :
                          message.commandType === 'sailboat' ? 'border-blue-400 dark:border-blue-600' :
                          message.commandType === 'start-stop-continue' ? 'border-green-400 dark:border-green-600' :
                          message.commandType === 'soar' ? 'border-teal-400 dark:border-teal-600' :
                          message.commandType === 'six-hats' ? 'border-slate-400 dark:border-slate-600' :
                          message.commandType === 'crazy-8s' ? 'border-fuchsia-400 dark:border-fuchsia-600' :
                          message.commandType === 'affinity-map' ? 'border-amber-400 dark:border-amber-600' :
                          message.commandType === 'scamper' ? 'border-red-400 dark:border-red-600' :
                          message.commandType === 'starbursting' ? 'border-yellow-400 dark:border-yellow-600' :
                          message.commandType === 'reverse-brainstorm' ? 'border-rose-400 dark:border-rose-600' :
                          message.commandType === 'worst-idea' ? 'border-gray-400 dark:border-gray-600' :
                          message.commandType === 'empathy-map' ? 'border-violet-400 dark:border-violet-600' :
                          message.commandType === 'moscow' ? 'border-red-400 dark:border-red-600' :
                          message.commandType === '4ls' ? 'border-blue-400 dark:border-blue-600' :
                          message.commandType === 'pre-mortem' ? 'border-gray-400 dark:border-gray-600' :
                          message.commandType === 'starfish' ? 'border-cyan-400 dark:border-cyan-600' :
                          message.commandType === 'mad-sad-glad' ? 'border-red-400 dark:border-red-600' :
                          message.commandType === 'how-might-we' ? 'border-yellow-400 dark:border-yellow-600' :
                          message.commandType === 'hot-air-balloon' ? 'border-sky-400 dark:border-sky-600' :
                          message.commandType === 'kalm' ? 'border-emerald-400 dark:border-emerald-600' :
                          'border-purple-400 dark:border-purple-600'
                        }
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        question={message.commandData.question}
                        votes={message.commandData.votes || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                  ) : message.commandType === 'parking-lot' && message.commandData ? (
                    /* Render Parking Lot Command */
                    <div className="relative group">
                      <ParkingLotCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        items={message.commandData.items || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Parking Lot */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar parking lot"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'kudos-wall' && message.commandData ? (
                    /* Render Kudos Wall Command */
                    <div className="relative group">
                      <KudosWallCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        kudos={message.commandData.kudos || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Kudos Wall */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar kudos wall"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'icebreaker' && message.commandData ? (
                    /* Render Icebreaker Command */
                    <div className="relative group">
                      <IcebreakerCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        question={message.commandData.question}
                        responses={message.commandData.responses || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Icebreaker */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar icebreaker"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'action-items' && message.commandData ? (
                    /* Render Action Items Command */
                    <div className="relative group">
                      <ActionItemsCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        items={message.commandData.items || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Action Items */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar action items"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'team-health' && message.commandData ? (
                    /* Render Team Health Command */
                    <div className="relative group">
                      <TeamHealthCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        areas={message.commandData.areas || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Team Health */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar team health"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'confidence-vote' && message.commandData ? (
                    /* Render Confidence Vote Command */
                    <div className="relative group">
                      <ConfidenceVoteCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        question={message.commandData.question}
                        votes={message.commandData.votes || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Confidence Vote */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar voto de confianza"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'pomodoro' && message.commandData ? (
                    /* Render Pomodoro Command */
                    <div className="relative group">
                      <PomodoroCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        workMinutes={message.commandData.workMinutes}
                        breakMinutes={message.commandData.breakMinutes}
                        sessionsCompleted={message.commandData.sessionsCompleted}
                        isRunning={message.commandData.isRunning}
                        isPaused={message.commandData.isPaused}
                        isBreak={message.commandData.isBreak}
                        timeRemaining={message.commandData.timeRemaining}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Pomodoro */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar pomodoro"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'agenda' && message.commandData ? (
                    /* Render Agenda Command */
                    <div className="relative group">
                      <AgendaCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        items={message.commandData.items || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Agenda */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar agenda"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'capacity' && message.commandData ? (
                    /* Render Capacity Command */
                    <div className="relative group">
                      <CapacityCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        members={message.commandData.members || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Capacity */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar capacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'dependency-map' && message.commandData ? (
                    /* Render Dependency Map Command */
                    <div className="relative group">
                      <DependencyMapCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        tasks={message.commandData.tasks || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Dependency Map */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar mapa de dependencias"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'okr' && message.commandData ? (
                    /* Render OKR Command */
                    <div className="relative group">
                      <OKRCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        objectives={message.commandData.objectives || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for OKR */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar OKR"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'roadmap' && message.commandData ? (
                    /* Render Roadmap Command */
                    <div className="relative group">
                      <RoadmapCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        milestones={message.commandData.milestones || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {/* Actions Menu for Roadmap */}
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar roadmap"
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
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        options={message.commandData.options || []}
                        criteria={message.commandData.criteria || []}
                        cells={message.commandData.cells || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        topic={message.commandData.topic}
                        estimates={message.commandData.estimates || []}
                        revealed={message.commandData.revealed || false}
                        finalEstimate={message.commandData.finalEstimate}
                        closed={message.commandData.closed || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        items={message.commandData.items || []}
                        closed={message.commandData.closed || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        onUpdate={() => {}}
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
                        onUpdate={() => {}}
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
                        onUpdate={() => {}}
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
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        question={message.commandData.question}
                        moods={message.commandData.moods || []}
                        closed={message.commandData.closed || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        onUpdate={() => {}}
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
                        channelId={selectedChannelId || ''}
                        question={message.commandData.question}
                        options={message.commandData.options || []}
                        rankings={message.commandData.rankings || []}
                        closed={message.commandData.closed || false}
                        createdBy={message.commandData.createdBy}
                        onClose={() => {}}
                        onUpdate={() => {}}
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
                        onUpdate={() => {}}
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
                  ) : message.commandType === 'risk-matrix' && message.commandData ? (
                    <div className="relative group">
                      <RiskMatrixCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        risks={message.commandData.risks || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'rice' && message.commandData ? (
                    <div className="relative group">
                      <RICECommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        items={message.commandData.items || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'lean-canvas' && message.commandData ? (
                    <div className="relative group">
                      <LeanCanvasCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        blocks={message.commandData.blocks || {}}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'customer-journey' && message.commandData ? (
                    <div className="relative group">
                      <CustomerJourneyCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        persona={message.commandData.persona || ''}
                        stages={message.commandData.stages || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'lean-coffee' && message.commandData ? (
                    <div className="relative group">
                      <LeanCoffeeCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        topics={message.commandData.topics || []}
                        currentTopic={message.commandData.currentTopic}
                        timePerTopic={message.commandData.timePerTopic || 5}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'user-story-mapping' && message.commandData ? (
                    <div className="relative group">
                      <UserStoryMappingCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        activities={message.commandData.activities || []}
                        releases={message.commandData.releases || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'fishbone' && message.commandData ? (
                    <div className="relative group">
                      <FishboneCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        problem={message.commandData.problem || ''}
                        categories={message.commandData.categories || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'raci' && message.commandData ? (
                    <div className="relative group">
                      <RACICommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        roles={message.commandData.roles || []}
                        tasks={message.commandData.tasks || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'roman-voting' && message.commandData ? (
                    <div className="relative group">
                      <RomanVotingCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        question={message.commandData.question || message.commandData.title}
                        votes={message.commandData.votes || []}
                        revealed={message.commandData.revealed || false}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'working-agreements' && message.commandData ? (
                    <div className="relative group">
                      <WorkingAgreementsCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        categories={message.commandData.categories || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'brainwriting' && message.commandData ? (
                    <div className="relative group">
                      <BrainwritingCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        rounds={message.commandData.rounds || []}
                        currentRound={message.commandData.currentRound || 0}
                        timePerRound={message.commandData.timePerRound || 5}
                        ideasPerRound={message.commandData.ideasPerRound || 3}
                        participants={message.commandData.participants || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'persona' && message.commandData ? (
                    <div className="relative group">
                      <PersonaCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        name={message.commandData.name || ''}
                        photo={message.commandData.photo || ''}
                        demographics={message.commandData.demographics || {}}
                        goals={message.commandData.goals || []}
                        frustrations={message.commandData.frustrations || []}
                        motivations={message.commandData.motivations || []}
                        behaviors={message.commandData.behaviors || []}
                        quote={message.commandData.quote || ''}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'assumption-mapping' && message.commandData ? (
                    <div className="relative group">
                      <AssumptionMappingCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        assumptions={message.commandData.assumptions || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'team-canvas' && message.commandData ? (
                    <div className="relative group">
                      <TeamCanvasCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        blocks={message.commandData.blocks || {}}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'five-whys' && message.commandData ? (
                    <div className="relative group">
                      <FiveWhysCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        problem={message.commandData.problem || ''}
                        whys={message.commandData.whys || []}
                        rootCause={message.commandData.rootCause || ''}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'impact-effort' && message.commandData ? (
                    <div className="relative group">
                      <ImpactEffortCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        items={message.commandData.items || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'opportunity-tree' && message.commandData ? (
                    <div className="relative group">
                      <OpportunityTreeCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        objective={message.commandData.objective || ''}
                        opportunities={message.commandData.opportunities || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'lotus-blossom' && message.commandData ? (
                    <div className="relative group">
                      <LotusBlossomCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        centerIdea={message.commandData.centerIdea || ''}
                        petals={message.commandData.petals || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'inception-deck' && message.commandData ? (
                    <div className="relative group">
                      <InceptionDeckCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        cards={message.commandData.cards || []}
                        currentCardIndex={message.commandData.currentCardIndex || 0}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'delegation-poker' && message.commandData ? (
                    <div className="relative group">
                      <DelegationPokerCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        topics={message.commandData.topics || []}
                        currentTopicIndex={message.commandData.currentTopicIndex || 0}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : message.commandType === 'moving-motivators' && message.commandData ? (
                    <div className="relative group">
                      <MovingMotivatorsCommand
                        projectId={projectId}
                        messageId={message._id}
                        channelId={selectedChannelId || ''}
                        title={message.commandData.title}
                        context={message.commandData.context}
                        rankings={message.commandData.rankings || []}
                        createdBy={message.commandData.createdBy}
                        closed={message.commandData.closed || false}
                        onClose={() => {}}
                        onUpdate={() => {}}
                      />
                      {!message.isDeleted && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition z-10">
                          {(message.userId._id === session?.user.id || session?.user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-lg"
                              title="Eliminar"
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

                      {/* Voice Message */}
                      {message.voiceMessage && (
                        <div className="mt-2">
                          <VoicePlayer
                            projectId={projectId}
                            r2Key={message.voiceMessage.r2Key}
                            duration={message.voiceMessage.duration}
                            mimeType={message.voiceMessage.mimeType}
                            waveform={message.voiceMessage.waveform}
                            transcription={message.voiceMessage.transcription}
                            messageId={message._id}
                          />
                        </div>
                      )}

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

        {/* Voice Recorder */}
        {showVoiceRecorder ? (
          <VoiceRecorder
            projectId={projectId}
            onSend={handleSendVoiceMessage}
            onCancel={() => setShowVoiceRecorder(false)}
            disabled={sending}
          />
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              disabled={!selectedChannelId}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
              title="Adjuntar archivo"
            >
              <Paperclip size={18} />
            </button>
            <button
              onClick={() => setShowVoiceRecorder(true)}
              disabled={!selectedChannelId || sending}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
              title="Grabar mensaje de voz"
            >
              <Mic size={18} />
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
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span className="font-medium">Enter</span> para enviar • <span className="font-medium">Shift+Enter</span> para nueva línea • <span className="font-medium">Ctrl+V</span> para pegar imágenes • <span className="font-medium">🎤</span> para mensaje de voz
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

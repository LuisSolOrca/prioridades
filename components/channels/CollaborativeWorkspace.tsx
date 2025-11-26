'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getPusherClient } from '@/lib/pusher-client';
import type { PresenceChannel } from 'pusher-js';
import { Loader2, Zap, History, Hash, ChevronRight, FileText, Sparkles } from 'lucide-react';
import DynamicsMenu from './DynamicsMenu';
import DynamicCard from './DynamicCard';
import DynamicFullscreen from './DynamicFullscreen';
import GenerateDocumentModal from './GenerateDocumentModal';

// Dynamic command types for filtering
const DYNAMIC_COMMAND_TYPES = [
  'poll', 'dot-voting', 'blind-vote', 'fist-of-five', 'confidence-vote', 'nps',
  'brainstorm', 'mind-map', 'pros-cons', 'decision-matrix', 'ranking',
  'retrospective', 'retro', 'team-health', 'mood',
  'action-items', 'checklist', 'agenda', 'parking-lot', 'pomodoro', 'estimation-poker',
  'kudos-wall', 'icebreaker', 'inception-deck', 'delegation-poker', 'moving-motivators',
  'swot', 'soar', 'six-hats', 'crazy-8s', 'affinity-map',
  'rose-bud-thorn', 'sailboat', 'start-stop-continue', 'standup',
  'scamper', 'starbursting', 'reverse-brainstorm', 'worst-idea', 'lotus-blossom',
  'five-whys', 'impact-effort', 'opportunity-tree'
];

interface DynamicMessage {
  _id: string;
  projectId: string;
  channelId: string;
  commandType: string;
  commandData: any;
  userId: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface OnlineUser {
  id: string;
  info: {
    name: string;
    email: string;
  };
}

interface Channel {
  _id: string;
  name: string;
  description?: string;
}

interface CollaborativeWorkspaceProps {
  projectId: string;
}

export default function CollaborativeWorkspace({ projectId }: CollaborativeWorkspaceProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const { data: session } = useSession();
  const [dynamics, setDynamics] = useState<DynamicMessage[]>([]);
  const [activeDynamic, setActiveDynamic] = useState<DynamicMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // Flatten hierarchical channels into a flat list
  const flattenChannels = (channels: any[]): Channel[] => {
    const result: Channel[] = [];
    const processChannel = (channel: any) => {
      result.push({
        _id: channel._id,
        name: channel.name,
        description: channel.description
      });
      if (channel.children && channel.children.length > 0) {
        channel.children.forEach(processChannel);
      }
    };
    channels.forEach(processChannel);
    return result;
  };

  // Load channels
  const loadChannels = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/channels`);
      if (response.ok) {
        const data = await response.json();
        const flatChannels = flattenChannels(data.channels || []);
        setChannels(flatChannels);
        // Auto-select first channel if available
        if (flatChannels.length > 0 && !selectedChannelId) {
          setSelectedChannelId(flatChannels[0]._id);
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Load dynamics from API
  const loadDynamics = async () => {
    if (!selectedChannelId) return;
    try {
      const response = await fetch(
        `/api/projects/${projectId}/messages?channelId=${selectedChannelId}&isDynamic=true`
      );
      if (response.ok) {
        const data = await response.json();
        setDynamics(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading dynamics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, [projectId]);

  // Load dynamics when channel selected
  useEffect(() => {
    if (selectedChannelId) {
      setLoading(true);
      loadDynamics();
    }
  }, [selectedChannelId, projectId]);

  // Pusher subscription for real-time updates
  useEffect(() => {
    if (!selectedChannelId) return;

    const pusher = getPusherClient();
    const channelName = `presence-channel-${selectedChannelId}`;
    const channel = pusher.subscribe(channelName) as PresenceChannel;

    // New message event
    channel.bind('new-message', (newMsg: DynamicMessage) => {
      if (DYNAMIC_COMMAND_TYPES.includes(newMsg.commandType)) {
        setDynamics((prev) => {
          if (prev.some((d) => d._id === newMsg._id)) return prev;
          return [newMsg, ...prev];
        });
      }
    });

    // Message updated event
    channel.bind('message-updated', (updatedMsg: DynamicMessage) => {
      if (DYNAMIC_COMMAND_TYPES.includes(updatedMsg.commandType)) {
        setDynamics((prev) =>
          prev.map((d) => (d._id === updatedMsg._id ? updatedMsg : d))
        );
        // Update active dynamic if it's the one being updated
        if (activeDynamic && activeDynamic._id === updatedMsg._id) {
          setActiveDynamic(updatedMsg);
        }
      }
    });

    // Presence events
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const membersList: OnlineUser[] = [];
      members.each((member: any) => {
        membersList.push({ id: member.id, info: member.info });
      });
      setOnlineUsers(membersList);
    });

    channel.bind('pusher:member_added', (member: any) => {
      setOnlineUsers((prev) => {
        if (prev.some((m) => m.id === member.id)) return prev;
        return [...prev, { id: member.id, info: member.info }];
      });
    });

    channel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers((prev) => prev.filter((m) => m.id !== member.id));
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [selectedChannelId, activeDynamic]);

  // Create new dynamic
  const handleCreateDynamic = async (type: string, title: string, options?: string[], criteria?: string[]) => {
    if (!session?.user || !selectedChannelId) return;

    setCreating(true);
    try {
      // Build initial commandData based on type
      const commandData = buildInitialCommandData(type, title, session.user.id, options, criteria);

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `/${type} "${title}"`,
          channelId: selectedChannelId,
          commandType: type,
          commandData
        })
      });

      if (response.ok) {
        const newDynamic = await response.json();
        setDynamics((prev) => [newDynamic, ...prev]);
        setActiveDynamic(newDynamic);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear dinámica');
      }
    } catch (error) {
      console.error('Error creating dynamic:', error);
      alert('Error al crear dinámica');
    } finally {
      setCreating(false);
    }
  };

  // Build initial commandData for each type
  const buildInitialCommandData = (type: string, title: string, userId: string, options?: string[], criteria?: string[]) => {
    const base = { title, createdBy: userId, closed: false };

    // Format options for poll-type dynamics (with votes array)
    const formattedOptions = options?.map(text => ({ text, votes: [] })) || [];
    // Format options for dot-voting (with dots array)
    const dotVotingOptions = options?.map(text => ({ text, dots: [] })) || [];

    switch (type) {
      case 'poll':
        return { ...base, question: title, options: formattedOptions };
      case 'dot-voting':
        return { ...base, question: title, options: dotVotingOptions, totalDotsPerUser: 5 };
      case 'blind-vote':
        return { ...base, question: title, options: formattedOptions, revealed: false };
      case 'brainstorm':
        return { ...base, topic: title, ideas: [] };
      case 'mind-map':
        return { ...base, nodes: [] };
      case 'decision-matrix':
        return { ...base, options: options || [], criteria: criteria || [], cells: [] };
      case 'action-items':
        return { ...base, items: [] };
      case 'team-health':
        return {
          ...base,
          areas: [
            { id: '1', name: 'Colaboración', votes: [] },
            { id: '2', name: 'Comunicación', votes: [] },
            { id: '3', name: 'Herramientas', votes: [] },
            { id: '4', name: 'Procesos', votes: [] },
            { id: '5', name: 'Bienestar', votes: [] }
          ]
        };
      case 'confidence-vote':
        return { ...base, question: title, votes: [] };
      case 'agenda':
        return { ...base, items: [] };
      case 'parking-lot':
        return { ...base, items: [] };
      case 'kudos-wall':
        return { ...base, kudos: [] };
      case 'pomodoro':
        return { ...base, workMinutes: 25, breakMinutes: 5, isRunning: false, isPaused: false, timeRemaining: 25 * 60, isBreak: false, sessionsCompleted: 0 };
      case 'fist-of-five':
        return { ...base, question: title, votes: [] };
      case 'nps':
        return { ...base, question: title, votes: [] };
      case 'mood':
        return { ...base, question: title, moods: [] };
      case 'pros-cons':
        return { ...base, pros: [], cons: [] };
      case 'ranking':
        return { ...base, question: title, options: options || [], rankings: [] };
      case 'checklist':
        return { ...base, items: [] };
      case 'estimation-poker':
        return { ...base, topic: title, estimates: [], revealed: false };
      case 'retrospective':
        return { ...base, items: [] };
      case 'retro':
        return {
          ...base,
          type: 'rose-bud-thorn',
          sections: [
            { id: '1', title: 'Rosas', icon: '🌹', color: 'bg-pink-100', items: [] },
            { id: '2', title: 'Brotes', icon: '🌱', color: 'bg-green-100', items: [] },
            { id: '3', title: 'Espinas', icon: '🌵', color: 'bg-orange-100', items: [] }
          ]
        };
      case 'icebreaker':
        return { ...base, question: title, responses: [] };
      case 'inception-deck':
        return {
          ...base,
          currentCardIndex: 0,
          cards: [
            { id: '1', title: '¿Por qué estamos aquí?', question: '¿Cuál es el propósito principal de este proyecto?', description: 'Define la razón de ser del proyecto y qué problema resuelve.', icon: 'target', color: 'bg-blue-500', responses: [], completed: false },
            { id: '2', title: 'Elevator Pitch', question: 'Resume el proyecto en 30 segundos', description: 'Para [cliente objetivo] que [necesidad], el [producto] es un [categoría] que [beneficio clave].', icon: 'rocket', color: 'bg-purple-500', responses: [], completed: false },
            { id: '3', title: 'Caja del Producto', question: '¿Cómo venderías este producto?', description: 'Diseña la "caja" del producto: nombre, eslogan, 3 beneficios principales.', icon: 'package', color: 'bg-pink-500', responses: [], completed: false },
            { id: '4', title: 'Lista de NO', question: '¿Qué NO vamos a hacer?', description: 'Define claramente qué está fuera del alcance.', icon: 'x', color: 'bg-red-500', responses: [], completed: false },
            { id: '5', title: 'Conoce a tus Vecinos', question: '¿Quiénes son los stakeholders?', description: 'Identifica a todas las personas y equipos involucrados.', icon: 'users', color: 'bg-green-500', responses: [], completed: false },
            { id: '6', title: 'Muestra la Solución', question: '¿Cómo se ve la arquitectura?', description: 'Dibuja un diagrama de alto nivel de la solución.', icon: 'layers', color: 'bg-indigo-500', responses: [], completed: false },
            { id: '7', title: '¿Qué nos quita el sueño?', question: '¿Cuáles son los mayores riesgos?', description: 'Identifica los riesgos que podrían hacer fracasar el proyecto.', icon: 'alert', color: 'bg-orange-500', responses: [], completed: false },
            { id: '8', title: 'Tamaño del Proyecto', question: '¿Qué tan grande es esto?', description: 'Estima el tamaño: ¿semanas, meses? ¿Cuántas personas?', icon: 'clock', color: 'bg-teal-500', responses: [], completed: false },
            { id: '9', title: '¿Qué vamos a sacrificar?', question: 'Tiempo, Alcance, Presupuesto, Calidad - ¿qué es negociable?', description: 'Define las prioridades y qué estamos dispuestos a ceder.', icon: 'target', color: 'bg-yellow-500', responses: [], completed: false },
            { id: '10', title: '¿Cuánto va a costar?', question: '¿Cuál es la inversión necesaria?', description: 'Estima el costo en tiempo, dinero y recursos.', icon: 'dollar', color: 'bg-emerald-500', responses: [], completed: false }
          ]
        };
      case 'delegation-poker':
        return {
          ...base,
          currentTopicIndex: 0,
          topics: [
            { id: '1', title: title, votes: [], revealed: false }
          ]
        };
      case 'moving-motivators':
        return {
          ...base,
          context: '',
          rankings: []
        };
      case 'swot':
        return {
          ...base,
          sections: [
            { id: 'strengths', title: 'Fortalezas', icon: '💪', color: '#10b981', items: [] },
            { id: 'weaknesses', title: 'Debilidades', icon: '⚠️', color: '#f59e0b', items: [] },
            { id: 'opportunities', title: 'Oportunidades', icon: '🎯', color: '#3b82f6', items: [] },
            { id: 'threats', title: 'Amenazas', icon: '⚡', color: '#ef4444', items: [] }
          ]
        };
      case 'soar':
        return {
          ...base,
          sections: [
            { id: 'strengths', title: 'Fortalezas', icon: '💪', color: '#10b981', items: [] },
            { id: 'opportunities', title: 'Oportunidades', icon: '🎯', color: '#3b82f6', items: [] },
            { id: 'aspirations', title: 'Aspiraciones', icon: '✨', color: '#8b5cf6', items: [] },
            { id: 'results', title: 'Resultados', icon: '🏆', color: '#f59e0b', items: [] }
          ]
        };
      case 'six-hats':
        return {
          ...base,
          sections: [
            { id: 'white', title: 'Blanco (Hechos)', icon: '⚪', color: '#e5e7eb', items: [] },
            { id: 'red', title: 'Rojo (Emociones)', icon: '🔴', color: '#ef4444', items: [] },
            { id: 'black', title: 'Negro (Crítica)', icon: '⚫', color: '#1f2937', items: [] },
            { id: 'yellow', title: 'Amarillo (Beneficios)', icon: '🟡', color: '#eab308', items: [] },
            { id: 'green', title: 'Verde (Creatividad)', icon: '🟢', color: '#22c55e', items: [] },
            { id: 'blue', title: 'Azul (Control)', icon: '🔵', color: '#3b82f6', items: [] }
          ]
        };
      case 'crazy-8s':
        return {
          ...base,
          sections: [
            { id: 'idea1', title: 'Idea 1', icon: '1️⃣', color: '#ef4444', items: [] },
            { id: 'idea2', title: 'Idea 2', icon: '2️⃣', color: '#f59e0b', items: [] },
            { id: 'idea3', title: 'Idea 3', icon: '3️⃣', color: '#eab308', items: [] },
            { id: 'idea4', title: 'Idea 4', icon: '4️⃣', color: '#84cc16', items: [] },
            { id: 'idea5', title: 'Idea 5', icon: '5️⃣', color: '#10b981', items: [] },
            { id: 'idea6', title: 'Idea 6', icon: '6️⃣', color: '#06b6d4', items: [] },
            { id: 'idea7', title: 'Idea 7', icon: '7️⃣', color: '#3b82f6', items: [] },
            { id: 'idea8', title: 'Idea 8', icon: '8️⃣', color: '#8b5cf6', items: [] }
          ]
        };
      case 'affinity-map':
        return {
          ...base,
          sections: [
            { id: 'group-a', title: 'Grupo A', icon: '🅰️', color: '#3b82f6', items: [] },
            { id: 'group-b', title: 'Grupo B', icon: '🅱️', color: '#10b981', items: [] },
            { id: 'group-c', title: 'Grupo C', icon: '©️', color: '#f59e0b', items: [] },
            { id: 'ungrouped', title: 'Sin Agrupar', icon: '📝', color: '#6b7280', items: [] }
          ]
        };
      case 'rose-bud-thorn':
        return {
          ...base,
          sections: [
            { id: 'rose', title: 'Rosas', icon: '🌹', color: '#ec4899', items: [] },
            { id: 'bud', title: 'Brotes', icon: '🌱', color: '#10b981', items: [] },
            { id: 'thorn', title: 'Espinas', icon: '🌵', color: '#f59e0b', items: [] }
          ]
        };
      case 'sailboat':
        return {
          ...base,
          sections: [
            { id: 'wind', title: 'Viento (Impulso)', icon: '💨', color: '#06b6d4', items: [] },
            { id: 'anchor', title: 'Ancla (Freno)', icon: '⚓', color: '#6b7280', items: [] },
            { id: 'rocks', title: 'Rocas (Riesgos)', icon: '🪨', color: '#ef4444', items: [] },
            { id: 'island', title: 'Isla (Meta)', icon: '🏝️', color: '#10b981', items: [] }
          ]
        };
      case 'start-stop-continue':
        return {
          ...base,
          sections: [
            { id: 'start', title: 'Empezar', icon: '🟢', color: '#10b981', items: [] },
            { id: 'stop', title: 'Parar', icon: '🔴', color: '#ef4444', items: [] },
            { id: 'continue', title: 'Continuar', icon: '🟡', color: '#eab308', items: [] }
          ]
        };
      case 'standup':
        return {
          ...base,
          question: title,
          entries: []
        };
      // Nuevos widgets de ideación
      case 'scamper':
        return {
          ...base,
          sections: [
            { id: 'substitute', title: 'Sustituir', icon: '🔄', color: '#ef4444', items: [] },
            { id: 'combine', title: 'Combinar', icon: '🔗', color: '#f59e0b', items: [] },
            { id: 'adapt', title: 'Adaptar', icon: '🔧', color: '#eab308', items: [] },
            { id: 'modify', title: 'Modificar', icon: '✏️', color: '#84cc16', items: [] },
            { id: 'put', title: 'Propósito', icon: '🎯', color: '#10b981', items: [] },
            { id: 'eliminate', title: 'Eliminar', icon: '❌', color: '#06b6d4', items: [] },
            { id: 'reverse', title: 'Reorganizar', icon: '🔀', color: '#8b5cf6', items: [] }
          ]
        };
      case 'starbursting':
        return {
          ...base,
          sections: [
            { id: 'what', title: 'Qué', icon: '❓', color: '#ef4444', items: [] },
            { id: 'who', title: 'Quién', icon: '👤', color: '#f59e0b', items: [] },
            { id: 'where', title: 'Dónde', icon: '📍', color: '#10b981', items: [] },
            { id: 'when', title: 'Cuándo', icon: '📅', color: '#3b82f6', items: [] },
            { id: 'why', title: 'Por qué', icon: '💡', color: '#8b5cf6', items: [] },
            { id: 'how', title: 'Cómo', icon: '⚙️', color: '#ec4899', items: [] }
          ]
        };
      case 'reverse-brainstorm':
        return {
          ...base,
          sections: [
            { id: 'problems', title: 'Causar Problemas', icon: '💥', color: '#ef4444', items: [] },
            { id: 'solutions', title: 'Soluciones Invertidas', icon: '✅', color: '#10b981', items: [] }
          ]
        };
      case 'worst-idea':
        return {
          ...base,
          sections: [
            { id: 'worst', title: 'Peores Ideas', icon: '👎', color: '#ef4444', items: [] },
            { id: 'transformed', title: 'Ideas Transformadas', icon: '✨', color: '#10b981', items: [] }
          ]
        };
      case 'lotus-blossom':
        return {
          ...base,
          centerIdea: title,
          petals: [
            { id: 'petal-1', title: 'Pétalo 1', items: [] },
            { id: 'petal-2', title: 'Pétalo 2', items: [] },
            { id: 'petal-3', title: 'Pétalo 3', items: [] },
            { id: 'petal-4', title: 'Pétalo 4', items: [] },
            { id: 'petal-5', title: 'Pétalo 5', items: [] },
            { id: 'petal-6', title: 'Pétalo 6', items: [] },
            { id: 'petal-7', title: 'Pétalo 7', items: [] },
            { id: 'petal-8', title: 'Pétalo 8', items: [] }
          ]
        };
      // Nuevos widgets de análisis
      case 'five-whys':
        return {
          ...base,
          problem: title,
          whys: [],
          rootCause: ''
        };
      case 'impact-effort':
        return {
          ...base,
          items: []
        };
      case 'opportunity-tree':
        return {
          ...base,
          objective: title,
          opportunities: []
        };
      default:
        return base;
    }
  };

  // Handle dynamic close
  const handleCloseDynamic = () => {
    setActiveDynamic(null);
    // loadDynamics is now called by DynamicFullscreen after close
  };

  // Safe open dynamic with validation
  const handleOpenDynamic = (dynamic: DynamicMessage) => {
    if (!dynamic || !dynamic.commandData || !dynamic.commandType) {
      alert('Esta dinámica tiene datos inválidos y no se puede abrir');
      return;
    }
    setActiveDynamic(dynamic);
  };

  // Handle dynamic delete
  const handleDeleteDynamic = async (dynamicId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${dynamicId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDynamics(prev => prev.filter(d => d._id !== dynamicId));
      } else {
        alert('Error al eliminar la dinámica');
      }
    } catch (error) {
      console.error('Error deleting dynamic:', error);
      alert('Error al eliminar la dinámica');
    }
  };

  // Separate active and closed dynamics (filter out any without valid commandData)
  const validDynamics = dynamics.filter(d =>
    d &&
    d.commandData !== null &&
    d.commandData !== undefined &&
    typeof d.commandData === 'object'
  );
  const activeDynamics = validDynamics.filter(d => d.commandData?.closed !== true);
  const closedDynamics = validDynamics.filter(d => d.commandData?.closed === true);

  // Loading channels
  if (loadingChannels) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  // No channels available
  if (channels.length === 0) {
    return (
      <div className="text-center py-20">
        <Hash className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No hay canales disponibles
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Crea un canal en la pestaña &quot;Canales&quot; para iniciar dinámicas de grupo.
        </p>
      </div>
    );
  }

  // Fullscreen mode
  if (activeDynamic && selectedChannelId) {
    return (
      <DynamicFullscreen
        dynamic={activeDynamic}
        projectId={projectId}
        channelId={selectedChannelId}
        onlineUsers={onlineUsers}
        onClose={handleCloseDynamic}
        onMinimize={() => setActiveDynamic(null)}
        onUpdate={loadDynamics}
      />
    );
  }

  const selectedChannel = channels.find(c => c._id === selectedChannelId);

  return (
    <div className="space-y-6">
      {/* Header with Channel Selector and Generate Document Button */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Canal:</span>
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <button
                key={channel._id}
                onClick={() => setSelectedChannelId(channel._id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                  selectedChannelId === channel._id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Hash size={14} />
                {channel.name}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Document Button */}
        {validDynamics.length > 0 && (
          <button
            onClick={() => setShowDocumentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-indigo-700 transition shadow-md"
          >
            <Sparkles size={16} />
            Generar Documento
          </button>
        )}
      </div>

      {/* Generate Document Modal */}
      <GenerateDocumentModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        dynamics={validDynamics}
        projectId={projectId}
      />

      {/* Loading dynamics */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      )}

      {/* Creating indicator */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-500" size={24} />
            <span className="text-gray-900 dark:text-gray-100">Creando dinámica...</span>
          </div>
        </div>
      )}

      {/* Main content - only show when not loading */}
      {!loading && (
        <>
          {/* Active Dynamics */}
          {activeDynamics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="text-green-500" size={20} />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Dinámicas Activas ({activeDynamics.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDynamics.map((dynamic) => (
                  <DynamicCard
                    key={dynamic._id}
                    dynamic={dynamic}
                    participantCount={onlineUsers.length}
                    onClick={() => handleOpenDynamic(dynamic)}
                    onDelete={handleDeleteDynamic}
                    canDelete={dynamic.commandData?.createdBy === session?.user?.id || dynamic.userId?._id === session?.user?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dynamics Menu */}
          <DynamicsMenu onSelectDynamic={handleCreateDynamic} />

          {/* History Toggle */}
          {closedDynamics.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
              >
                <History size={18} />
                <span>{showHistory ? 'Ocultar' : 'Ver'} historial ({closedDynamics.length})</span>
              </button>

              {showHistory && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {closedDynamics.map((dynamic) => (
                    <DynamicCard
                      key={dynamic._id}
                      dynamic={dynamic}
                      onClick={() => handleOpenDynamic(dynamic)}
                      onDelete={handleDeleteDynamic}
                      canDelete={dynamic.commandData?.createdBy === session?.user?.id || dynamic.userId?._id === session?.user?.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

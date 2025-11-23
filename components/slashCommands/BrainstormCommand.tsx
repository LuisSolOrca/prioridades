'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Lightbulb, ThumbsUp, Send, Lock, TrendingUp, User } from 'lucide-react';

interface Idea {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
  };
  votes: string[]; // Array de userIds que votaron
  createdAt: Date;
}

interface BrainstormCommandProps {
  projectId: string;
  messageId?: string;
  topic: string;
  ideas: Idea[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function BrainstormCommand({
  projectId,
  messageId,
  topic,
  ideas: initialIdeas,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: BrainstormCommandProps) {
  const { data: session } = useSession();
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [closed, setClosed] = useState(initialClosed);
  const [newIdea, setNewIdea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');

  useEffect(() => {
    setIdeas(initialIdeas);
    setClosed(initialClosed);
  }, [initialIdeas, initialClosed]);

  const sortedIdeas = [...ideas].sort((a, b) => {
    if (sortBy === 'votes') {
      return b.votes.length - a.votes.length;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleAddIdea = async () => {
    if (!session?.user?.id || !newIdea.trim() || closed || submitting) return;

    const ideaText = newIdea.trim();
    setNewIdea('');

    // Si no hay messageId, es temporal (sin persistencia)
    if (!messageId) {
      const tempIdea: Idea = {
        id: Date.now().toString(),
        text: ideaText,
        author: {
          id: session.user.id,
          name: session.user.name || 'Usuario'
        },
        votes: [],
        createdAt: new Date()
      };
      setIdeas(prev => [...prev, tempIdea]);
      return;
    }

    // Brainstorm persistente: usar API
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/brainstorm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', text: ideaText })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar idea');
        return;
      }

      const data = await response.json();
      setIdeas(data.commandData.ideas);
      onUpdate?.();
    } catch (error) {
      console.error('Error adding idea:', error);
      alert('Error al agregar la idea');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteIdea = async (ideaId: string) => {
    if (!session?.user?.id || closed) return;

    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;

    const hasVoted = idea.votes.includes(session.user.id);

    // Si no hay messageId, es temporal
    if (!messageId) {
      setIdeas(prev => prev.map(i => {
        if (i.id === ideaId) {
          return {
            ...i,
            votes: hasVoted
              ? i.votes.filter(v => v !== session.user.id)
              : [...i.votes, session.user.id]
          };
        }
        return i;
      }));
      return;
    }

    // Brainstorm persistente: usar API
    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/brainstorm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', ideaId })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al votar');
        return;
      }

      const data = await response.json();
      setIdeas(data.commandData.ideas);
      onUpdate?.();
    } catch (error) {
      console.error('Error voting idea:', error);
      alert('Error al votar la idea');
    }
  };

  const handleCloseBrainstorm = async () => {
    // Si no hay messageId, es temporal
    if (!messageId) {
      setClosed(true);
      return;
    }

    // Brainstorm persistente: usar API
    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/brainstorm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al cerrar');
        return;
      }

      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error closing brainstorm:', error);
      alert('Error al cerrar la sesión');
    }
  };

  const totalIdeas = ideas.length;
  const totalVotes = ideas.reduce((sum, idea) => sum + idea.votes.length, 0);
  const topIdea = sortedIdeas[0];

  return (
    <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 p-6 my-2 max-w-4xl w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{topic}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {totalIdeas} {totalIdeas === 1 ? 'idea' : 'ideas'} • {totalVotes} votos •
              {closed ? ' Sesión cerrada' : ' Sesión activa'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Stats */}
      {ideas.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{totalIdeas}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Ideas</div>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{totalVotes}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Votos</div>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {new Set(ideas.map(i => i.author.id)).size}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Participantes</div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      {ideas.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-600 dark:text-gray-400">Ordenar por:</span>
          <button
            onClick={() => setSortBy('votes')}
            className={`text-xs px-3 py-1 rounded-full transition ${
              sortBy === 'votes'
                ? 'bg-yellow-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <TrendingUp size={12} className="inline mr-1" />
            Más votadas
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={`text-xs px-3 py-1 rounded-full transition ${
              sortBy === 'recent'
                ? 'bg-yellow-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Más recientes
          </button>
        </div>
      )}

      {/* Ideas List */}
      <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
        {sortedIdeas.length === 0 ? (
          <div className="bg-white dark:bg-gray-700 rounded-lg p-8 text-center">
            <Lightbulb className="mx-auto mb-2 text-gray-400" size={40} />
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Sé el primero en compartir una idea
            </p>
          </div>
        ) : (
          sortedIdeas.map((idea, index) => {
            const hasVoted = idea.votes.includes(session?.user?.id || '');
            const isTop = index === 0 && sortBy === 'votes' && idea.votes.length > 0;

            return (
              <div
                key={idea.id}
                className={`bg-white dark:bg-gray-700 rounded-lg p-3 transition-all ${
                  isTop ? 'ring-2 ring-yellow-400 dark:ring-yellow-600' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Vote Button */}
                  <button
                    onClick={() => handleVoteIdea(idea.id)}
                    disabled={closed}
                    className={`flex flex-col items-center gap-1 px-2 py-1 rounded transition ${
                      hasVoted
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    } ${closed ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
                  >
                    <ThumbsUp
                      size={18}
                      className={hasVoted ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}
                      fill={hasVoted ? 'currentColor' : 'none'}
                    />
                    <span className={`text-xs font-bold ${
                      hasVoted ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {idea.votes.length}
                    </span>
                  </button>

                  {/* Idea Content */}
                  <div className="flex-1">
                    {isTop && (
                      <div className="inline-block bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full mb-1 font-semibold">
                        🏆 Top Idea
                      </div>
                    )}
                    <p className="text-gray-800 dark:text-gray-100 text-sm mb-1 break-words">{idea.text}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <User size={12} />
                      <span>{idea.author.name}</span>
                      <span>•</span>
                      <span>{new Date(idea.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Idea Input */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddIdea();
                }
              }}
              placeholder="Escribe tu idea..."
              disabled={submitting}
              className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={handleAddIdea}
              disabled={!newIdea.trim() || submitting}
              className="flex-shrink-0 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white p-2 rounded-lg transition"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Presiona Enter para agregar tu idea
          </p>
        </div>
      )}

      {/* Status Messages */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-600 dark:text-gray-400" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Sesión cerrada. {topIdea && (
                <>
                  Idea ganadora: <strong>{topIdea.text}</strong> ({topIdea.votes.length} votos)
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {!closed && ideas.length > 0 && (
        <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 mb-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 Vota por las ideas que más te gusten
          </p>
        </div>
      )}

      {/* Close Button (only creator) */}
      {!closed && createdBy === session?.user?.id && ideas.length > 0 && (
        <button
          onClick={handleCloseBrainstorm}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Sesión de Brainstorming
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/brainstorm</code>
      </div>
    </div>
  );
}

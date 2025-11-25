'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';

interface Vote {
  oderId: string;
  odeName: string;
  level: number;
}

interface DelegationTopic {
  id: string;
  title: string;
  votes: Vote[];
  revealed: boolean;
  finalLevel?: number;
}

interface DelegationPokerCommandProps {
  projectId: string;
  messageId?: string;
  channelId: string;
  title: string;
  topics: DelegationTopic[];
  currentTopicIndex: number;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const DELEGATION_LEVELS = [
  { level: 1, name: 'Decir', color: 'bg-red-500', description: 'El manager decide y comunica' },
  { level: 2, name: 'Vender', color: 'bg-orange-500', description: 'El manager decide y explica/convence' },
  { level: 3, name: 'Consultar', color: 'bg-yellow-500', description: 'El manager pide input, luego decide' },
  { level: 4, name: 'Acordar', color: 'bg-green-500', description: 'Manager y equipo deciden juntos' },
  { level: 5, name: 'Aconsejar', color: 'bg-teal-500', description: 'El equipo decide, manager aconseja' },
  { level: 6, name: 'Preguntar', color: 'bg-blue-500', description: 'El equipo decide, manager pregunta después' },
  { level: 7, name: 'Delegar', color: 'bg-purple-500', description: 'El equipo decide completamente' },
];

export default function DelegationPokerCommand({
  projectId,
  messageId,
  channelId,
  title,
  topics,
  currentTopicIndex,
  createdBy,
  closed,
  onClose,
  onUpdate
}: DelegationPokerCommandProps) {
  const { data: session } = useSession();
  const [localTopics, setLocalTopics] = useState<DelegationTopic[]>(topics);
  const [topicIndex, setTopicIndex] = useState(currentTopicIndex);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync with props
  useEffect(() => {
    setLocalTopics(topics);
    setTopicIndex(currentTopicIndex);
  }, [topics, currentTopicIndex]);

  const currentTopic = localTopics[topicIndex];
  const isCreator = createdBy === session?.user?.id;

  // Check if current user has voted
  const userVote = currentTopic?.votes.find(v => v.oderId === session?.user?.id);

  useEffect(() => {
    if (userVote) {
      setSelectedLevel(userVote.level);
    } else {
      setSelectedLevel(null);
    }
  }, [topicIndex, userVote]);

  const updateCommandData = async (updates: Partial<{ topics: DelegationTopic[]; currentTopicIndex: number }>) => {
    if (!messageId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandData: {
            title,
            topics: updates.topics || localTopics,
            currentTopicIndex: updates.currentTopicIndex ?? topicIndex,
            createdBy,
            closed
          }
        })
      });

      if (response.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating delegation poker:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (level: number) => {
    if (!session?.user || closed || currentTopic?.revealed) return;

    setSelectedLevel(level);

    const updatedTopics = [...localTopics];
    const existingVoteIndex = updatedTopics[topicIndex].votes.findIndex(
      v => v.oderId === session.user.id
    );

    const vote: Vote = {
      oderId: session.user.id,
      odeName: session.user.name || 'Usuario',
      level
    };

    if (existingVoteIndex >= 0) {
      updatedTopics[topicIndex].votes[existingVoteIndex] = vote;
    } else {
      updatedTopics[topicIndex].votes.push(vote);
    }

    setLocalTopics(updatedTopics);
    await updateCommandData({ topics: updatedTopics });
  };

  const handleReveal = async () => {
    if (!isCreator || closed) return;

    const updatedTopics = [...localTopics];
    updatedTopics[topicIndex].revealed = true;

    setLocalTopics(updatedTopics);
    await updateCommandData({ topics: updatedTopics });
  };

  const handleReset = async () => {
    if (!isCreator || closed) return;

    const updatedTopics = [...localTopics];
    updatedTopics[topicIndex].votes = [];
    updatedTopics[topicIndex].revealed = false;
    updatedTopics[topicIndex].finalLevel = undefined;

    setLocalTopics(updatedTopics);
    setSelectedLevel(null);
    await updateCommandData({ topics: updatedTopics });
  };

  const handleSetFinalLevel = async (level: number) => {
    if (!isCreator || closed) return;

    const updatedTopics = [...localTopics];
    updatedTopics[topicIndex].finalLevel = level;

    setLocalTopics(updatedTopics);
    await updateCommandData({ topics: updatedTopics });
  };

  const handleAddTopic = async () => {
    if (!newTopicTitle.trim() || closed) return;

    const newTopic: DelegationTopic = {
      id: Date.now().toString(),
      title: newTopicTitle.trim(),
      votes: [],
      revealed: false
    };

    const updatedTopics = [...localTopics, newTopic];
    setLocalTopics(updatedTopics);
    setNewTopicTitle('');
    setShowAddTopic(false);
    await updateCommandData({ topics: updatedTopics });
  };

  const handleRemoveTopic = async (topicId: string) => {
    if (closed || localTopics.length <= 1) return;

    const updatedTopics = localTopics.filter(t => t.id !== topicId);
    const newIndex = Math.min(topicIndex, updatedTopics.length - 1);

    setLocalTopics(updatedTopics);
    setTopicIndex(newIndex);
    await updateCommandData({ topics: updatedTopics, currentTopicIndex: newIndex });
  };

  const handleNavigate = async (index: number) => {
    setTopicIndex(index);
    await updateCommandData({ currentTopicIndex: index });
  };

  // Calculate vote statistics
  const getVoteStats = () => {
    if (!currentTopic?.revealed || currentTopic.votes.length === 0) return null;

    const levels = currentTopic.votes.map(v => v.level);
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    const spread = max - min;

    return { avg, min, max, spread };
  };

  const stats = getVoteStats();

  if (!currentTopic) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay temas para votar
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={24} />
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-violet-200 text-sm">Delegation Poker - Management 3.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-full px-3 py-1 text-sm">
              {currentTopic.votes.length} votos
            </div>
          </div>
        </div>

        {/* Topic navigation */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
          {localTopics.map((topic, idx) => (
            <button
              key={topic.id}
              onClick={() => handleNavigate(idx)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition ${
                idx === topicIndex
                  ? 'bg-white text-violet-600 font-medium'
                  : topic.finalLevel
                    ? 'bg-green-500/30 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {idx + 1}. {topic.title.length > 20 ? topic.title.slice(0, 20) + '...' : topic.title}
              {topic.finalLevel && <Check size={14} className="inline ml-1" />}
            </button>
          ))}
          {!closed && (
            <button
              onClick={() => setShowAddTopic(true)}
              className="flex-shrink-0 p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Add topic modal */}
      {showAddTopic && (
        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="Nueva decisión a delegar..."
              className="flex-1 px-3 py-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-800 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
            />
            <button
              onClick={handleAddTopic}
              disabled={!newTopicTitle.trim()}
              className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              Agregar
            </button>
            <button
              onClick={() => setShowAddTopic(false)}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Current topic */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Decisión {topicIndex + 1} de {localTopics.length}
            </p>
            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {currentTopic.title}
            </h4>
          </div>
          {!closed && isCreator && localTopics.length > 1 && (
            <button
              onClick={() => handleRemoveTopic(currentTopic.id)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {/* Delegation levels */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            ¿Qué nivel de delegación debería tener esta decisión?
          </p>
          <div className="grid grid-cols-7 gap-2">
            {DELEGATION_LEVELS.map((level) => {
              const isSelected = selectedLevel === level.level;
              const voteCount = currentTopic.revealed
                ? currentTopic.votes.filter(v => v.level === level.level).length
                : 0;
              const isFinal = currentTopic.finalLevel === level.level;

              return (
                <button
                  key={level.level}
                  onClick={() => !closed && !currentTopic.revealed && handleVote(level.level)}
                  disabled={closed || currentTopic.revealed}
                  className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                    isSelected
                      ? `${level.color} text-white shadow-lg scale-105`
                      : isFinal
                        ? `${level.color} text-white ring-4 ring-yellow-400`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${closed || currentTopic.revealed ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-2xl font-bold">{level.level}</span>
                  <span className="text-xs mt-1 text-center leading-tight">{level.name}</span>
                  {currentTopic.revealed && voteCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                      {voteCount}
                    </span>
                  )}
                  {isFinal && (
                    <span className="absolute -top-2 -left-2 bg-yellow-400 text-yellow-900 text-xs p-1 rounded-full">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedLevel
                ? DELEGATION_LEVELS[selectedLevel - 1].description
                : 'Selecciona un nivel de delegación'}
            </p>
          </div>
        </div>

        {/* Votes display */}
        {currentTopic.revealed && currentTopic.votes.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Eye size={18} />
              Votos revelados
            </h5>
            <div className="flex flex-wrap gap-2 mb-4">
              {currentTopic.votes.map((vote, idx) => (
                <div
                  key={idx}
                  className={`${DELEGATION_LEVELS[vote.level - 1].color} text-white px-3 py-1.5 rounded-lg text-sm`}
                >
                  <span className="font-bold">{vote.level}</span>
                  <span className="ml-2">{vote.odeName}</span>
                </div>
              ))}
            </div>

            {stats && (
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.avg.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">Promedio</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.min}</p>
                  <p className="text-xs text-gray-500">Mínimo</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.max}</p>
                  <p className="text-xs text-gray-500">Máximo</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stats.spread > 2 ? 'text-red-500' : 'text-green-500'}`}>
                    {stats.spread}
                  </p>
                  <p className="text-xs text-gray-500">Dispersión</p>
                </div>
              </div>
            )}

            {stats && stats.spread > 2 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Alta dispersión - Se recomienda discutir las diferencias antes de decidir
                </p>
              </div>
            )}
          </div>
        )}

        {/* Set final level (creator only, after reveal) */}
        {currentTopic.revealed && isCreator && !closed && (
          <div className="mb-6 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
            <p className="text-sm font-medium text-violet-800 dark:text-violet-200 mb-3">
              Establecer nivel final acordado:
            </p>
            <div className="flex flex-wrap gap-2">
              {DELEGATION_LEVELS.map((level) => (
                <button
                  key={level.level}
                  onClick={() => handleSetFinalLevel(level.level)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    currentTopic.finalLevel === level.level
                      ? `${level.color} text-white`
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {level.level}. {level.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Final decision */}
        {currentTopic.finalLevel && (
          <div className={`mb-6 p-4 ${DELEGATION_LEVELS[currentTopic.finalLevel - 1].color} rounded-xl text-white`}>
            <div className="flex items-center gap-3">
              <Check size={24} />
              <div>
                <p className="font-bold text-lg">
                  Nivel acordado: {currentTopic.finalLevel} - {DELEGATION_LEVELS[currentTopic.finalLevel - 1].name}
                </p>
                <p className="text-sm opacity-90">
                  {DELEGATION_LEVELS[currentTopic.finalLevel - 1].description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {!currentTopic.revealed && currentTopic.votes.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentTopic.votes.length} {currentTopic.votes.length === 1 ? 'voto' : 'votos'}
              </span>
            )}
          </div>

          {!closed && isCreator && (
            <div className="flex gap-2">
              {currentTopic.revealed ? (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <RotateCcw size={18} />
                  Reiniciar
                </button>
              ) : (
                <button
                  onClick={handleReveal}
                  disabled={currentTopic.votes.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye size={18} />
                  Revelar votos
                </button>
              )}
            </div>
          )}

          {!isCreator && !currentTopic.revealed && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <EyeOff size={16} />
              Esperando que el facilitador revele los votos
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Niveles de delegación:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {DELEGATION_LEVELS.map((level) => (
              <div key={level.level} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${level.color}`} />
                <span className="text-gray-600 dark:text-gray-400">
                  {level.level}. {level.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

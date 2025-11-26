'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Coffee, Plus, Trash2, ThumbsUp, Play, Pause, SkipForward, Check } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Topic {
  id: string;
  text: string;
  userId: string;
  userName: string;
  votes: string[];
  status: 'pending' | 'discussing' | 'discussed';
}

interface LeanCoffeeCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  topics: Topic[];
  currentTopic: string | null;
  timePerTopic: number;
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function LeanCoffeeCommand({
  projectId,
  messageId,
  channelId,
  title,
  topics: initialTopics,
  currentTopic: initialCurrentTopic,
  timePerTopic,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: LeanCoffeeCommandProps) {
  const { data: session } = useSession();
  const [topics, setTopics] = useState<Topic[]>(initialTopics || []);
  const [currentTopic, setCurrentTopic] = useState<string | null>(initialCurrentTopic);
  const [closed, setClosed] = useState(initialClosed);
  const [newTopic, setNewTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(timePerTopic * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTopics(initialTopics || []);
    setCurrentTopic(initialCurrentTopic);
    setClosed(initialClosed);
  }, [initialTopics, initialCurrentTopic, initialClosed]);

  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timerSeconds]);

  const handleAddTopic = async () => {
    if (!session?.user || !newTopic.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-coffee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', text: newTopic.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setTopics(data.commandData.topics || []);
      setNewTopic('');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (topicId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-coffee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', topicId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setTopics(data.commandData.topics || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartDiscussion = async (topicId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-coffee`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', topicId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setTopics(data.commandData.topics || []);
      setCurrentTopic(topicId);
      setTimerSeconds(timePerTopic * 60);
      setTimerRunning(true);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishDiscussion = async (topicId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-coffee`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', topicId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setTopics(data.commandData.topics || []);
      setCurrentTopic(null);
      setTimerRunning(false);
      setTimerSeconds(timePerTopic * 60);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-coffee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', topicId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setTopics(data.commandData.topics || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseLeanCoffee = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'lean-coffee',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/lean-coffee`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      setTimerRunning(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pendingTopics = topics
    .filter(t => t.status === 'pending')
    .sort((a, b) => b.votes.length - a.votes.length);
  const discussingTopics = topics.filter(t => t.status === 'discussing');
  const discussedTopics = topics.filter(t => t.status === 'discussed');

  const hasVoted = (topic: Topic) => topic.votes.includes(session?.user?.id || '');

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <Coffee className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Lean Coffee {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Timer */}
      {currentTopic && !closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 text-center">
          <p className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {formatTime(timerSeconds)}
          </p>
          <div className="flex justify-center gap-2 mt-2">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="p-2 bg-amber-500 text-white rounded-full hover:bg-amber-600"
            >
              {timerRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => setTimerSeconds(timePerTopic * 60)}
              className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600"
            >
              <SkipForward size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Pending Topics */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 min-h-[200px]">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Por Discutir ({pendingTopics.length})
          </h4>
          <div className="space-y-2">
            {pendingTopics.map(topic => (
              <div key={topic.id} className="bg-white dark:bg-gray-600 rounded p-2 group relative">
                <p className="text-sm text-gray-800 dark:text-gray-100 pr-6">{topic.text}</p>
                <p className="text-xs text-gray-500 mt-1">— {topic.userName}</p>
                <div className="flex items-center gap-2 mt-2">
                  {!closed && (
                    <>
                      <button
                        onClick={() => handleVote(topic.id)}
                        disabled={submitting}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition ${
                          hasVoted(topic)
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-200 hover:bg-amber-200'
                        }`}
                      >
                        <ThumbsUp size={12} />
                        {topic.votes.length}
                      </button>
                      {!currentTopic && (
                        <button
                          onClick={() => handleStartDiscussion(topic.id)}
                          disabled={submitting}
                          className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          <Play size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                {!closed && topic.userId === session?.user?.id && (
                  <button
                    onClick={() => handleDeleteTopic(topic.id)}
                    disabled={submitting}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Discussing */}
        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-3 min-h-[200px] border-2 border-amber-400">
          <h4 className="font-semibold text-amber-700 dark:text-amber-300 text-sm mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            En Discusión
          </h4>
          <div className="space-y-2">
            {discussingTopics.map(topic => (
              <div key={topic.id} className="bg-white dark:bg-gray-600 rounded p-2 border-2 border-amber-400">
                <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{topic.text}</p>
                <p className="text-xs text-gray-500 mt-1">— {topic.userName}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                  <ThumbsUp size={10} />
                  {topic.votes.length} votos
                </div>
                {!closed && (
                  <button
                    onClick={() => handleFinishDiscussion(topic.id)}
                    disabled={submitting}
                    className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                  >
                    <Check size={12} />
                    Finalizar
                  </button>
                )}
              </div>
            ))}
            {discussingTopics.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 italic text-center py-4">
                Selecciona un tema para discutir
              </p>
            )}
          </div>
        </div>

        {/* Discussed */}
        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 min-h-[200px]">
          <h4 className="font-semibold text-green-700 dark:text-green-300 text-sm mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Discutidos ({discussedTopics.length})
          </h4>
          <div className="space-y-2">
            {discussedTopics.map(topic => (
              <div key={topic.id} className="bg-white dark:bg-gray-600 rounded p-2 opacity-75">
                <p className="text-sm text-gray-800 dark:text-gray-100">{topic.text}</p>
                <p className="text-xs text-gray-500 mt-1">— {topic.userName}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                  <Check size={10} />
                  Completado
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Topic */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Agregar un tema para discutir..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              disabled={submitting}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
            />
            <button
              onClick={handleAddTopic}
              disabled={!newTopic.trim() || submitting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && topics.length > 0 && (
        <button
          onClick={handleCloseLeanCoffee}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Lean Coffee
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Lean Coffee cerrado • {discussedTopics.length} temas discutidos
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/lean-coffee</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Lightbulb, Play, Pause, RotateCcw, Users, Clock } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Idea {
  id: string;
  text: string;
  userId: string;
  userName: string;
  round: number;
  buildOnId?: string; // ID de la idea sobre la que se construye
}

interface BrainwritingCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  rounds: { round: number; startedAt: string; completedAt?: string }[];
  currentRound: number;
  timePerRound: number;
  ideasPerRound: number;
  participants: { oderId: string; oderName: string }[];
  ideas?: Idea[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function BrainwritingCommand({
  projectId,
  messageId,
  channelId,
  title,
  rounds: initialRounds,
  currentRound: initialCurrentRound,
  timePerRound: initialTimePerRound,
  ideasPerRound: initialIdeasPerRound,
  participants: initialParticipants,
  ideas: initialIdeas,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: BrainwritingCommandProps) {
  const { data: session } = useSession();
  const [rounds, setRounds] = useState(initialRounds || []);
  const [currentRound, setCurrentRound] = useState(initialCurrentRound || 0);
  const [timePerRound] = useState(initialTimePerRound || 5);
  const [ideasPerRound] = useState(initialIdeasPerRound || 3);
  const [participants, setParticipants] = useState(initialParticipants || []);
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newIdeas, setNewIdeas] = useState<string[]>(['', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(timePerRound * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRounds(initialRounds || []);
    setCurrentRound(initialCurrentRound || 0);
    setParticipants(initialParticipants || []);
    setIdeas(initialIdeas || []);
    setClosed(initialClosed);
  }, [initialRounds, initialCurrentRound, initialParticipants, initialIdeas, initialClosed]);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerSeconds]);

  const handleJoin = async () => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/brainwriting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setParticipants(data.commandData.participants || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartRound = async () => {
    if (!session?.user?.id || session.user.id !== createdBy || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/brainwriting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startRound' })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRounds(data.commandData.rounds || []);
      setCurrentRound(data.commandData.currentRound || 0);
      setTimerSeconds(timePerRound * 60);
      setTimerRunning(true);
      setNewIdeas(['', '', '']);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitIdeas = async () => {
    if (!session?.user || submitting) return;
    const validIdeas = newIdeas.filter(i => i.trim());
    if (validIdeas.length === 0) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/brainwriting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submitIdeas', ideas: validIdeas, round: currentRound })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setIdeas(data.commandData.ideas || []);
      setNewIdeas(['', '', '']);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseBrainwriting = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'brainwriting',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/brainwriting`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const hasJoined = participants.some(p => p.oderId === session?.user?.id);
  const isCreator = session?.user?.id === createdBy;
  const myIdeasThisRound = ideas.filter(i => i.userId === session?.user?.id && i.round === currentRound);
  const canSubmitMore = myIdeasThisRound.length < ideasPerRound && currentRound > 0;

  // Get ideas from previous round to build on
  const previousRoundIdeas = currentRound > 1
    ? ideas.filter(i => i.round === currentRound - 1 && i.userId !== session?.user?.id)
    : [];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <Lightbulb className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Brainwriting 6-3-5 {closed ? '• Cerrado' : '• Activo'} • Ronda {currentRound}/{6}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Info Box */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>6-3-5:</strong> 6 participantes escriben 3 ideas en 5 minutos, luego pasan su hoja.
          Cada ronda construyes sobre las ideas anteriores.
        </p>
      </div>

      {/* Participants */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Users size={16} /> Participantes ({participants.length}/6)
          </h4>
          {!closed && !hasJoined && participants.length < 6 && (
            <button
              onClick={handleJoin}
              disabled={submitting}
              className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
            >
              Unirse
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {participants.map(p => (
            <div key={p.oderId} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded text-sm text-amber-800 dark:text-amber-200">
              {p.oderName}
            </div>
          ))}
          {Array.from({ length: 6 - participants.length }).map((_, i) => (
            <div key={i} className="px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded text-sm text-gray-400">
              Vacío
            </div>
          ))}
        </div>
      </div>

      {/* Timer and Round Control */}
      {currentRound > 0 && !closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <Clock size={20} className="text-amber-500" />
            <span className={`text-3xl font-mono font-bold ${timerSeconds < 60 ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>
              {formatTime(timerSeconds)}
            </span>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg"
            >
              {timerRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => { setTimerSeconds(timePerRound * 60); setTimerRunning(false); }}
              className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ronda {currentRound}: Escribe {ideasPerRound} ideas en {timePerRound} minutos
          </p>
        </div>
      )}

      {/* Previous Round Ideas to Build On */}
      {currentRound > 1 && previousRoundIdeas.length > 0 && !closed && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
            💡 Ideas de la ronda anterior (construye sobre estas):
          </h4>
          <div className="space-y-1">
            {previousRoundIdeas.slice(0, 3).map(idea => (
              <div key={idea.id} className="bg-white dark:bg-gray-700 rounded p-2 text-sm">
                <p className="text-gray-800 dark:text-gray-100">{idea.text}</p>
                <p className="text-xs text-gray-500">— {idea.userName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      {currentRound > 0 && !closed && hasJoined && canSubmitMore && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
            Tus ideas para la ronda {currentRound}:
          </h4>
          <div className="space-y-2">
            {newIdeas.map((idea, index) => (
              <input
                key={index}
                type="text"
                value={idea}
                onChange={(e) => {
                  const updated = [...newIdeas];
                  updated[index] = e.target.value;
                  setNewIdeas(updated);
                }}
                placeholder={`Idea ${index + 1}...`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
              />
            ))}
          </div>
          <button
            onClick={handleSubmitIdeas}
            disabled={newIdeas.every(i => !i.trim()) || submitting}
            className="w-full mt-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-400"
          >
            Enviar Ideas
          </button>
        </div>
      )}

      {/* My submitted ideas this round */}
      {myIdeasThisRound.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            ✓ Tus ideas enviadas (Ronda {currentRound}):
          </h4>
          <div className="space-y-1">
            {myIdeasThisRound.map(idea => (
              <div key={idea.id} className="text-sm text-green-700 dark:text-green-300">
                • {idea.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Ideas (when closed or for review) */}
      {(closed || currentRound >= 6) && ideas.length > 0 && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
            Todas las ideas ({ideas.length}):
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {ideas.map(idea => (
              <div key={idea.id} className="bg-gray-50 dark:bg-gray-600 rounded p-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-gray-800 dark:text-gray-100">{idea.text}</p>
                  <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-500 px-1 rounded">R{idea.round}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">— {idea.userName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Round Button (Creator only) */}
      {!closed && isCreator && participants.length >= 2 && currentRound < 6 && (
        <button
          onClick={handleStartRound}
          disabled={submitting}
          className="w-full mb-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium flex items-center justify-center gap-2"
        >
          <Play size={18} />
          {currentRound === 0 ? 'Iniciar Ronda 1' : `Iniciar Ronda ${currentRound + 1}`}
        </button>
      )}

      {/* Close Button */}
      {!closed && isCreator && ideas.length > 0 && (
        <button onClick={handleCloseBrainwriting} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Brainwriting
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Brainwriting cerrado • {ideas.length} ideas generadas
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/brainwriting</code>
      </div>
    </div>
  );
}

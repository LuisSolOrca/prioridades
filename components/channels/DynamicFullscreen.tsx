'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  X,
  Minimize2,
  Users,
  Vote,
  Lightbulb,
  RotateCcw,
  Target,
  Heart,
  Lock,
  Loader2,
  Timer,
  Play,
  Pause,
  RotateCw
} from 'lucide-react';

// Import all collaborative widgets
import PollCommand from '../slashCommands/PollCommand';
import BrainstormCommand from '../slashCommands/BrainstormCommand';
import DotVotingCommand from '../slashCommands/DotVotingCommand';
import BlindVoteCommand from '../slashCommands/BlindVoteCommand';
import RetroCommand from '../slashCommands/RetroCommand';
import NPSCommand from '../slashCommands/NPSCommand';
import DecisionMatrixCommand from '../slashCommands/DecisionMatrixCommand';
import MindMapCommand from '../slashCommands/MindMapCommand';
import ActionItemsCommand from '../slashCommands/ActionItemsCommand';
import TeamHealthCommand from '../slashCommands/TeamHealthCommand';
import ConfidenceVoteCommand from '../slashCommands/ConfidenceVoteCommand';
import AgendaCommand from '../slashCommands/AgendaCommand';
import ParkingLotCommand from '../slashCommands/ParkingLotCommand';
import KudosWallCommand from '../slashCommands/KudosWallCommand';
import PomodoroCommand from '../slashCommands/PomodoroCommand';
import FistOfFiveCommand from '../slashCommands/FistOfFiveCommand';
import MoodCommand from '../slashCommands/MoodCommand';
import ProsConsCommand from '../slashCommands/ProsConsCommand';
import RankingCommand from '../slashCommands/RankingCommand';
import ChecklistCommand from '../slashCommands/ChecklistCommand';
import EstimationPokerCommand from '../slashCommands/EstimationPokerCommand';
import RetrospectiveCommand from '../slashCommands/RetrospectiveCommand';
import IcebreakerCommand from '../slashCommands/IcebreakerCommand';

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
}

interface OnlineUser {
  id: string;
  info: {
    name: string;
    email: string;
  };
}

interface DynamicFullscreenProps {
  dynamic: DynamicMessage;
  projectId: string;
  channelId: string;
  onlineUsers: OnlineUser[];
  onClose: () => void;
  onMinimize: () => void;
  onUpdate: () => void;
}

const DYNAMIC_ICONS: Record<string, { icon: typeof Vote; color: string }> = {
  'poll': { icon: Vote, color: 'text-blue-600' },
  'dot-voting': { icon: Vote, color: 'text-blue-600' },
  'blind-vote': { icon: Vote, color: 'text-blue-600' },
  'fist-of-five': { icon: Vote, color: 'text-blue-600' },
  'confidence-vote': { icon: Vote, color: 'text-blue-600' },
  'nps': { icon: Vote, color: 'text-blue-600' },
  'brainstorm': { icon: Lightbulb, color: 'text-yellow-600' },
  'mind-map': { icon: Lightbulb, color: 'text-yellow-600' },
  'pros-cons': { icon: Lightbulb, color: 'text-yellow-600' },
  'decision-matrix': { icon: Lightbulb, color: 'text-yellow-600' },
  'ranking': { icon: Lightbulb, color: 'text-yellow-600' },
  'retrospective': { icon: RotateCcw, color: 'text-purple-600' },
  'retro': { icon: RotateCcw, color: 'text-purple-600' },
  'team-health': { icon: RotateCcw, color: 'text-purple-600' },
  'mood': { icon: RotateCcw, color: 'text-purple-600' },
  'action-items': { icon: Target, color: 'text-green-600' },
  'checklist': { icon: Target, color: 'text-green-600' },
  'agenda': { icon: Target, color: 'text-green-600' },
  'parking-lot': { icon: Target, color: 'text-green-600' },
  'pomodoro': { icon: Target, color: 'text-green-600' },
  'estimation-poker': { icon: Target, color: 'text-green-600' },
  'kudos-wall': { icon: Heart, color: 'text-pink-600' },
  'icebreaker': { icon: Heart, color: 'text-pink-600' },
};

export default function DynamicFullscreen({
  dynamic,
  projectId,
  channelId,
  onlineUsers,
  onClose,
  onMinimize,
  onUpdate
}: DynamicFullscreenProps) {
  const { data: session } = useSession();
  const [closing, setClosing] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(5 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const iconConfig = DYNAMIC_ICONS[dynamic.commandType] || { icon: Target, color: 'text-gray-600' };
  const Icon = iconConfig.icon;

  const isClosed = dynamic.commandData?.closed ?? false;
  const isCreator = dynamic.commandData?.createdBy === session?.user?.id ||
                    dynamic.userId?._id === session?.user?.id;

  // Timer functionality
  useEffect(() => {
    if (timerRunning && (timerMinutes > 0 || timerSeconds > 0)) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev === 0) {
            setTimerMinutes(m => {
              if (m === 0) {
                // Timer finished
                setTimerRunning(false);
                // Play sound
                if (audioRef.current) {
                  audioRef.current.play().catch(() => {});
                }
                return 0;
              }
              return m - 1;
            });
            return 59;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning, timerMinutes, timerSeconds]);

  const startTimer = (minutes: number) => {
    setTimerMinutes(minutes);
    setTimerSeconds(0);
    setTimerInitialSeconds(minutes * 60);
    setTimerRunning(true);
    setShowTimer(true);
  };

  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    const mins = Math.floor(timerInitialSeconds / 60);
    setTimerMinutes(mins);
    setTimerSeconds(0);
  };

  const timerProgress = timerInitialSeconds > 0
    ? ((timerMinutes * 60 + timerSeconds) / timerInitialSeconds) * 100
    : 0;

  // Prevent body scroll when fullscreen is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Close/finalize the dynamic
  const handleCloseDynamic = async () => {
    if (!confirm('¿Estás seguro de que quieres finalizar esta dinámica? No se podrán hacer más cambios.')) {
      return;
    }

    setClosing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${dynamic._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandData: {
            ...dynamic.commandData,
            closed: true
          }
        })
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        alert('Error al cerrar la dinámica');
      }
    } catch (error) {
      console.error('Error closing dynamic:', error);
      alert('Error al cerrar la dinámica');
    } finally {
      setClosing(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onMinimize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMinimize]);

  const renderDynamicComponent = () => {
    const commonProps = {
      projectId,
      messageId: dynamic._id,
      channelId,
      onClose: onClose,
      onUpdate: onUpdate
    };

    switch (dynamic.commandType) {
      case 'poll':
        return (
          <PollCommand
            {...commonProps}
            question={dynamic.commandData.question}
            options={dynamic.commandData.options || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'brainstorm':
        return (
          <BrainstormCommand
            {...commonProps}
            topic={dynamic.commandData.title || dynamic.commandData.topic}
            ideas={dynamic.commandData.ideas || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'dot-voting':
        return (
          <DotVotingCommand
            {...commonProps}
            question={dynamic.commandData.question || dynamic.commandData.title}
            options={dynamic.commandData.options || []}
            totalDotsPerUser={dynamic.commandData.totalDotsPerUser || 5}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'blind-vote':
        return (
          <BlindVoteCommand
            {...commonProps}
            question={dynamic.commandData.question || dynamic.commandData.title}
            options={dynamic.commandData.options || []}
            createdBy={dynamic.commandData.createdBy}
            revealed={dynamic.commandData.revealed || false}
            closed={dynamic.commandData.closed}
          />
        );
      case 'nps':
        return (
          <NPSCommand
            {...commonProps}
            question={dynamic.commandData.question || dynamic.commandData.title}
            votes={dynamic.commandData.votes || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'mind-map':
        return (
          <MindMapCommand
            {...commonProps}
            title={dynamic.commandData.title}
            nodes={dynamic.commandData.nodes || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'decision-matrix':
        return (
          <DecisionMatrixCommand
            {...commonProps}
            title={dynamic.commandData.title}
            options={dynamic.commandData.options || []}
            criteria={dynamic.commandData.criteria || []}
            cells={dynamic.commandData.cells || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'action-items':
        return (
          <ActionItemsCommand
            {...commonProps}
            title={dynamic.commandData.title}
            items={dynamic.commandData.items || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'team-health':
        return (
          <TeamHealthCommand
            {...commonProps}
            title={dynamic.commandData.title}
            areas={dynamic.commandData.areas || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'confidence-vote':
        return (
          <ConfidenceVoteCommand
            {...commonProps}
            question={dynamic.commandData.question || dynamic.commandData.title}
            votes={dynamic.commandData.votes || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'agenda':
        return (
          <AgendaCommand
            {...commonProps}
            title={dynamic.commandData.title}
            items={dynamic.commandData.items || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'parking-lot':
        return (
          <ParkingLotCommand
            {...commonProps}
            title={dynamic.commandData.title}
            items={dynamic.commandData.items || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'kudos-wall':
        return (
          <KudosWallCommand
            {...commonProps}
            title={dynamic.commandData.title}
            kudos={dynamic.commandData.kudos || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'pomodoro':
        return (
          <PomodoroCommand
            {...commonProps}
            title={dynamic.commandData.title}
            workMinutes={dynamic.commandData.workMinutes || 25}
            breakMinutes={dynamic.commandData.breakMinutes || 5}
            isRunning={dynamic.commandData.isRunning || false}
            isPaused={dynamic.commandData.isPaused || false}
            timeRemaining={dynamic.commandData.timeRemaining || 25 * 60}
            isBreak={dynamic.commandData.isBreak || false}
            sessionsCompleted={dynamic.commandData.sessionsCompleted || 0}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'fist-of-five':
        return (
          <FistOfFiveCommand
            {...commonProps}
            question={dynamic.commandData.question || dynamic.commandData.title}
            votes={dynamic.commandData.votes || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'mood':
        return (
          <MoodCommand
            {...commonProps}
            question={dynamic.commandData.question || dynamic.commandData.title}
            moods={dynamic.commandData.moods || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'pros-cons':
        return (
          <ProsConsCommand
            {...commonProps}
            title={dynamic.commandData.title}
            pros={dynamic.commandData.pros || []}
            cons={dynamic.commandData.cons || []}
            createdBy={dynamic.commandData.createdBy}
          />
        );
      case 'ranking':
        return (
          <RankingCommand
            {...commonProps}
            question={dynamic.commandData.question || dynamic.commandData.title}
            options={dynamic.commandData.options || []}
            rankings={dynamic.commandData.rankings || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'checklist':
        return (
          <ChecklistCommand
            {...commonProps}
            title={dynamic.commandData.title}
            items={dynamic.commandData.items || []}
            createdBy={dynamic.commandData.createdBy}
          />
        );
      case 'estimation-poker':
        return (
          <EstimationPokerCommand
            {...commonProps}
            topic={dynamic.commandData.story || dynamic.commandData.title}
            estimates={dynamic.commandData.estimates || []}
            revealed={dynamic.commandData.revealed || false}
            finalEstimate={dynamic.commandData.finalEstimate}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'retrospective':
        return (
          <RetrospectiveCommand
            {...commonProps}
            title={dynamic.commandData.title}
            items={dynamic.commandData.items || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      case 'retro':
        return (
          <RetroCommand
            {...commonProps}
            title={dynamic.commandData.title}
            sections={dynamic.commandData.sections || []}
            type={dynamic.commandData.type || 'rose-bud-thorn'}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
            icon={<RotateCcw className="text-white" size={20} />}
            gradient="from-pink-50 to-green-50"
            border="border-pink-400"
          />
        );
      case 'icebreaker':
        return (
          <IcebreakerCommand
            {...commonProps}
            question={dynamic.commandData.question || dynamic.commandData.title}
            responses={dynamic.commandData.responses || []}
            createdBy={dynamic.commandData.createdBy}
            closed={dynamic.commandData.closed}
          />
        );
      default:
        return (
          <div className="text-center py-12 text-gray-500">
            Tipo de dinámica no soportado: {dynamic.commandType}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Bar */}
      <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700`}>
            <Icon className={iconConfig.color} size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {dynamic.commandData.title || dynamic.commandData.question || 'Dinámica'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Creado por {dynamic.userId.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Online Users */}
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-800"
                  title={user.info.name}
                >
                  {user.info.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xs font-medium border-2 border-white dark:border-gray-800">
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {onlineUsers.length} online
            </span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            {!showTimer ? (
              <div className="relative group">
                <button
                  onClick={() => setShowTimer(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition text-sm font-medium"
                >
                  <Timer size={16} />
                  Timer
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                {/* Timer presets */}
                {!timerRunning && timerMinutes === Math.floor(timerInitialSeconds / 60) && timerSeconds === 0 && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 5, 10].map(mins => (
                      <button
                        key={mins}
                        onClick={() => startTimer(mins)}
                        className="px-2 py-0.5 text-xs rounded bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 hover:bg-purple-300 dark:hover:bg-purple-700"
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                )}
                {/* Timer display */}
                {(timerRunning || timerMinutes !== Math.floor(timerInitialSeconds / 60) || timerSeconds !== 0) && (
                  <>
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-purple-200 dark:text-purple-800"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={100}
                          strokeDashoffset={100 - timerProgress}
                          className={`${timerMinutes === 0 && timerSeconds <= 30 ? 'text-red-500' : 'text-purple-600 dark:text-purple-400'}`}
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${timerMinutes === 0 && timerSeconds <= 30 ? 'text-red-600' : 'text-purple-700 dark:text-purple-300'}`}>
                        {timerMinutes}:{timerSeconds.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      onClick={toggleTimer}
                      className="p-1.5 rounded-lg bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 hover:bg-purple-300"
                    >
                      {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={resetTimer}
                      className="p-1.5 rounded-lg bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 hover:bg-purple-300"
                    >
                      <RotateCw size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowTimer(false);
                    setTimerRunning(false);
                  }}
                  className="p-1 text-purple-500 hover:text-purple-700"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {/* Hidden audio for timer end */}
            <audio ref={audioRef} src="/sounds/timer-end.mp3" preload="auto" />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Finalizar button - only for creator and not closed */}
            {isCreator && !isClosed && (
              <button
                onClick={handleCloseDynamic}
                disabled={closing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition text-sm font-medium disabled:opacity-50"
                title="Finalizar dinámica"
              >
                {closing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                Finalizar
              </button>
            )}
            {isClosed && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                <Lock size={14} />
                Finalizada
              </span>
            )}
            <button
              onClick={onMinimize}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
              title="Minimizar (Esc)"
            >
              <Minimize2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition"
              title="Salir"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          {renderDynamicComponent()}
        </div>
      </div>
    </div>
  );
}

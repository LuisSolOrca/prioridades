'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Heart,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Minus,
  Eye,
  EyeOff,
  Users,
  RotateCcw,
  Check
} from 'lucide-react';

interface MotivatorRanking {
visitorId: string;
  participantName: string;
  rankings: { id: string; order: number; impact: 'up' | 'down' | 'neutral' }[];
  revealed: boolean;
}

interface MovingMotivatorsCommandProps {
  projectId: string;
  messageId?: string;
  channelId: string;
  title: string;
  context?: string;
  rankings: MotivatorRanking[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const MOTIVATORS = [
  { id: 'curiosity', name: 'Curiosidad', emoji: '🔍', color: 'bg-purple-500', description: 'Necesidad de pensar, experimentar y aprender cosas nuevas' },
  { id: 'honor', name: 'Honor', emoji: '🎖️', color: 'bg-yellow-600', description: 'Orgullo de que tus valores personales se reflejen en tu trabajo' },
  { id: 'acceptance', name: 'Aceptación', emoji: '🤝', color: 'bg-pink-500', description: 'Ser aprobado y aceptado por las personas a tu alrededor' },
  { id: 'mastery', name: 'Maestría', emoji: '🎯', color: 'bg-orange-500', description: 'Ser competente y experto en lo que haces' },
  { id: 'power', name: 'Poder', emoji: '👑', color: 'bg-red-600', description: 'Tener influencia sobre lo que sucede y las personas' },
  { id: 'freedom', name: 'Libertad', emoji: '🦅', color: 'bg-sky-500', description: 'Independencia en tu trabajo y responsabilidades' },
  { id: 'relatedness', name: 'Relación', emoji: '💞', color: 'bg-rose-500', description: 'Tener buenas conexiones sociales con compañeros' },
  { id: 'order', name: 'Orden', emoji: '📋', color: 'bg-slate-500', description: 'Estabilidad, reglas claras y un ambiente predecible' },
  { id: 'goal', name: 'Meta', emoji: '🏆', color: 'bg-emerald-500', description: 'Propósito y significado en lo que haces' },
  { id: 'status', name: 'Estatus', emoji: '⭐', color: 'bg-amber-500', description: 'Reconocimiento social y buena posición' },
];

export default function MovingMotivatorsCommand({
  projectId,
  messageId,
  channelId,
  title,
  context,
  rankings,
  createdBy,
  closed,
  onClose,
  onUpdate
}: MovingMotivatorsCommandProps) {
  const { data: session } = useSession();
  const [localRankings, setLocalRankings] = useState<MotivatorRanking[]>(rankings);
  const [myRanking, setMyRanking] = useState<{ id: string; order: number; impact: 'up' | 'down' | 'neutral' }[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [showTeamView, setShowTeamView] = useState(false);

  const isCreator = createdBy === session?.user?.id;

  // Initialize or load user's ranking
  useEffect(() => {
    setLocalRankings(rankings);

    const existingRanking = rankings.find(r => r.visitorId === session?.user?.id);
    if (existingRanking) {
      setMyRanking(existingRanking.rankings);
      setIsRevealed(existingRanking.revealed);
    } else {
      // Initialize with default order
      setMyRanking(MOTIVATORS.map((m, idx) => ({
        id: m.id,
        order: idx,
        impact: 'neutral' as const
      })));
      setIsRevealed(false);
    }
  }, [rankings, session?.user?.id]);

  const updateCommandData = async (newRankings: MotivatorRanking[]) => {
    if (!messageId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandData: {
            title,
            context,
            rankings: newRankings,
            createdBy,
            closed
          }
        })
      });

      if (response.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating moving motivators:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (motivatorId: string) => {
    if (closed) return;
    setDraggedItem(motivatorId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId || closed) return;

    const newRanking = [...myRanking];
    const draggedIndex = newRanking.findIndex(r => r.id === draggedItem);
    const targetIndex = newRanking.findIndex(r => r.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Swap orders
      const draggedOrder = newRanking[draggedIndex].order;
      newRanking[draggedIndex].order = newRanking[targetIndex].order;
      newRanking[targetIndex].order = draggedOrder;
      setMyRanking(newRanking);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleImpactChange = (motivatorId: string, impact: 'up' | 'down' | 'neutral') => {
    if (closed) return;
    setMyRanking(prev => prev.map(r =>
      r.id === motivatorId ? { ...r, impact } : r
    ));
  };

  const handleMoveUp = (motivatorId: string) => {
    if (closed) return;
    const newRanking = [...myRanking];
    const currentIndex = newRanking.findIndex(r => r.id === motivatorId);
    const currentOrder = newRanking[currentIndex].order;

    if (currentOrder > 0) {
      const swapIndex = newRanking.findIndex(r => r.order === currentOrder - 1);
      if (swapIndex !== -1) {
        newRanking[currentIndex].order = currentOrder - 1;
        newRanking[swapIndex].order = currentOrder;
        setMyRanking(newRanking);
      }
    }
  };

  const handleMoveDown = (motivatorId: string) => {
    if (closed) return;
    const newRanking = [...myRanking];
    const currentIndex = newRanking.findIndex(r => r.id === motivatorId);
    const currentOrder = newRanking[currentIndex].order;

    if (currentOrder < MOTIVATORS.length - 1) {
      const swapIndex = newRanking.findIndex(r => r.order === currentOrder + 1);
      if (swapIndex !== -1) {
        newRanking[currentIndex].order = currentOrder + 1;
        newRanking[swapIndex].order = currentOrder;
        setMyRanking(newRanking);
      }
    }
  };

  const handleSaveRanking = async (reveal: boolean) => {
    if (!session?.user) return;

    const newRankings = localRankings.filter(r => r.visitorId !== session.user.id);
    newRankings.push({
visitorId: session.user.id,
      participantName: session.user.name || 'Usuario',
      rankings: myRanking,
      revealed: reveal
    });

    setLocalRankings(newRankings);
    setIsRevealed(reveal);
    await updateCommandData(newRankings);
  };

  const handleReset = () => {
    if (closed) return;
    setMyRanking(MOTIVATORS.map((m, idx) => ({
      id: m.id,
      order: idx,
      impact: 'neutral' as const
    })));
    setIsRevealed(false);
  };

  // Sort motivators by current ranking
  const sortedMotivators = [...myRanking]
    .sort((a, b) => a.order - b.order)
    .map(r => ({
      ...MOTIVATORS.find(m => m.id === r.id)!,
      impact: r.impact,
      order: r.order
    }));

  // Get revealed rankings for team view
  const revealedRankings = localRankings.filter(r => r.revealed);

  // Calculate team averages
  const getTeamAverages = () => {
    if (revealedRankings.length === 0) return [];

    return MOTIVATORS.map(motivator => {
      const positions = revealedRankings.map(r => {
        const ranking = r.rankings.find(rank => rank.id === motivator.id);
        return ranking ? ranking.order : 5;
      });
      const avg = positions.reduce((a, b) => a + b, 0) / positions.length;

      const impacts = revealedRankings.map(r => {
        const ranking = r.rankings.find(rank => rank.id === motivator.id);
        return ranking?.impact || 'neutral';
      });
      const upCount = impacts.filter(i => i === 'up').length;
      const downCount = impacts.filter(i => i === 'down').length;

      return {
        ...motivator,
        avgPosition: avg,
        upCount,
        downCount,
        neutralCount: impacts.length - upCount - downCount
      };
    }).sort((a, b) => a.avgPosition - b.avgPosition);
  };

  const teamAverages = getTeamAverages();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart size={24} />
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-rose-200 text-sm">Moving Motivators - Management 3.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-full px-3 py-1 text-sm">
              {revealedRankings.length} compartidos
            </div>
          </div>
        </div>

        {context && (
          <div className="mt-3 p-3 bg-white/10 rounded-lg">
            <p className="text-sm">
              <strong>Contexto:</strong> {context}
            </p>
          </div>
        )}
      </div>

      {/* Tab buttons */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowTeamView(false)}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            !showTeamView
              ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50 dark:bg-rose-900/20'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Mi Ranking
        </button>
        <button
          onClick={() => setShowTeamView(true)}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            showTeamView
              ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50 dark:bg-rose-900/20'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Users size={16} className="inline mr-2" />
          Vista del Equipo ({revealedRankings.length})
        </button>
      </div>

      <div className="p-6">
        {!showTeamView ? (
          /* My Ranking View */
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Arrastra las cartas para ordenar tus motivadores del más importante (arriba) al menos importante (abajo).
              {context && ' Indica cómo el cambio afecta cada motivador.'}
            </p>

            <div className="space-y-2">
              {sortedMotivators.map((motivator, idx) => (
                <div
                  key={motivator.id}
                  draggable={!closed}
                  onDragStart={() => handleDragStart(motivator.id)}
                  onDragOver={(e) => handleDragOver(e, motivator.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    draggedItem === motivator.id
                      ? 'opacity-50 border-dashed border-rose-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-rose-300'
                  } ${closed ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                >
                  {/* Drag handle */}
                  <div className="text-gray-400">
                    <GripVertical size={20} />
                  </div>

                  {/* Position number */}
                  <div className={`w-8 h-8 rounded-full ${motivator.color} text-white flex items-center justify-center font-bold text-sm`}>
                    {idx + 1}
                  </div>

                  {/* Emoji & Name */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{motivator.emoji}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {motivator.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {motivator.description}
                    </p>
                  </div>

                  {/* Impact buttons */}
                  {context && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleImpactChange(motivator.id, 'up')}
                        disabled={closed}
                        className={`p-1.5 rounded-lg transition ${
                          motivator.impact === 'up'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-green-100'
                        }`}
                        title="Impacto positivo"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        onClick={() => handleImpactChange(motivator.id, 'neutral')}
                        disabled={closed}
                        className={`p-1.5 rounded-lg transition ${
                          motivator.impact === 'neutral'
                            ? 'bg-gray-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                        }`}
                        title="Sin impacto"
                      >
                        <Minus size={18} />
                      </button>
                      <button
                        onClick={() => handleImpactChange(motivator.id, 'down')}
                        disabled={closed}
                        className={`p-1.5 rounded-lg transition ${
                          motivator.impact === 'down'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-red-100'
                        }`}
                        title="Impacto negativo"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  )}

                  {/* Move buttons for mobile */}
                  <div className="flex flex-col gap-1 md:hidden">
                    <button
                      onClick={() => handleMoveUp(motivator.id)}
                      disabled={closed || idx === 0}
                      className="p-1 rounded bg-gray-100 dark:bg-gray-700 disabled:opacity-30"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => handleMoveDown(motivator.id)}
                      disabled={closed || idx === sortedMotivators.length - 1}
                      className="p-1 rounded bg-gray-100 dark:bg-gray-700 disabled:opacity-30"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            {!closed && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <RotateCcw size={18} />
                  Reiniciar
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveRanking(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                  >
                    <EyeOff size={18} />
                    Guardar privado
                  </button>
                  <button
                    onClick={() => handleSaveRanking(true)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                  >
                    <Eye size={18} />
                    {isRevealed ? 'Actualizar' : 'Compartir'}
                  </button>
                </div>
              </div>
            )}

            {isRevealed && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                <Check size={18} />
                <span className="text-sm">Tu ranking está compartido con el equipo</span>
              </div>
            )}
          </div>
        ) : (
          /* Team View */
          <div>
            {revealedRankings.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aún no hay rankings compartidos</p>
                <p className="text-sm mt-2">Comparte tu ranking para que el equipo pueda verlo</p>
              </div>
            ) : (
              <>
                {/* Team averages */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Promedio del Equipo
                  </h4>
                  <div className="space-y-2">
                    {teamAverages.map((motivator, idx) => (
                      <div
                        key={motivator.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className={`w-8 h-8 rounded-full ${motivator.color} text-white flex items-center justify-center font-bold text-sm`}>
                          {idx + 1}
                        </div>
                        <span className="text-xl">{motivator.emoji}</span>
                        <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">
                          {motivator.name}
                        </span>
                        <div className="flex items-center gap-2 text-sm">
                          {motivator.upCount > 0 && (
                            <span className="text-green-600 flex items-center gap-1">
                              <ChevronUp size={14} /> {motivator.upCount}
                            </span>
                          )}
                          {motivator.downCount > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <ChevronDown size={14} /> {motivator.downCount}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          avg: {motivator.avgPosition.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual rankings */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Rankings Individuales
                  </h4>
                  <div className="grid gap-4">
                    {revealedRankings.map((ranking) => (
                      <div
                        key={ranking.visitorId}
                        className="p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                          {ranking.participantName}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[...ranking.rankings]
                            .sort((a, b) => a.order - b.order)
                            .map((r) => {
                              const motivator = MOTIVATORS.find(m => m.id === r.id);
                              if (!motivator) return null;
                              return (
                                <div
                                  key={r.id}
                                  className={`px-2 py-1 rounded-lg text-white text-xs flex items-center gap-1 ${motivator.color}`}
                                  title={motivator.name}
                                >
                                  {motivator.emoji}
                                  {r.impact === 'up' && <ChevronUp size={12} />}
                                  {r.impact === 'down' && <ChevronDown size={12} />}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

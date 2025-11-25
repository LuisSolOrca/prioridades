'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Activity } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Vote {
  userId: string;
  userName: string;
  rating: number; // 1-5 (1=Bad, 2=Concerning, 3=Okay, 4=Good, 5=Awesome)
}

interface Area {
  id: string;
  name: string;
  votes: Vote[];
}

interface TeamHealthCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  areas: Area[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const RATINGS = [
  { value: 1, label: 'Bad', emoji: '😞', color: 'bg-red-500' },
  { value: 2, label: 'Concerning', emoji: '🙁', color: 'bg-orange-500' },
  { value: 3, label: 'Okay', emoji: '😐', color: 'bg-yellow-500' },
  { value: 4, label: 'Good', emoji: '🙂', color: 'bg-blue-500' },
  { value: 5, label: 'Awesome', emoji: '😀', color: 'bg-green-500' }
];

export default function TeamHealthCommand({
  projectId,
  messageId,
  channelId,
  title,
  areas: initialAreas,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: TeamHealthCommandProps) {
  const { data: session } = useSession();
  const cardRef = useRef<HTMLDivElement>(null);
  const [areas, setAreas] = useState(initialAreas);
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar estado cuando llegan actualizaciones de Pusher
  useEffect(() => {
    setAreas(initialAreas);
    setClosed(initialClosed);
  }, [initialAreas, initialClosed]);

  const handleVote = async (areaId: string, rating: number) => {
    if (!session?.user || submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/team-health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId, rating })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al votar');
        return;
      }

      const data = await response.json();
      setAreas(data.commandData.areas);
      onUpdate?.();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error al votar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'team-health',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/team-health`, {
        method: 'DELETE'
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
      console.error('Error closing:', error);
      alert('Error al cerrar');
    } finally {
      setSubmitting(false);
    }
  };

  const getAreaAverage = (area: Area) => {
    if (area.votes.length === 0) return null;
    const sum = area.votes.reduce((acc, vote) => acc + vote.rating, 0);
    return sum / area.votes.length;
  };

  const getAverageColor = (avg: number | null) => {
    if (avg === null) return 'bg-gray-300';
    if (avg >= 4.5) return 'bg-green-500';
    if (avg >= 3.5) return 'bg-blue-500';
    if (avg >= 2.5) return 'bg-yellow-500';
    if (avg >= 1.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getUserVote = (area: Area) => {
    return area.votes.find(v => v.userId === session?.user?.id);
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-400 dark:border-purple-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Activity className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Team Health Check • {areas.length} áreas • {closed ? 'Cerrado' : 'Activo'}
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

      {/* Info */}
      {!closed && (
        <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 text-sm text-purple-800 dark:text-purple-200 mb-4">
          <p className="font-medium mb-1">📊 Spotify Health Check Model</p>
          <p className="text-xs">
            Vota cómo te sientes en cada área del equipo. Los promedios ayudan a identificar qué necesita atención.
          </p>
        </div>
      )}

      {/* Areas Grid */}
      <div className="space-y-4 mb-4">
        {areas.map((area) => {
          const avg = getAreaAverage(area);
          const userVote = getUserVote(area);

          return (
            <div
              key={area.id}
              className="bg-white dark:bg-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {area.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {area.votes.length} votos
                    {avg !== null && (
                      <span className="ml-2">
                        • Promedio: <span className="font-semibold">{avg.toFixed(1)}</span>
                      </span>
                    )}
                  </p>
                </div>
                {avg !== null && (
                  <div className={`w-12 h-12 ${getAverageColor(avg)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {RATINGS.find(r => Math.round(avg) === r.value)?.emoji}
                  </div>
                )}
              </div>

              {/* Voting Buttons */}
              {!closed && (
                <div className="flex gap-2 mb-3">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating.value}
                      onClick={() => handleVote(area.id, rating.value)}
                      disabled={submitting}
                      className={`flex-1 py-2 px-1 text-xs rounded-lg transition font-medium ${
                        userVote?.rating === rating.value
                          ? `${rating.color} text-white shadow-lg scale-105`
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                      }`}
                      title={rating.label}
                    >
                      <div className="text-lg">{rating.emoji}</div>
                      <div className="text-[10px] mt-1">{rating.label}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Votes Distribution */}
              {area.votes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">
                    Distribución:
                  </p>
                  <div className="flex gap-1 h-6 rounded overflow-hidden">
                    {RATINGS.map((rating) => {
                      const count = area.votes.filter(v => v.rating === rating.value).length;
                      const percentage = (count / area.votes.length) * 100;

                      return percentage > 0 ? (
                        <div
                          key={rating.value}
                          className={`${rating.color} flex items-center justify-center text-white text-xs font-bold`}
                          style={{ width: `${percentage}%` }}
                          title={`${rating.label}: ${count} voto${count !== 1 ? 's' : ''}`}
                        >
                          {count}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Team Health Check cerrado
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Health Check
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/team-health</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Coffee, CheckCircle, AlertCircle, AlertTriangle, Users, Calendar, Send } from 'lucide-react';

interface StandupCommandProps {
  projectId: string;
  onClose: () => void;
}

interface Standup {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  yesterday: string;
  today: string;
  blockers: string;
  risks: string;
  date: string;
  createdAt: string;
}

export default function StandupCommand({ projectId, onClose }: StandupCommandProps) {
  const { data: session } = useSession();
  const [view, setView] = useState<'form' | 'team'>('form');
  const [loading, setLoading] = useState(false);
  const [teamStandups, setTeamStandups] = useState<Standup[]>([]);
  const [myStandup, setMyStandup] = useState<Standup | null>(null);

  // Form fields
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [blockers, setBlockers] = useState('');
  const [risks, setRisks] = useState('');

  useEffect(() => {
    loadTodayStandups();
  }, [projectId]);

  const loadTodayStandups = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/projects/${projectId}/standups?date=${todayStr}`);

      if (response.ok) {
        const data = await response.json();
        setTeamStandups(data.standups || []);

        // Check if current user has already submitted standup today
        const userStandup = data.standups?.find(
          (s: Standup) => s.userId._id === session?.user?.id
        );

        if (userStandup) {
          setMyStandup(userStandup);
          setYesterday(userStandup.yesterday);
          setToday(userStandup.today);
          setBlockers(userStandup.blockers);
          setRisks(userStandup.risks);
        }
      }
    } catch (error) {
      console.error('Error loading standups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!yesterday.trim() || !today.trim()) {
      alert('Por favor completa al menos "Qué hice ayer" y "Qué haré hoy"');
      return;
    }

    try {
      setLoading(true);

      const method = myStandup ? 'PUT' : 'POST';
      const url = myStandup
        ? `/api/projects/${projectId}/standups/${myStandup._id}`
        : `/api/projects/${projectId}/standups`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yesterday: yesterday.trim(),
          today: today.trim(),
          blockers: blockers.trim(),
          risks: risks.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Error al guardar standup');
      }

      const standup = await response.json();
      setMyStandup(standup);
      await loadTodayStandups();
      setView('team');
      alert('✅ Standup guardado correctamente');
    } catch (error) {
      console.error('Error submitting standup:', error);
      alert('Error al guardar el standup');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `hace ${diffHours}h`;
    } else if (diffMins > 0) {
      return `hace ${diffMins}min`;
    } else {
      return 'ahora';
    }
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-orange-300 dark:border-orange-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-full flex items-center justify-center">
            <Coffee className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Daily Standup</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
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

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('form')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
            view === 'form'
              ? 'bg-orange-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          📝 Mi Standup
        </button>
        <button
          onClick={() => setView('team')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
            view === 'team'
              ? 'bg-orange-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          <Users className="inline mr-1" size={16} />
          Equipo ({teamStandups.length})
        </button>
      </div>

      {loading && view === 'form' ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando...</p>
        </div>
      ) : view === 'form' ? (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 space-y-4">
          {myStandup && (
            <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle size={16} />
                Ya completaste tu standup hoy. Puedes editarlo aquí.
              </p>
            </div>
          )}

          {/* Yesterday */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              ¿Qué hice ayer? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={yesterday}
              onChange={(e) => setYesterday(e.target.value)}
              placeholder="Ej: Completé la integración del API, revisé PRs del equipo..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[80px]"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {yesterday.length}/1000 caracteres
            </p>
          </div>

          {/* Today */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-blue-600" />
              ¿Qué haré hoy? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={today}
              onChange={(e) => setToday(e.target.value)}
              placeholder="Ej: Voy a trabajar en el dashboard, hacer code review..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[80px]"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {today.length}/1000 caracteres
            </p>
          </div>

          {/* Blockers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600" />
              ¿Bloqueadores?
            </label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Ej: Esperando acceso a la base de datos, dependencia de otro equipo..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[60px]"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {blockers.length}/500 caracteres
            </p>
          </div>

          {/* Risks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-600" />
              ¿Riesgos?
            </label>
            <textarea
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
              placeholder="Ej: Posible retraso por complejidad técnica, falta de claridad en requerimientos..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[60px]"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {risks.length}/500 caracteres
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !yesterday.trim() || !today.trim()}
            className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 text-white py-3 rounded-lg font-medium hover:from-orange-700 hover:to-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {myStandup ? 'Actualizar Standup' : 'Enviar Standup'}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Users size={18} />
            Standups del Equipo Hoy ({teamStandups.length})
          </h4>

          {teamStandups.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Coffee className="mx-auto mb-2" size={32} />
              <p>Aún no hay standups del equipo para hoy</p>
              <p className="text-xs mt-1">Sé el primero en completar tu standup!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {teamStandups.map((standup) => (
                <div
                  key={standup._id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 flex items-center justify-center text-white font-semibold text-sm">
                        {standup.userId.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {standup.userId.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {getTimeAgo(standup.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Yesterday */}
                  <div>
                    <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Ayer
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {standup.yesterday}
                    </p>
                  </div>

                  {/* Today */}
                  <div>
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Hoy
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {standup.today}
                    </p>
                  </div>

                  {/* Blockers */}
                  {standup.blockers && (
                    <div>
                      <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Bloqueadores
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {standup.blockers}
                      </p>
                    </div>
                  )}

                  {/* Risks */}
                  {standup.risks && (
                    <div>
                      <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Riesgos
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {standup.risks}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/standup</code>
      </div>
    </div>
  );
}

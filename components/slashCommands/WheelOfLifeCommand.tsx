'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Circle, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface LifeArea {
  id: string;
  area: string;
  currentScore: number;
  desiredScore: number;
  actions?: string;
  userId: string;
  userName: string;
}

const DEFAULT_AREAS = ['Salud', 'Relaciones', 'Trabajo', 'Finanzas', 'Creatividad', 'Aprendizaje', 'Bienestar', 'Contribución'];

interface WheelOfLifeCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  areas: LifeArea[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function WheelOfLifeCommand({
  projectId,
  messageId,
  channelId,
  title,
  areas: initialAreas,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: WheelOfLifeCommandProps) {
  const { data: session } = useSession();
  const [areas, setAreas] = useState<LifeArea[]>(initialAreas || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newArea, setNewArea] = useState({ area: '', currentScore: 5, desiredScore: 8, actions: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setAreas(initialAreas || []);
  }, [JSON.stringify(initialAreas)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddArea = async () => {
    if (!session?.user || !newArea.area.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/wheel-of-life`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newArea })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setAreas(data.commandData.areas || []);
      setNewArea({ area: '', currentScore: 5, desiredScore: 8, actions: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (areaId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/wheel-of-life`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAreas(data.commandData.areas || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;
    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'wheel-of-life', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/wheel-of-life`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const areaEmojis: Record<string, string> = {
    'Salud': '💪', 'Relaciones': '❤️', 'Trabajo': '💼', 'Finanzas': '💰',
    'Creatividad': '🎨', 'Aprendizaje': '📚', 'Bienestar': '🧘', 'Contribución': '🤝'
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-rose-400 dark:border-rose-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center">
            <Circle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Rueda de la Vida (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Wheel Visual */}
      <div className="relative w-64 h-64 mx-auto mb-6">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background circles */}
          {[...Array(10)].map((_, i) => (
            <circle key={i} cx="50" cy="50" r={5 + i * 5} fill="none" stroke="#fce7f3" strokeWidth="0.5" className="dark:stroke-gray-700" />
          ))}
          {/* Area segments */}
          {areas.slice(0, 8).map((area, i) => {
            const angle = (i * 45 - 90) * (Math.PI / 180);
            const r = area.currentScore * 5;
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            return (
              <g key={area.id}>
                <line x1="50" y1="50" x2={x} y2={y} stroke="#f43f5e" strokeWidth="2" opacity="0.7" />
                <circle cx={x} cy={y} r="3" fill="#f43f5e" />
              </g>
            );
          })}
          {/* Connect the dots */}
          {areas.length >= 2 && (
            <polygon
              points={areas.slice(0, 8).map((area, i) => {
                const angle = (i * 45 - 90) * (Math.PI / 180);
                const r = area.currentScore * 5;
                return `${50 + Math.cos(angle) * r},${50 + Math.sin(angle) * r}`;
              }).join(' ')}
              fill="#f43f5e" fillOpacity="0.2" stroke="#f43f5e" strokeWidth="1"
            />
          )}
          <circle cx="50" cy="50" r="3" fill="#f43f5e" />
        </svg>
        {/* Labels */}
        {areas.slice(0, 8).map((area, i) => {
          const angle = (i * 45 - 90) * (Math.PI / 180);
          const x = 50 + Math.cos(angle) * 58;
          const y = 50 + Math.sin(angle) * 58;
          return (
            <div key={area.id} className="absolute text-xs font-medium text-rose-700 dark:text-rose-300 whitespace-nowrap"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
              {areaEmojis[area.area] || '📌'} {area.area.substring(0, 6)}
            </div>
          );
        })}
      </div>

      {/* Quick Add Default Areas */}
      {!closed && areas.length === 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {DEFAULT_AREAS.map(area => (
            <button key={area} onClick={() => setNewArea({ ...newArea, area })}
              className="px-3 py-1 text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full hover:bg-rose-200">
              {areaEmojis[area]} {area}
            </button>
          ))}
        </div>
      )}

      {/* Areas List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {areas.map(area => (
          <div key={area.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm relative group">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                {areaEmojis[area.area] || '📌'} {area.area}
              </h4>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Actual</span>
                  <span>{area.currentScore}/10</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${getScoreColor(area.currentScore)}`} style={{ width: `${area.currentScore * 10}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Deseado</span>
                  <span>{area.desiredScore}/10</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${area.desiredScore * 10}%` }}></div>
                </div>
              </div>
            </div>
            {area.actions && <p className="text-xs text-gray-500 mt-2">🎯 {area.actions}</p>}
            <p className="text-xs text-gray-400 mt-2">— {area.userName}</p>
            {!closed && area.userId === session?.user?.id && (
              <button onClick={() => handleDelete(area.id)} disabled={submitting}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <input type="text" value={newArea.area} onChange={(e) => setNewArea({ ...newArea, area: e.target.value })}
              placeholder="Área de vida..." className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Puntuación Actual: {newArea.currentScore}</label>
                <input type="range" min="1" max="10" value={newArea.currentScore}
                  onChange={(e) => setNewArea({ ...newArea, currentScore: parseInt(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Puntuación Deseada: {newArea.desiredScore}</label>
                <input type="range" min="1" max="10" value={newArea.desiredScore}
                  onChange={(e) => setNewArea({ ...newArea, desiredScore: parseInt(e.target.value) })} className="w-full" />
              </div>
            </div>
            <input type="text" value={newArea.actions} onChange={(e) => setNewArea({ ...newArea, actions: e.target.value })}
              placeholder="Acciones para mejorar (opcional)" className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddArea} disabled={!newArea.area.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:bg-gray-400">Agregar Área</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-rose-300 dark:border-rose-600 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Agregar Área de Vida
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">{areas.length} áreas evaluadas</div>

      {!closed && createdBy === session?.user?.id && areas.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Rueda de la Vida
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Rueda de la Vida cerrada</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/wheel-of-life</code>
      </div>
    </div>
  );
}

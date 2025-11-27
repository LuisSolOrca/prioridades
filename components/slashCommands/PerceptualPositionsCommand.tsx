'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Perspective {
  id: string;
  position: '1st' | '2nd' | '3rd';
  insight: string;
  feelings?: string;
  needs?: string;
  userId: string;
  userName: string;
}

interface PerceptualPositionsCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  situation: string;
  otherParty?: string;
  perspectives: Perspective[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PerceptualPositionsCommand({
  projectId,
  messageId,
  channelId,
  title,
  situation,
  otherParty,
  perspectives: initialPerspectives,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: PerceptualPositionsCommandProps) {
  const { data: session } = useSession();
  const [perspectives, setPerspectives] = useState<Perspective[]>(initialPerspectives || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newPerspective, setNewPerspective] = useState<{ position: '1st' | '2nd' | '3rd'; insight: string; feelings: string; needs: string }>({ position: '1st', insight: '', feelings: '', needs: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPerspectives(initialPerspectives || []);
    setClosed(initialClosed);
  }, [initialPerspectives, initialClosed]);

  const handleAddPerspective = async () => {
    if (!session?.user || !newPerspective.insight.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/perceptual-positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newPerspective })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setPerspectives(data.commandData.perspectives || []);
      setNewPerspective({ position: '1st', insight: '', feelings: '', needs: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (perspectiveId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/perceptual-positions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perspectiveId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPerspectives(data.commandData.perspectives || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;
    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'perceptual-positions', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/perceptual-positions`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const positionConfig = {
    '1st': { label: '👤 1ª Posición', subtitle: 'Desde mí', color: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', desc: 'Mi perspectiva personal' },
    '2nd': { label: '🤝 2ª Posición', subtitle: 'Desde el otro', color: 'bg-green-100 border-green-400 text-green-700 dark:bg-green-900/30 dark:text-green-300', desc: 'Perspectiva del otro' },
    '3rd': { label: '👁️ 3ª Posición', subtitle: 'Observador', color: 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', desc: 'Vista neutral externa' }
  };

  const firstPos = perspectives.filter(p => p.position === '1st');
  const secondPos = perspectives.filter(p => p.position === '2nd');
  const thirdPos = perspectives.filter(p => p.position === '3rd');

  const renderPerspective = (p: Perspective) => (
    <div key={p.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm relative group">
      <p className="text-sm text-gray-800 dark:text-gray-100">{p.insight}</p>
      {p.feelings && <p className="text-xs text-pink-600 dark:text-pink-400 mt-1">💭 {p.feelings}</p>}
      {p.needs && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">🎯 {p.needs}</p>}
      <p className="text-xs text-gray-400 mt-2">— {p.userName}</p>
      {!closed && p.userId === session?.user?.id && (
        <button onClick={() => handleDelete(p.id)} disabled={submitting}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-violet-400 dark:border-violet-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Posiciones Perceptuales (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Situation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-violet-500">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">🎭 Situación</h4>
        <p className="text-gray-800 dark:text-gray-100">{situation}</p>
        {otherParty && <p className="text-sm text-violet-600 dark:text-violet-400 mt-2">👥 Otra parte: {otherParty}</p>}
      </div>

      {/* Visual Diagram */}
      <div className="flex justify-center items-center gap-4 mb-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">👤</div>
          <p className="text-xs text-blue-600 mt-1">1ª</p>
        </div>
        <div className="text-2xl text-gray-400">↔️</div>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">🤝</div>
          <p className="text-xs text-green-600 mt-1">2ª</p>
        </div>
        <div className="text-2xl text-gray-400">↔️</div>
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-lg">👁️</div>
          <p className="text-xs text-purple-600 mt-1">3ª</p>
        </div>
      </div>

      {/* Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {(['1st', '2nd', '3rd'] as const).map(pos => {
          const config = positionConfig[pos];
          const posPerspectives = pos === '1st' ? firstPos : pos === '2nd' ? secondPos : thirdPos;
          return (
            <div key={pos} className={`rounded-lg p-4 border-2 ${config.color}`}>
              <h4 className="text-center font-bold mb-1">{config.label}</h4>
              <p className="text-center text-xs mb-3 opacity-70">{config.desc}</p>
              <div className="space-y-2">
                {posPerspectives.map(renderPerspective)}
                {posPerspectives.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Sin perspectivas</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <select value={newPerspective.position} onChange={(e) => setNewPerspective({ ...newPerspective, position: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600">
              <option value="1st">👤 1ª Posición - Desde mí</option>
              <option value="2nd">🤝 2ª Posición - Desde el otro</option>
              <option value="3rd">👁️ 3ª Posición - Observador neutral</option>
            </select>
            <textarea value={newPerspective.insight} onChange={(e) => setNewPerspective({ ...newPerspective, insight: e.target.value })}
              placeholder="¿Qué observo desde esta posición?" className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" rows={2} />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="text" value={newPerspective.feelings} onChange={(e) => setNewPerspective({ ...newPerspective, feelings: e.target.value })}
                placeholder="Sentimientos (opcional)" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <input type="text" value={newPerspective.needs} onChange={(e) => setNewPerspective({ ...newPerspective, needs: e.target.value })}
                placeholder="Necesidades (opcional)" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddPerspective} disabled={!newPerspective.insight.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:bg-gray-400">Agregar Perspectiva</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-violet-300 dark:border-violet-600 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Agregar Perspectiva
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">
        {firstPos.length} 1ª • {secondPos.length} 2ª • {thirdPos.length} 3ª
      </div>

      {!closed && createdBy === session?.user?.id && perspectives.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Posiciones Perceptuales
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Posiciones Perceptuales cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/perceptual-positions</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Activity, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Triad {
  id: string;
  state: string;
  physiology: string;
  focus: string;
  language: string;
  userId: string;
  userName: string;
}

interface ActionTriadsCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  goal: string;
  triads: Triad[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ActionTriadsCommand({
  projectId,
  messageId,
  channelId,
  title,
  goal,
  triads: initialTriads,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: ActionTriadsCommandProps) {
  const { data: session } = useSession();
  const [triads, setTriads] = useState<Triad[]>(initialTriads || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newTriad, setNewTriad] = useState({ state: '', physiology: '', focus: '', language: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTriads(initialTriads || []);
    setClosed(initialClosed);
  }, [initialTriads, initialClosed]);

  const handleAddTriad = async () => {
    if (!session?.user || !newTriad.state.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/action-triads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newTriad })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setTriads(data.commandData.triads || []);
      setNewTriad({ state: '', physiology: '', focus: '', language: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (triadId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/action-triads`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triadId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTriads(data.commandData.triads || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;
    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'action-triads', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/action-triads`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-cyan-400 dark:border-cyan-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
            <Activity className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Triadas de Acción (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Goal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-cyan-500">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">🎯 Objetivo</h4>
        <p className="text-gray-800 dark:text-gray-100">{goal}</p>
      </div>

      {/* Visual Triangle */}
      <div className="flex justify-center mb-6">
        <div className="relative w-48 h-40">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center">
            <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center text-2xl">🧠</div>
            <p className="text-xs text-cyan-600 font-semibold mt-1">Estado</p>
          </div>
          <div className="absolute bottom-0 left-0 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-2xl">💪</div>
            <p className="text-xs text-green-600 font-semibold mt-1">Fisiología</p>
          </div>
          <div className="absolute bottom-0 right-0 text-center">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-2xl">🎯</div>
            <p className="text-xs text-purple-600 font-semibold mt-1">Enfoque</p>
          </div>
          {/* Lines connecting */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 192 160">
            <line x1="96" y1="32" x2="32" y2="128" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4" />
            <line x1="96" y1="32" x2="160" y2="128" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4" />
            <line x1="32" y1="128" x2="160" y2="128" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4" />
          </svg>
        </div>
      </div>

      {/* Triads */}
      <div className="space-y-4 mb-4">
        {triads.map(triad => (
          <div key={triad.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm relative group">
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 mb-3">
              <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">🧠 Estado Emocional</p>
              <p className="text-sm text-gray-800 dark:text-gray-100">{triad.state}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">💪 Fisiología</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{triad.physiology || '—'}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">🎯 Enfoque</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{triad.focus || '—'}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">💬 Lenguaje</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{triad.language || '—'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">— {triad.userName}</p>
            {!closed && triad.userId === session?.user?.id && (
              <button onClick={() => handleDelete(triad.id)} disabled={submitting}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {triads.length === 0 && <p className="text-center text-gray-500 py-8">Define tu primera triada de acción</p>}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <input type="text" value={newTriad.state} onChange={(e) => setNewTriad({ ...newTriad, state: e.target.value })}
              placeholder="Estado emocional deseado (ej: Confianza, Energía, Calma)..."
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input type="text" value={newTriad.physiology} onChange={(e) => setNewTriad({ ...newTriad, physiology: e.target.value })}
                placeholder="Fisiología (postura, respiración...)" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <input type="text" value={newTriad.focus} onChange={(e) => setNewTriad({ ...newTriad, focus: e.target.value })}
                placeholder="Enfoque (en qué pensar)" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <input type="text" value={newTriad.language} onChange={(e) => setNewTriad({ ...newTriad, language: e.target.value })}
                placeholder="Lenguaje (qué decirte)" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddTriad} disabled={!newTriad.state.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-400">Agregar Triada</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-cyan-300 dark:border-cyan-600 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Agregar Triada de Acción
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">{triads.length} triadas</div>

      {!closed && createdBy === session?.user?.id && triads.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Triadas de Acción
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Triadas de Acción cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/action-triads</code>
      </div>
    </div>
  );
}

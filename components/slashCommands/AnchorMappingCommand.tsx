'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Anchor, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface AnchorEntry {
  id: string;
  resource: string;
  situation: string;
  stimulus: string;
  association: string;
  intensity: number;
  userId: string;
  userName: string;
}

interface AnchorMappingCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  goal?: string;
  anchors: AnchorEntry[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function AnchorMappingCommand({
  projectId,
  messageId,
  channelId,
  title,
  goal,
  anchors: initialAnchors,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: AnchorMappingCommandProps) {
  const { data: session } = useSession();
  const [anchors, setAnchors] = useState<AnchorEntry[]>(initialAnchors || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newAnchor, setNewAnchor] = useState({ resource: '', situation: '', stimulus: '', association: '', intensity: 7 });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setAnchors(initialAnchors || []);
  }, [JSON.stringify(initialAnchors)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddAnchor = async () => {
    if (!session?.user || !newAnchor.resource.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/anchor-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newAnchor })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setAnchors(data.commandData.anchors || []);
      setNewAnchor({ resource: '', situation: '', stimulus: '', association: '', intensity: 7 });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (anchorId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/anchor-mapping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anchorId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAnchors(data.commandData.anchors || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;
    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'anchor-mapping', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/anchor-mapping`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 8) return 'bg-green-500';
    if (intensity >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-400 dark:border-blue-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Anchor className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Anchor Mapping (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {goal && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">🎯 Objetivo</h4>
          <p className="text-gray-800 dark:text-gray-100">{goal}</p>
        </div>
      )}

      {/* Visual Anchor */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <span className="text-4xl">⚓</span>
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">💪</div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm">🎯</div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">✨</div>
        </div>
      </div>

      {/* Anchors List */}
      <div className="space-y-4 mb-4">
        {anchors.map(anchor => (
          <div key={anchor.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm relative group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚓</span>
                <h4 className="font-bold text-gray-800 dark:text-gray-100">{anchor.resource}</h4>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Intensidad:</span>
                <div className={`px-2 py-0.5 rounded text-white text-xs font-bold ${getIntensityColor(anchor.intensity)}`}>
                  {anchor.intensity}/10
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">📍 Situación</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{anchor.situation || '—'}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-3">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">⚡ Estímulo/Ancla</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{anchor.stimulus || '—'}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">🔗 Asociación</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{anchor.association || '—'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">— {anchor.userName}</p>
            {!closed && anchor.userId === session?.user?.id && (
              <button onClick={() => handleDelete(anchor.id)} disabled={submitting}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {anchors.length === 0 && <p className="text-center text-gray-500 py-8">Crea tu primer anclaje de recursos</p>}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <input type="text" value={newAnchor.resource} onChange={(e) => setNewAnchor({ ...newAnchor, resource: e.target.value })}
              placeholder="Recurso deseado (ej: Confianza, Calma, Energía)..."
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input type="text" value={newAnchor.situation} onChange={(e) => setNewAnchor({ ...newAnchor, situation: e.target.value })}
                placeholder="Situación donde lo necesito" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <input type="text" value={newAnchor.stimulus} onChange={(e) => setNewAnchor({ ...newAnchor, stimulus: e.target.value })}
                placeholder="Estímulo/Ancla (gesto, palabra)" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <input type="text" value={newAnchor.association} onChange={(e) => setNewAnchor({ ...newAnchor, association: e.target.value })}
                placeholder="Memoria/Asociación positiva" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">Intensidad del recurso: {newAnchor.intensity}/10</label>
              <input type="range" min="1" max="10" value={newAnchor.intensity}
                onChange={(e) => setNewAnchor({ ...newAnchor, intensity: parseInt(e.target.value) })} className="w-full" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddAnchor} disabled={!newAnchor.resource.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400">Crear Anclaje</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Crear Nuevo Anclaje
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">{anchors.length} anclajes</div>

      {!closed && createdBy === session?.user?.id && anchors.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Anchor Mapping
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Anchor Mapping cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/anchor-mapping</code>
      </div>
    </div>
  );
}

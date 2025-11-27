'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Zap, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface SwishEntry {
  id: string;
  currentImage: string;
  desiredImage: string;
  trigger: string;
  resources: string;
  repetitions: number;
  userId: string;
  userName: string;
}

interface SwishPatternCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  behavior: string;
  entries: SwishEntry[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function SwishPatternCommand({
  projectId,
  messageId,
  channelId,
  title,
  behavior,
  entries: initialEntries,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: SwishPatternCommandProps) {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<SwishEntry[]>(initialEntries || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newEntry, setNewEntry] = useState({ currentImage: '', desiredImage: '', trigger: '', resources: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setEntries(initialEntries || []);
  }, [JSON.stringify(initialEntries)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddEntry = async () => {
    if (!session?.user || !newEntry.currentImage.trim() || !newEntry.desiredImage.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/swish-pattern`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newEntry })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setEntries(data.commandData.entries || []);
      setNewEntry({ currentImage: '', desiredImage: '', trigger: '', resources: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleIncrementRep = async (entryId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/swish-pattern`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment', entryId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setEntries(data.commandData.entries || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (entryId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/swish-pattern`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setEntries(data.commandData.entries || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;
    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'swish-pattern', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/swish-pattern`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-yellow-400 dark:border-yellow-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Swish Pattern (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Behavior to change */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-yellow-500">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">🎯 Comportamiento a Cambiar</h4>
        <p className="text-gray-800 dark:text-gray-100">{behavior}</p>
      </div>

      {/* Visual Swish */}
      <div className="flex items-center justify-center gap-4 mb-6 py-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-3xl border-2 border-red-300">
            😟
          </div>
          <p className="text-xs text-red-600 mt-1">Estado Actual</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-4xl animate-pulse">⚡</div>
          <p className="text-xs text-yellow-600 font-bold">SWISH!</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-3xl border-2 border-green-300">
            😊
          </div>
          <p className="text-xs text-green-600 mt-1">Estado Deseado</p>
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-4 mb-4">
        {entries.map(entry => (
          <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm relative group">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">📸 Imagen Actual</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{entry.currentImage}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">🌟 Imagen Deseada</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{entry.desiredImage}</p>
              </div>
            </div>
            {entry.trigger && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">🎯 Disparador: {entry.trigger}</p>
            )}
            {entry.resources && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">💪 Recursos: {entry.resources}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">— {entry.userName}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Repeticiones:</span>
                {!closed && entry.userId === session?.user?.id ? (
                  <button onClick={() => handleIncrementRep(entry.id)} disabled={submitting}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold hover:bg-yellow-600">
                    {entry.repetitions} ⚡+
                  </button>
                ) : (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">{entry.repetitions}</span>
                )}
              </div>
            </div>
            {!closed && entry.userId === session?.user?.id && (
              <button onClick={() => handleDelete(entry.id)} disabled={submitting}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-center text-gray-500 py-8">Crea tu primer patrón Swish</p>
        )}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <textarea value={newEntry.currentImage} onChange={(e) => setNewEntry({ ...newEntry, currentImage: e.target.value })}
              placeholder="Describe la imagen del estado actual (lo que ves, sientes, escuchas)..."
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" rows={2} />
            <textarea value={newEntry.desiredImage} onChange={(e) => setNewEntry({ ...newEntry, desiredImage: e.target.value })}
              placeholder="Describe la imagen del estado deseado (cómo te ves siendo exitoso)..."
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" rows={2} />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="text" value={newEntry.trigger} onChange={(e) => setNewEntry({ ...newEntry, trigger: e.target.value })}
                placeholder="Disparador (qué activa el estado)" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
              <input type="text" value={newEntry.resources} onChange={(e) => setNewEntry({ ...newEntry, resources: e.target.value })}
                placeholder="Recursos internos" className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddEntry} disabled={!newEntry.currentImage.trim() || !newEntry.desiredImage.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400">Crear Swish</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-yellow-300 dark:border-yellow-600 rounded-lg text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Crear Patrón Swish
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">{entries.length} patrones</div>

      {!closed && createdBy === session?.user?.id && entries.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Swish Pattern
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Swish Pattern cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/swish-pattern</code>
      </div>
    </div>
  );
}

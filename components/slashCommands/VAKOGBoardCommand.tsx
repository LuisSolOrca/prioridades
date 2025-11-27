'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface VAKOGEntry {
  id: string;
  system: 'visual' | 'auditory' | 'kinesthetic' | 'olfactory' | 'gustatory';
  preference: string;
  strategies: string;
  userId: string;
  userName: string;
}

interface VAKOGBoardCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  context?: string;
  entries: VAKOGEntry[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function VAKOGBoardCommand({
  projectId,
  messageId,
  channelId,
  title,
  context,
  entries: initialEntries,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: VAKOGBoardCommandProps) {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<VAKOGEntry[]>(initialEntries || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newEntry, setNewEntry] = useState<{ system: 'visual' | 'auditory' | 'kinesthetic' | 'olfactory' | 'gustatory'; preference: string; strategies: string }>({ system: 'visual', preference: '', strategies: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEntries(initialEntries || []);
    setClosed(initialClosed);
  }, [initialEntries, initialClosed]);

  const handleAddEntry = async () => {
    if (!session?.user || !newEntry.preference.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vakog-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newEntry })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setEntries(data.commandData.entries || []);
      setNewEntry({ system: 'visual', preference: '', strategies: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (entryId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vakog-board`, {
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
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'vakog-board', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/vakog-board`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const systemConfig = {
    visual: { label: '👁️ Visual', color: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', desc: 'Ve imágenes, colores, formas' },
    auditory: { label: '👂 Auditivo', color: 'bg-green-100 border-green-400 text-green-700 dark:bg-green-900/30 dark:text-green-300', desc: 'Escucha sonidos, voces, música' },
    kinesthetic: { label: '✋ Kinestésico', color: 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/30 dark:text-red-300', desc: 'Siente emociones, texturas, movimiento' },
    olfactory: { label: '👃 Olfativo', color: 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', desc: 'Percibe olores, aromas' },
    gustatory: { label: '👅 Gustativo', color: 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', desc: 'Siente sabores' }
  };

  const groupedBySystem = Object.keys(systemConfig).reduce((acc, sys) => {
    acc[sys] = entries.filter(e => e.system === sys);
    return acc;
  }, {} as Record<string, VAKOGEntry[]>);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-slate-400 dark:border-slate-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-slate-500 rounded-full flex items-center justify-center">
            <Eye className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">VAKOG Board (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {context && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-slate-500">
          <p className="text-gray-800 dark:text-gray-100">{context}</p>
        </div>
      )}

      {/* VAKOG Visual */}
      <div className="flex justify-center gap-3 mb-6">
        {Object.entries(systemConfig).map(([key, config]) => (
          <div key={key} className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 ${config.color}`}>
              {config.label.split(' ')[0]}
            </div>
            <p className="text-xs mt-1">{key.charAt(0).toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Entries by System */}
      <div className="space-y-4 mb-4">
        {Object.entries(systemConfig).map(([sys, config]) => {
          const sysEntries = groupedBySystem[sys];
          if (sysEntries.length === 0) return null;
          return (
            <div key={sys} className={`rounded-lg p-4 border-2 ${config.color}`}>
              <h4 className="font-bold mb-3">{config.label}</h4>
              <p className="text-xs opacity-70 mb-3">{config.desc}</p>
              <div className="space-y-2">
                {sysEntries.map(entry => (
                  <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm relative group">
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{entry.preference}</p>
                    {entry.strategies && <p className="text-xs text-gray-500 mt-1">💡 {entry.strategies}</p>}
                    <p className="text-xs text-gray-400 mt-2">— {entry.userName}</p>
                    {!closed && entry.userId === session?.user?.id && (
                      <button onClick={() => handleDelete(entry.id)} disabled={submitting}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-center text-gray-500 py-8">Mapea las preferencias sensoriales del equipo</p>}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <select value={newEntry.system} onChange={(e) => setNewEntry({ ...newEntry, system: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600">
              {Object.entries(systemConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <input type="text" value={newEntry.preference} onChange={(e) => setNewEntry({ ...newEntry, preference: e.target.value })}
              placeholder="Preferencia o característica..." className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <input type="text" value={newEntry.strategies} onChange={(e) => setNewEntry({ ...newEntry, strategies: e.target.value })}
              placeholder="Estrategias de comunicación (opcional)" className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddEntry} disabled={!newEntry.preference.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-slate-500 text-white rounded-lg hover:bg-slate-600 disabled:bg-gray-400">Agregar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Agregar Preferencia Sensorial
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">{entries.length} entradas</div>

      {!closed && createdBy === session?.user?.id && entries.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar VAKOG Board
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">VAKOG Board cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/vakog-board</code>
      </div>
    </div>
  );
}

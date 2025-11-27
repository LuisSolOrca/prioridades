'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface MetaphorEntry {
  id: string;
  section: 'current' | 'desired' | 'characters' | 'obstacles' | 'resources' | 'transformation';
  text: string;
  userId: string;
  userName: string;
}

interface MetaphorCanvasCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  situation?: string;
  entries: MetaphorEntry[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function MetaphorCanvasCommand({
  projectId,
  messageId,
  channelId,
  title,
  situation,
  entries: initialEntries,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: MetaphorCanvasCommandProps) {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<MetaphorEntry[]>(initialEntries || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newEntry, setNewEntry] = useState<{ section: 'current' | 'desired' | 'characters' | 'obstacles' | 'resources' | 'transformation'; text: string }>({ section: 'current', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setEntries(initialEntries || []);
  }, [JSON.stringify(initialEntries)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddEntry = async (section: typeof newEntry.section) => {
    if (!session?.user || !newEntry.text.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/metaphor-canvas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', section, text: newEntry.text })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setEntries(data.commandData.entries || []);
      setNewEntry({ section: 'current', text: '' });
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (entryId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/metaphor-canvas`, {
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
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'metaphor-canvas', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/metaphor-canvas`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const sectionConfig = {
    current: { label: '📖 Metáfora Actual', color: 'bg-red-50 border-red-300 dark:bg-red-900/20', icon: '📖', desc: '¿Cómo describes el problema actual como historia?' },
    desired: { label: '✨ Metáfora Deseada', color: 'bg-green-50 border-green-300 dark:bg-green-900/20', icon: '✨', desc: '¿Cómo sería la historia ideal?' },
    characters: { label: '👥 Personajes', color: 'bg-blue-50 border-blue-300 dark:bg-blue-900/20', icon: '👥', desc: '¿Quiénes aparecen en la historia?' },
    obstacles: { label: '🪨 Obstáculos', color: 'bg-amber-50 border-amber-300 dark:bg-amber-900/20', icon: '🪨', desc: '¿Qué desafíos enfrenta el protagonista?' },
    resources: { label: '⚔️ Recursos', color: 'bg-purple-50 border-purple-300 dark:bg-purple-900/20', icon: '⚔️', desc: '¿Qué herramientas/aliados tiene?' },
    transformation: { label: '🦋 Transformación', color: 'bg-pink-50 border-pink-300 dark:bg-pink-900/20', icon: '🦋', desc: '¿Cómo cambia el héroe al final?' }
  };

  const groupedEntries = Object.keys(sectionConfig).reduce((acc, sec) => {
    acc[sec] = entries.filter(e => e.section === sec);
    return acc;
  }, {} as Record<string, MetaphorEntry[]>);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-fuchsia-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-fuchsia-400 dark:border-fuchsia-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-fuchsia-500 rounded-full flex items-center justify-center">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Metaphor Canvas (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {situation && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-fuchsia-500">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">🎭 Situación</h4>
          <p className="text-gray-800 dark:text-gray-100">{situation}</p>
        </div>
      )}

      {/* Story Arc Visual */}
      <div className="flex justify-center items-center gap-2 mb-6 py-4 overflow-x-auto">
        <div className="text-center min-w-[60px]">
          <div className="text-2xl">📖</div>
          <p className="text-xs">Inicio</p>
        </div>
        <div className="text-gray-300">→</div>
        <div className="text-center min-w-[60px]">
          <div className="text-2xl">👥</div>
          <p className="text-xs">Personajes</p>
        </div>
        <div className="text-gray-300">→</div>
        <div className="text-center min-w-[60px]">
          <div className="text-2xl">🪨</div>
          <p className="text-xs">Obstáculos</p>
        </div>
        <div className="text-gray-300">→</div>
        <div className="text-center min-w-[60px]">
          <div className="text-2xl">⚔️</div>
          <p className="text-xs">Recursos</p>
        </div>
        <div className="text-gray-300">→</div>
        <div className="text-center min-w-[60px]">
          <div className="text-2xl">🦋</div>
          <p className="text-xs">Transformación</p>
        </div>
        <div className="text-gray-300">→</div>
        <div className="text-center min-w-[60px]">
          <div className="text-2xl">✨</div>
          <p className="text-xs">Final</p>
        </div>
      </div>

      {/* Canvas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {(Object.entries(sectionConfig) as [keyof typeof sectionConfig, typeof sectionConfig[keyof typeof sectionConfig]][]).map(([key, config]) => (
          <div key={key} className={`rounded-lg p-4 border-2 ${config.color}`}>
            <h4 className="font-bold text-sm mb-1">{config.label}</h4>
            <p className="text-xs text-gray-500 mb-3">{config.desc}</p>
            <div className="space-y-2 mb-3">
              {groupedEntries[key]?.map(entry => (
                <div key={entry.id} className="bg-white dark:bg-gray-800 rounded p-2 shadow-sm relative group">
                  <p className="text-sm text-gray-800 dark:text-gray-100">{entry.text}</p>
                  <p className="text-xs text-gray-400 mt-1">— {entry.userName}</p>
                  {!closed && entry.userId === session?.user?.id && (
                    <button onClick={() => handleDelete(entry.id)} disabled={submitting}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition">
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!closed && (
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder={`Agregar a ${config.label.split(' ')[1]}...`}
                  className="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-900 dark:border-gray-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim()) {
                        setNewEntry({ section: key, text: input.value });
                        setTimeout(() => {
                          handleAddEntry(key);
                          input.value = '';
                        }, 0);
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector(`input[placeholder="Agregar a ${config.label.split(' ')[1]}..."]`) as HTMLInputElement;
                    if (input?.value.trim()) {
                      setNewEntry({ section: key, text: input.value });
                      setTimeout(() => {
                        handleAddEntry(key);
                        input.value = '';
                      }, 0);
                    }
                  }}
                  className="p-1 bg-fuchsia-500 text-white rounded hover:bg-fuchsia-600"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">{entries.length} elementos en la metáfora</div>

      {!closed && createdBy === session?.user?.id && entries.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Metaphor Canvas
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Metaphor Canvas cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/metaphor-canvas</code>
      </div>
    </div>
  );
}

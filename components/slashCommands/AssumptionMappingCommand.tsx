'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, AlertTriangle, HelpCircle } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Assumption {
  id: string;
  text: string;
  importance: number; // 1-5
  certainty: number; // 1-5
  userId: string;
  userName: string;
}

interface AssumptionMappingCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  assumptions: Assumption[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function AssumptionMappingCommand({
  projectId,
  messageId,
  channelId,
  title,
  assumptions: initialAssumptions,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: AssumptionMappingCommandProps) {
  const { data: session } = useSession();
  const [assumptions, setAssumptions] = useState<Assumption[]>(initialAssumptions || []);
  const [closed, setClosed] = useState(initialClosed);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssumption, setNewAssumption] = useState({ text: '', importance: 3, certainty: 3 });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setAssumptions(initialAssumptions || []);
  }, [JSON.stringify(initialAssumptions)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddAssumption = async () => {
    if (!session?.user || !newAssumption.text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/assumption-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssumption)
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setAssumptions(data.commandData.assumptions || []);
      setNewAssumption({ text: '', importance: 3, certainty: 3 });
      setShowAddModal(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAssumption = async (assumptionId: string, importance: number, certainty: number) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/assumption-mapping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', assumptionId, importance, certainty })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setAssumptions(data.commandData.assumptions || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssumption = async (assumptionId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/assumption-mapping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', assumptionId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setAssumptions(data.commandData.assumptions || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseMapping = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'assumption-mapping',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/assumption-mapping`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Classify assumptions into quadrants
  const getQuadrant = (a: Assumption) => {
    const highImportance = a.importance >= 3;
    const lowCertainty = a.certainty <= 2;

    if (highImportance && lowCertainty) return 'test-first'; // High importance, low certainty - test these first!
    if (highImportance && !lowCertainty) return 'monitor'; // High importance, high certainty - monitor
    if (!highImportance && lowCertainty) return 'later'; // Low importance, low certainty - test later
    return 'safe'; // Low importance, high certainty - safe assumptions
  };

  const quadrants = {
    'test-first': { title: '🔴 Probar Primero', color: 'bg-red-100 dark:bg-red-900/30 border-red-300', desc: 'Alta importancia, baja certeza' },
    'monitor': { title: '🟡 Monitorear', color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300', desc: 'Alta importancia, alta certeza' },
    'later': { title: '🔵 Probar Después', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300', desc: 'Baja importancia, baja certeza' },
    'safe': { title: '🟢 Seguras', color: 'bg-green-100 dark:bg-green-900/30 border-green-300', desc: 'Baja importancia, alta certeza' }
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-orange-400 dark:border-orange-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <HelpCircle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Assumption Mapping {closed ? '• Cerrado' : '• Activo'} • {assumptions.length} supuestos
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Info Box */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-4 text-sm text-gray-600 dark:text-gray-300">
        <p><strong>Assumption Mapping:</strong> Mapea tus supuestos según importancia (para el éxito) y certeza (qué tan seguro estás). Los supuestos de alta importancia y baja certeza deben probarse primero.</p>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {(Object.entries(quadrants) as [string, typeof quadrants['test-first']][]).map(([key, quadrant]) => {
          const items = assumptions.filter(a => getQuadrant(a) === key);
          return (
            <div key={key} className={`${quadrant.color} rounded-lg p-4 border`}>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{quadrant.title}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{quadrant.desc}</p>

              <div className="space-y-2">
                {items.map(assumption => (
                  <div key={assumption.id} className="bg-white dark:bg-gray-700 rounded p-3 group relative">
                    <p className="text-sm text-gray-800 dark:text-gray-100 pr-8 mb-2">{assumption.text}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Importancia: {assumption.importance}/5</span>
                      <span>Certeza: {assumption.certainty}/5</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">— {assumption.userName}</p>

                    {!closed && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        {assumption.userId === session?.user?.id && (
                          <button
                            onClick={() => handleDeleteAssumption(assumption.id)}
                            disabled={submitting}
                            className="p-1 text-red-500 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    {!closed && (
                      <div className="mt-2 flex gap-2">
                        <select
                          value={assumption.importance}
                          onChange={(e) => handleUpdateAssumption(assumption.id, Number(e.target.value), assumption.certainty)}
                          className="text-xs px-2 py-1 rounded border bg-white dark:bg-gray-600"
                        >
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>Imp: {n}</option>)}
                        </select>
                        <select
                          value={assumption.certainty}
                          onChange={(e) => handleUpdateAssumption(assumption.id, assumption.importance, Number(e.target.value))}
                          className="text-xs px-2 py-1 rounded border bg-white dark:bg-gray-600"
                        >
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>Cert: {n}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Sin supuestos</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Button */}
      {!closed && (
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full mb-4 py-3 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Agregar Supuesto
        </button>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Nuevo Supuesto</h4>

            <textarea
              value={newAssumption.text}
              onChange={(e) => setNewAssumption({ ...newAssumption, text: e.target.value })}
              placeholder="Describe el supuesto que estás haciendo..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 resize-none mb-3"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Importancia (para el éxito)
                </label>
                <select
                  value={newAssumption.importance}
                  onChange={(e) => setNewAssumption({ ...newAssumption, importance: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                >
                  <option value={1}>1 - Muy baja</option>
                  <option value={2}>2 - Baja</option>
                  <option value={3}>3 - Media</option>
                  <option value={4}>4 - Alta</option>
                  <option value={5}>5 - Crítica</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Certeza (qué tan seguro)
                </label>
                <select
                  value={newAssumption.certainty}
                  onChange={(e) => setNewAssumption({ ...newAssumption, certainty: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                >
                  <option value={1}>1 - Muy incierto</option>
                  <option value={2}>2 - Incierto</option>
                  <option value={3}>3 - Algo seguro</option>
                  <option value={4}>4 - Bastante seguro</option>
                  <option value={5}>5 - Muy seguro</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300">
                Cancelar
              </button>
              <button onClick={handleAddAssumption} disabled={!newAssumption.text.trim() || submitting} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && assumptions.length > 0 && (
        <button onClick={handleCloseMapping} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Assumption Mapping
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Assumption Mapping cerrado • {assumptions.length} supuestos mapeados
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/assumption-mapping</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Compass, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Value {
  id: string;
  name: string;
  importance: number;
  currentState: number;
  notes?: string;
  userId: string;
  userName: string;
}

interface ValuesWheelCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  context?: string;
  values: Value[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ValuesWheelCommand({
  projectId,
  messageId,
  channelId,
  title,
  context,
  values: initialValues,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: ValuesWheelCommandProps) {
  const { data: session } = useSession();
  const [values, setValues] = useState<Value[]>(initialValues || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newValue, setNewValue] = useState({ name: '', importance: 8, currentState: 5, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local cuando las props cambian (Pusher updates)
  useEffect(() => {
    setValues(initialValues || []);
  }, [JSON.stringify(initialValues)]);

  useEffect(() => {
    setClosed(initialClosed);
  }, [initialClosed]);

  const handleAddValue = async () => {
    if (!session?.user || !newValue.name.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/values-wheel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newValue })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setValues(data.commandData.values || []);
      setNewValue({ name: '', importance: 8, currentState: 5, notes: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (valueId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/values-wheel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setValues(data.commandData.values || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;
    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'values-wheel', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/values-wheel`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const getGapColor = (gap: number) => {
    if (gap <= 2) return 'text-green-500';
    if (gap <= 4) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <Compass className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Rueda de Valores (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {context && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-amber-500">
          <p className="text-gray-800 dark:text-gray-100">{context}</p>
        </div>
      )}

      {/* Values Wheel Visual */}
      <div className="relative w-64 h-64 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-amber-200 dark:border-amber-800"></div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="absolute inset-0 rounded-full border border-amber-100 dark:border-amber-900"
            style={{ transform: `scale(${1 - i * 0.1})` }}></div>
        ))}
        {values.slice(0, 8).map((v, i) => {
          const angle = (i * 45 - 90) * (Math.PI / 180);
          const r = 100;
          const x = 128 + Math.cos(angle) * r;
          const y = 128 + Math.sin(angle) * r;
          return (
            <div key={v.id} className="absolute text-xs font-medium text-amber-700 dark:text-amber-300"
              style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}>
              {v.name.substring(0, 8)}
            </div>
          );
        })}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">🧭</span>
        </div>
      </div>

      {/* Values List */}
      <div className="space-y-3 mb-4">
        {values.map(v => {
          const gap = v.importance - v.currentState;
          return (
            <div key={v.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm relative group">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{v.name}</h4>
                <span className={`text-sm font-bold ${getGapColor(gap)}`}>Gap: {gap}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Importancia</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${v.importance * 10}%` }}></div>
                    </div>
                    <span className="text-sm font-medium">{v.importance}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Estado Actual</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${v.currentState * 10}%` }}></div>
                    </div>
                    <span className="text-sm font-medium">{v.currentState}</span>
                  </div>
                </div>
              </div>
              {v.notes && <p className="text-xs text-gray-500 mt-2">💬 {v.notes}</p>}
              <p className="text-xs text-gray-400 mt-2">— {v.userName}</p>
              {!closed && v.userId === session?.user?.id && (
                <button onClick={() => handleDelete(v.id)} disabled={submitting}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
        {values.length === 0 && <p className="text-center text-gray-500 py-8">Agrega valores para evaluar</p>}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <input type="text" value={newValue.name} onChange={(e) => setNewValue({ ...newValue, name: e.target.value })}
              placeholder="Nombre del valor (ej: Integridad, Creatividad...)" className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Importancia (1-10): {newValue.importance}</label>
                <input type="range" min="1" max="10" value={newValue.importance}
                  onChange={(e) => setNewValue({ ...newValue, importance: parseInt(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Estado Actual (1-10): {newValue.currentState}</label>
                <input type="range" min="1" max="10" value={newValue.currentState}
                  onChange={(e) => setNewValue({ ...newValue, currentState: parseInt(e.target.value) })} className="w-full" />
              </div>
            </div>
            <input type="text" value={newValue.notes} onChange={(e) => setNewValue({ ...newValue, notes: e.target.value })}
              placeholder="Notas (opcional)" className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddValue} disabled={!newValue.name.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-400">Agregar Valor</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-amber-300 dark:border-amber-600 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Agregar Valor
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">{values.length} valores</div>

      {!closed && createdBy === session?.user?.id && values.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Rueda de Valores
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Rueda de Valores cerrada</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/values-wheel</code>
      </div>
    </div>
  );
}

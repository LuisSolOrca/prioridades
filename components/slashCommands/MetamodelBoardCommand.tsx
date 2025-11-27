'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface LanguagePattern {
  id: string;
  type: 'generalization' | 'deletion' | 'distortion';
  original: string;
  challenge: string;
  clarified?: string;
  userId: string;
  userName: string;
}

interface MetamodelBoardCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  context?: string;
  patterns: LanguagePattern[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function MetamodelBoardCommand({
  projectId,
  messageId,
  channelId,
  title,
  context,
  patterns: initialPatterns,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: MetamodelBoardCommandProps) {
  const { data: session } = useSession();
  const [patterns, setPatterns] = useState<LanguagePattern[]>(initialPatterns || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newPattern, setNewPattern] = useState<{ type: 'generalization' | 'deletion' | 'distortion'; original: string; challenge: string; clarified: string }>({ type: 'generalization', original: '', challenge: '', clarified: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPatterns(initialPatterns || []);
    setClosed(initialClosed);
  }, [initialPatterns, initialClosed]);

  const handleAddPattern = async () => {
    if (!session?.user || !newPattern.original.trim() || submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/metamodel-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newPattern })
      });
      if (!response.ok) { alert('Error al agregar'); return; }
      const data = await response.json();
      setPatterns(data.commandData.patterns || []);
      setNewPattern({ type: 'generalization', original: '', challenge: '', clarified: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (patternId: string) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/metamodel-board`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPatterns(data.commandData.patterns || []);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;
    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, { projectId, channelId, commandType: 'metamodel-board', title });
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/metamodel-board`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) { console.error('Error:', error); }
    finally { setSubmitting(false); }
  };

  const typeConfig = {
    generalization: {
      label: '🌐 Generalización',
      color: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      desc: 'Todo, nunca, siempre, nadie...',
      examples: ['Todos piensan que...', 'Nunca funciona', 'Siempre pasa lo mismo']
    },
    deletion: {
      label: '🔍 Omisión',
      color: 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      desc: 'Información faltante',
      examples: ['Están molestos', '¿Quiénes?', 'Es mejor así', '¿Mejor que qué?']
    },
    distortion: {
      label: '🔀 Distorsión',
      color: 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      desc: 'Interpretaciones, lecturas de mente',
      examples: ['Sé que no le agrado', 'Me hace enojar', 'No puedo porque...']
    }
  };

  const generalizations = patterns.filter(p => p.type === 'generalization');
  const deletions = patterns.filter(p => p.type === 'deletion');
  const distortions = patterns.filter(p => p.type === 'distortion');

  const renderPattern = (pattern: LanguagePattern) => {
    const config = typeConfig[pattern.type];
    return (
      <div key={pattern.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm relative group">
        <div className={`inline-block px-2 py-0.5 rounded text-xs mb-2 border ${config.color}`}>{config.label}</div>
        <div className="space-y-2">
          <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">💬 Frase Original</p>
            <p className="text-sm text-gray-800 dark:text-gray-100 italic">"{pattern.original}"</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">❓ Pregunta Desafiante</p>
            <p className="text-sm text-gray-800 dark:text-gray-100">{pattern.challenge || '—'}</p>
          </div>
          {pattern.clarified && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold">✅ Clarificación</p>
              <p className="text-sm text-gray-800 dark:text-gray-100">{pattern.clarified}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">— {pattern.userName}</p>
        {!closed && pattern.userId === session?.user?.id && (
          <button onClick={() => handleDelete(pattern.id)} disabled={submitting}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-emerald-400 dark:border-emerald-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <MessageCircle className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Metamodelo del Lenguaje (PNL) {closed ? '• Cerrado' : '• Activo'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {context && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-emerald-500">
          <p className="text-gray-800 dark:text-gray-100">{context}</p>
        </div>
      )}

      {/* Type Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {Object.entries(typeConfig).map(([key, config]) => (
          <div key={key} className={`rounded-lg p-3 border-2 ${config.color}`}>
            <h4 className="font-bold text-sm mb-1">{config.label}</h4>
            <p className="text-xs opacity-70">{config.desc}</p>
          </div>
        ))}
      </div>

      {/* Patterns */}
      <div className="space-y-4 mb-4">
        {patterns.map(renderPattern)}
        {patterns.length === 0 && (
          <p className="text-center text-gray-500 py-8">Identifica patrones de lenguaje para clarificar</p>
        )}
      </div>

      {/* Add Form */}
      {!closed && (
        showForm ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <select value={newPattern.type} onChange={(e) => setNewPattern({ ...newPattern, type: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600">
              <option value="generalization">🌐 Generalización (todo, nunca, siempre...)</option>
              <option value="deletion">🔍 Omisión (información faltante)</option>
              <option value="distortion">🔀 Distorsión (interpretaciones, lectura de mente)</option>
            </select>
            <textarea value={newPattern.original} onChange={(e) => setNewPattern({ ...newPattern, original: e.target.value })}
              placeholder="Frase original a analizar..."
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" rows={2} />
            <input type="text" value={newPattern.challenge} onChange={(e) => setNewPattern({ ...newPattern, challenge: e.target.value })}
              placeholder="Pregunta desafiante (¿Todos? ¿Siempre? ¿Cómo sabes que...?)"
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <input type="text" value={newPattern.clarified} onChange={(e) => setNewPattern({ ...newPattern, clarified: e.target.value })}
              placeholder="Clarificación resultante (opcional)"
              className="w-full px-3 py-2 text-sm border rounded-lg mb-3 bg-white dark:bg-gray-900 dark:border-gray-600" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddPattern} disabled={!newPattern.original.trim() || submitting}
                className="flex-1 px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-400">Agregar Patrón</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-emerald-300 dark:border-emerald-600 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 flex items-center justify-center gap-2">
            <Plus size={18} /> Identificar Patrón de Lenguaje
          </button>
        )
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400 my-4">
        {generalizations.length} generalizaciones • {deletions.length} omisiones • {distortions.length} distorsiones
      </div>

      {!closed && createdBy === session?.user?.id && patterns.length > 0 && (
        <button onClick={handleClose} disabled={submitting} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium">
          Cerrar Metamodel Board
        </button>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">Metamodel Board cerrado</div>}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/metamodel-board</code>
      </div>
    </div>
  );
}

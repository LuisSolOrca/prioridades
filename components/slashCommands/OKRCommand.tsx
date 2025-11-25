'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Target, Plus } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface KeyResult {
  description: string;
  progress: number;
}

interface Objective {
  title: string;
  keyResults: KeyResult[];
}

interface OKRCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  objectives: Objective[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function OKRCommand({
  projectId,
  messageId,
  channelId,
  title,
  objectives: initialObjectives,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: OKRCommandProps) {
  const { data: session } = useSession();
  const cardRef = useRef<HTMLDivElement>(null);
  const [objectives, setObjectives] = useState(initialObjectives);
  const [closed, setClosed] = useState(initialClosed);
  const [objTitle, setObjTitle] = useState('');
  const [krDesc, setKrDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar estado cuando llegan actualizaciones de Pusher
  useEffect(() => {
    setObjectives(initialObjectives);
    setClosed(initialClosed);
  }, [initialObjectives, initialClosed]);

  const handleAddObjective = async () => {
    if (!objTitle.trim() || submitting || closed) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/okr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-objective', title: objTitle.trim() })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setObjectives(data.commandData.objectives);
      setObjTitle('');
      onUpdate?.();
    } catch (error) {
      alert('Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddKR = async (objIndex: number) => {
    if (!krDesc.trim() || submitting || closed) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/okr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-kr', objectiveIndex: objIndex, description: krDesc.trim() })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setObjectives(data.commandData.objectives);
      setKrDesc('');
      onUpdate?.();
    } catch (error) {
      alert('Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProgress = async (objIndex: number, krIndex: number, progress: number) => {
    if (submitting || closed) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/okr`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectiveIndex: objIndex, krIndex, progress })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setObjectives(data.commandData.objectives);
      onUpdate?.();
    } catch (error) {
      alert('Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (session?.user?.id !== createdBy) return;
    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'okr',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/okr`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      alert('Error al cerrar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-amber-400 dark:border-amber-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center">
            <Target className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">OKRs • {objectives.length} objetivos</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="space-y-4 mb-4">
        {objectives.map((obj, objIdx) => {
          const avgProgress = obj.keyResults.length > 0
            ? obj.keyResults.reduce((acc, kr) => acc + kr.progress, 0) / obj.keyResults.length
            : 0;

          return (
            <div key={objIdx} className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900 dark:text-gray-100">🎯 {obj.title}</h4>
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {Math.round(avgProgress)}%
                </span>
              </div>
              <div className="space-y-2">
                {obj.keyResults.map((kr, krIdx) => (
                  <div key={krIdx} className="pl-4 border-l-2 border-amber-300">
                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">{kr.description}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        value={kr.progress}
                        onChange={(e) => handleUpdateProgress(objIdx, krIdx, parseInt(e.target.value))}
                        disabled={submitting || closed}
                        className="flex-1"
                        min="0"
                        max="100"
                      />
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-12">
                        {kr.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {!closed && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={krDesc}
                    onChange={(e) => setKrDesc(e.target.value)}
                    placeholder="Nuevo Key Result..."
                    className="flex-1 px-2 py-1 text-xs border rounded"
                  />
                  <button
                    onClick={() => handleAddKR(objIdx)}
                    disabled={!krDesc.trim() || submitting}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white text-xs rounded"
                  >
                    + KR
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-3 flex gap-2">
          <input
            value={objTitle}
            onChange={(e) => setObjTitle(e.target.value)}
            placeholder="Nuevo Objetivo..."
            className="flex-1 px-3 py-2 text-sm border rounded-lg"
          />
          <button
            onClick={handleAddObjective}
            disabled={!objTitle.trim() || submitting}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
          >
            <Plus size={16} />
            Agregar
          </button>
        </div>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-3 text-sm text-gray-700 dark:text-gray-300">🔒 Cerrado</div>}
      {!closed && createdBy === session?.user?.id && (
        <button onClick={handleClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cerrar</button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/okr</code>
      </div>
    </div>
  );
}

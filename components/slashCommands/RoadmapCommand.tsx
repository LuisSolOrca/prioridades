'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Map, Plus } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Milestone {
  title: string;
  date: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface RoadmapCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  milestones: Milestone[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function RoadmapCommand({
  projectId,
  messageId,
  channelId,
  title,
  milestones: initialMilestones,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: RoadmapCommandProps) {
  const { data: session } = useSession();
  const cardRef = useRef<HTMLDivElement>(null);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [closed, setClosed] = useState(initialClosed);
  const [msTitle, setMsTitle] = useState('');
  const [msDate, setMsDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!msTitle.trim() || !msDate || submitting || closed) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: msTitle.trim(), date: msDate })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setMilestones(data.commandData.milestones);
      setMsTitle('');
      setMsDate('');
      onUpdate?.();
    } catch (error) {
      alert('Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (index: number, status: string) => {
    if (submitting || closed) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/roadmap`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneIndex: index, status })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setMilestones(data.commandData.milestones);
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
        commandType: 'roadmap',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/roadmap`, { method: 'DELETE' });
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

  const sortedMilestones = [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-teal-400 dark:border-teal-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
            <Map className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Roadmap • {milestones.length} milestones</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="relative mb-4">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-teal-300"></div>
        <div className="space-y-3">
          {sortedMilestones.map((ms, idx) => {
            const isPast = new Date(ms.date) < new Date();
            return (
              <div key={idx} className="relative pl-10">
                <div className={`absolute left-2 w-5 h-5 rounded-full ${
                  ms.status === 'completed' ? 'bg-green-500' :
                  ms.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-400'
                } border-2 border-white`}></div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{ms.title}</p>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(ms.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {!closed && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUpdateStatus(milestones.indexOf(ms), 'pending')}
                        disabled={submitting}
                        className={`text-xs px-2 py-1 rounded ${ms.status === 'pending' ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        Pendiente
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(milestones.indexOf(ms), 'in-progress')}
                        disabled={submitting}
                        className={`text-xs px-2 py-1 rounded ${ms.status === 'in-progress' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        En Progreso
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(milestones.indexOf(ms), 'completed')}
                        disabled={submitting}
                        className={`text-xs px-2 py-1 rounded ${ms.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        Completado
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-3 space-y-2">
          <input
            value={msTitle}
            onChange={(e) => setMsTitle(e.target.value)}
            placeholder="Título del milestone..."
            className="w-full px-3 py-2 text-sm border rounded-lg"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={msDate}
              onChange={(e) => setMsDate(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-lg"
            />
            <button
              onClick={handleAdd}
              disabled={!msTitle.trim() || !msDate || submitting}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
            >
              <Plus size={16} />
              Agregar
            </button>
          </div>
        </div>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-3 text-sm text-gray-700 dark:text-gray-300">🔒 Cerrado</div>}
      {!closed && createdBy === session?.user?.id && (
        <button onClick={handleClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cerrar</button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/roadmap</code>
      </div>
    </div>
  );
}

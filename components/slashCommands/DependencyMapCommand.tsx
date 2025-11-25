'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { GitBranch, Plus } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Task {
  name: string;
  dependencies: string[];
  status: 'pending' | 'completed';
}

interface DependencyMapCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  tasks: Task[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function DependencyMapCommand({
  projectId,
  messageId,
  channelId,
  title,
  tasks: initialTasks,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: DependencyMapCommandProps) {
  const { data: session } = useSession();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState(initialTasks);
  const [closed, setClosed] = useState(initialClosed);
  const [taskName, setTaskName] = useState('');
  const [dependencies, setDependencies] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar estado cuando llegan actualizaciones de Pusher
  useEffect(() => {
    setTasks(initialTasks);
    setClosed(initialClosed);
  }, [initialTasks, initialClosed]);

  const handleAdd = async () => {
    if (!taskName.trim() || submitting || closed) return;
    try {
      setSubmitting(true);
      const deps = dependencies.split(',').map(d => d.trim()).filter(d => d);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/dependency-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: taskName.trim(), dependencies: deps })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTasks(data.commandData.tasks);
      setTaskName('');
      setDependencies('');
      onUpdate?.();
    } catch (error) {
      alert('Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (index: number) => {
    if (submitting || closed) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/dependency-map`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIndex: index })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTasks(data.commandData.tasks);
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
        commandType: 'dependency-map',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/dependency-map`, { method: 'DELETE' });
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

  const canComplete = (task: Task) => {
    return task.dependencies.every(depName =>
      tasks.find(t => t.name === depName)?.status === 'completed'
    );
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-slate-400 dark:border-slate-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-full flex items-center justify-center">
            <GitBranch className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Dependency Map • {tasks.length} tareas</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="space-y-2 mb-4">
        {tasks.map((task, idx) => {
          const blocked = !canComplete(task) && task.status === 'pending';
          return (
            <div
              key={idx}
              className={`bg-white dark:bg-gray-700 rounded-lg p-3 ${blocked ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => handleToggle(idx)}
                  disabled={submitting || closed || blocked}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {task.name}
                  </p>
                  {task.dependencies.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      <span className="text-gray-500">Depende de:</span>
                      {task.dependencies.map((dep, i) => {
                        const depTask = tasks.find(t => t.name === dep);
                        return (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded ${
                              depTask?.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {dep}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {blocked && (
                    <p className="text-xs text-red-600 mt-1">
                      🔒 Bloqueado - completa las dependencias primero
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-3 space-y-2">
          <input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Nombre de la tarea..."
            className="w-full px-3 py-2 text-sm border rounded-lg"
          />
          <input
            value={dependencies}
            onChange={(e) => setDependencies(e.target.value)}
            placeholder="Dependencias (separadas por coma)..."
            className="w-full px-3 py-2 text-sm border rounded-lg"
          />
          <button
            onClick={handleAdd}
            disabled={!taskName.trim() || submitting}
            className="w-full px-4 py-2 bg-slate-500 hover:bg-slate-600 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Agregar Tarea
          </button>
        </div>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-3 text-sm text-gray-700 dark:text-gray-300">🔒 Cerrado</div>}
      {!closed && createdBy === session?.user?.id && (
        <button onClick={handleClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cerrar</button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/dependency-map</code>
      </div>
    </div>
  );
}

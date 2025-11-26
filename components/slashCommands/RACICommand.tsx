'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Users } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Role {
  id: string;
  name: string;
  userId: string;
  userName: string;
}

interface Task {
  id: string;
  name: string;
  userId: string;
  userName: string;
  assignments: Record<string, 'R' | 'A' | 'C' | 'I' | null>;
}

interface RACICommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  roles: Role[];
  tasks: Task[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const RACI_COLORS = {
  R: 'bg-red-500 text-white',
  A: 'bg-blue-500 text-white',
  C: 'bg-yellow-500 text-white',
  I: 'bg-green-500 text-white'
};

const RACI_LABELS = {
  R: 'Responsible (Responsable)',
  A: 'Accountable (Aprobador)',
  C: 'Consulted (Consultado)',
  I: 'Informed (Informado)'
};

export default function RACICommand({
  projectId,
  messageId,
  channelId,
  title,
  roles: initialRoles,
  tasks: initialTasks,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: RACICommandProps) {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<Role[]>(initialRoles || []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [closed, setClosed] = useState(initialClosed);
  const [newRole, setNewRole] = useState('');
  const [newTask, setNewTask] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRoles(initialRoles || []);
    setTasks(initialTasks || []);
    setClosed(initialClosed);
  }, [initialRoles, initialTasks, initialClosed]);

  const handleAddRole = async () => {
    if (!session?.user || !newRole.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/raci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addRole', name: newRole.trim() })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRoles(data.commandData.roles || []);
      setTasks(data.commandData.tasks || []);
      setNewRole('');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTask = async () => {
    if (!session?.user || !newTask.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/raci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addTask', name: newTask.trim() })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setTasks(data.commandData.tasks || []);
      setNewTask('');
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetAssignment = async (taskId: string, roleId: string, value: 'R' | 'A' | 'C' | 'I' | null) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/raci`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setAssignment', taskId, roleId, value })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setTasks(data.commandData.tasks || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/raci`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteRole', roleId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRoles(data.commandData.roles || []);
      setTasks(data.commandData.tasks || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/raci`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteTask', taskId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setTasks(data.commandData.tasks || []);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRACI = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'raci',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/raci`, {
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

  const cycleRaci = (current: 'R' | 'A' | 'C' | 'I' | null): 'R' | 'A' | 'C' | 'I' | null => {
    const cycle: Array<'R' | 'A' | 'C' | 'I' | null> = ['R', 'A', 'C', 'I', null];
    const currentIndex = cycle.indexOf(current);
    return cycle[(currentIndex + 1) % cycle.length];
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Matriz RACI {closed ? '• Cerrada' : '• Activa'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(RACI_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1 text-xs">
            <span className={`w-6 h-6 rounded flex items-center justify-center font-bold ${color}`}>{key}</span>
            <span className="text-gray-600 dark:text-gray-400">{RACI_LABELS[key as keyof typeof RACI_LABELS].split('(')[0]}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[150px]">
                Tareas / Roles
              </th>
              {roles.map((role) => (
                <th key={role.id} className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[100px] relative group">
                  {role.name}
                  {!closed && role.userId === session?.user?.id && (
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={submitting}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </th>
              ))}
              {!closed && (
                <th className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      placeholder="Nuevo rol..."
                      className="w-24 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                    />
                    <button
                      onClick={handleAddRole}
                      disabled={!newRole.trim() || submitting}
                      className="p-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-400"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="group">
                <td className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-sm text-gray-800 dark:text-gray-100 relative">
                  {task.name}
                  {!closed && task.userId === session?.user?.id && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={submitting}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </td>
                {roles.map((role) => {
                  const assignment = task.assignments?.[role.id] || null;
                  return (
                    <td
                      key={role.id}
                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-center"
                    >
                      {!closed ? (
                        <button
                          onClick={() => handleSetAssignment(task.id, role.id, cycleRaci(assignment))}
                          disabled={submitting}
                          className={`w-8 h-8 rounded font-bold text-sm transition ${
                            assignment
                              ? RACI_COLORS[assignment]
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-400 hover:bg-gray-300'
                          }`}
                        >
                          {assignment || '-'}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex w-8 h-8 rounded font-bold text-sm items-center justify-center ${
                            assignment
                              ? RACI_COLORS[assignment]
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                          }`}
                        >
                          {assignment || '-'}
                        </span>
                      )}
                    </td>
                  );
                })}
                {!closed && <td className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800" />}
              </tr>
            ))}
            {!closed && (
              <tr>
                <td className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-2" colSpan={roles.length + 2}>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Nueva tarea..."
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={!newTask.trim() || submitting}
                      className="p-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-400"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {roles.length === 0 && tasks.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">Agrega roles (columnas) y tareas (filas) para comenzar</p>
        </div>
      )}

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && (roles.length > 0 || tasks.length > 0) && (
        <button
          onClick={handleCloseRACI}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar Matriz RACI
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          Matriz RACI cerrada • {roles.length} roles • {tasks.length} tareas
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/raci</code>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Users } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface Member {
  userName: string;
  hoursPerDay: number;
}

interface CapacityCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  members: Member[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function CapacityCommand({
  projectId,
  messageId,
  channelId,
  title,
  members: initialMembers,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: CapacityCommandProps) {
  const { data: session } = useSession();
  const cardRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState(initialMembers);
  const [closed, setClosed] = useState(initialClosed);
  const [userName, setUserName] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!userName.trim() || submitting || closed) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/capacity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: userName.trim(), hoursPerDay })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setMembers(data.commandData.members);
      setUserName('');
      setHoursPerDay(8);
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
        commandType: 'capacity',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/capacity`, { method: 'DELETE' });
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

  const totalHours = members.reduce((acc, m) => acc + m.hoursPerDay, 0);

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-violet-400 dark:border-violet-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Capacidad • {members.length} miembros • {totalHours}h/día total
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {members.map((member, idx) => (
            <div key={idx} className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{member.userName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{member.hoursPerDay}h/día</p>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-center text-2xl font-bold text-violet-600 dark:text-violet-400">
            {totalHours} horas/día
          </p>
          <p className="text-center text-xs text-gray-600 dark:text-gray-400 mt-1">
            {totalHours * 5}h/semana • {Math.round(totalHours * 5 / 8 * 10) / 10} días/semana
          </p>
        </div>
      </div>

      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 mb-3 space-y-2">
          <div className="flex gap-2">
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nombre del miembro..."
              className="flex-1 px-3 py-2 text-sm border rounded-lg"
            />
            <input
              type="number"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Math.max(1, Math.min(24, parseInt(e.target.value) || 8)))}
              className="w-20 px-3 py-2 text-sm border rounded-lg"
              min="1"
              max="24"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!userName.trim() || submitting}
            className="w-full px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:bg-gray-400 text-white rounded-lg"
          >
            Agregar Miembro
          </button>
        </div>
      )}

      {closed && <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-3 text-sm text-gray-700 dark:text-gray-300">🔒 Cerrado</div>}
      {!closed && createdBy === session?.user?.id && (
        <button onClick={handleClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cerrar</button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/capacity</code>
      </div>
    </div>
  );
}

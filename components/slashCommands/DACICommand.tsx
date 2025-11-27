'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, Plus, Trash2, Check, Users } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';

interface DACIRole {
  id: string;
  userId: string;
  userName: string;
  role: 'driver' | 'approver' | 'contributor' | 'informed';
}

interface DACICommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  decision: string;
  roles: DACIRole[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const ROLE_CONFIG = {
  driver: { label: 'Driver (D)', description: 'Responsable de impulsar la decisión', color: 'bg-blue-500', icon: '🎯' },
  approver: { label: 'Approver (A)', description: 'Aprueba la decisión final', color: 'bg-red-500', icon: '✅' },
  contributor: { label: 'Contributor (C)', description: 'Aporta información y opinión', color: 'bg-green-500', icon: '💡' },
  informed: { label: 'Informed (I)', description: 'Debe ser informado', color: 'bg-gray-500', icon: '📢' },
};

export default function DACICommand({
  projectId,
  messageId,
  channelId,
  title,
  decision,
  roles: initialRoles,
  status: initialStatus,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: DACICommandProps) {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<DACIRole[]>(initialRoles || []);
  const [status, setStatus] = useState(initialStatus || 'draft');
  const [closed, setClosed] = useState(initialClosed);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRoles(initialRoles || []);
    setStatus(initialStatus || 'draft');
    setClosed(initialClosed);
  }, [initialRoles, initialStatus, initialClosed]);

  const handleAssignRole = async (role: 'driver' | 'approver' | 'contributor' | 'informed') => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/daci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', role })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al asignar');
        return;
      }

      const data = await response.json();
      setRoles(data.commandData.roles || []);
      setStatus(data.commandData.status);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/daci`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      setRoles(data.commandData.roles || []);
      setStatus(data.commandData.status);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!session?.user || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/daci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: approved ? 'approve' : 'reject' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error');
        return;
      }

      const data = await response.json();
      setStatus(data.commandData.status);
      onUpdate?.();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'daci',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/daci`, {
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

  const getRolesByType = (type: string) => roles.filter(r => r.role === type);
  const isApprover = roles.some(r => r.role === 'approver' && r.userId === session?.user?.id);
  const hasApprover = roles.some(r => r.role === 'approver');
  const hasDriver = roles.some(r => r.role === 'driver');
  const myRole = roles.find(r => r.userId === session?.user?.id);

  const statusColors = {
    draft: 'bg-gray-200 text-gray-700',
    pending: 'bg-yellow-200 text-yellow-800',
    approved: 'bg-green-200 text-green-800',
    rejected: 'bg-red-200 text-red-800'
  };

  const statusLabels = {
    draft: 'Borrador',
    pending: 'Pendiente Aprobación',
    approved: 'Aprobado ✅',
    rejected: 'Rechazado ❌'
  };

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-slate-400 dark:border-slate-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
            <Shield className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              DACI Framework {closed ? '• Cerrado' : '• Activo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </div>

      {/* Decision */}
      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 border-l-4 border-slate-500">
        <p className="text-xs text-gray-500 uppercase mb-1">Decisión a tomar</p>
        <p className="font-medium text-gray-800 dark:text-gray-100">{decision || title}</p>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {(Object.entries(ROLE_CONFIG) as [keyof typeof ROLE_CONFIG, typeof ROLE_CONFIG.driver][]).map(([key, config]) => {
          const roleMembers = getRolesByType(key);
          const isMyRole = myRole?.role === key;

          return (
            <div key={key} className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${config.color}`}></span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{config.label}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{config.description}</p>

              <div className="space-y-1 mb-2">
                {roleMembers.map((r) => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-600 rounded px-2 py-1">
                    <span className="text-xs text-gray-700 dark:text-gray-200">{r.userName}</span>
                    {!closed && r.userId === session?.user?.id && (
                      <button
                        onClick={() => handleRemoveRole(r.id)}
                        disabled={submitting}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!closed && !myRole && (
                <button
                  onClick={() => handleAssignRole(key)}
                  disabled={submitting}
                  className={`w-full text-xs py-1 rounded ${config.color} text-white hover:opacity-80 disabled:opacity-50`}
                >
                  Unirme
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Approval Section */}
      {!closed && status === 'pending' && isApprover && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4 border border-yellow-300">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3">
            ¿Apruebas esta decisión?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(true)}
              disabled={submitting}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded font-medium flex items-center justify-center gap-2"
            >
              <Check size={16} /> Aprobar
            </button>
            <button
              onClick={() => handleApprove(false)}
              disabled={submitting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded font-medium"
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Request Approval Button */}
      {!closed && status === 'draft' && hasDriver && hasApprover && createdBy === session?.user?.id && (
        <button
          onClick={() => handleApprove(true)}
          disabled={submitting}
          className="w-full mb-4 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-medium"
        >
          Solicitar Aprobación
        </button>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        <Users className="inline-block mr-1" size={14} />
        {roles.length} participantes asignados
      </div>

      {/* Close Button */}
      {!closed && createdBy === session?.user?.id && (status === 'approved' || status === 'rejected') && (
        <button
          onClick={handleClose}
          disabled={submitting}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
        >
          Cerrar DACI
        </button>
      )}

      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-400">
          DACI cerrado
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/daci</code>
      </div>
    </div>
  );
}

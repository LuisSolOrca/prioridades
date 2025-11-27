'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CheckSquare, Square, Trash2, Plus } from 'lucide-react';
import { captureCardScreenshot } from '@/lib/captureCardScreenshot';
import { LinkifyText } from '@/lib/linkify';

interface ActionItem {
  description: string;
  assignedTo: string;
  assignedToName: string;
  dueDate: string;
  completed: boolean;
  createdBy: string;
  createdByName: string;
  completedAt?: string;
}

interface ActionItemsCommandProps {
  projectId: string;
  messageId: string;
  channelId: string;
  title: string;
  items: ActionItem[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ActionItemsCommand({
  projectId,
  messageId,
  channelId,
  title,
  items: initialItems,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: ActionItemsCommandProps) {
  const { data: session } = useSession();
  const cardRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(initialItems);
  const [closed, setClosed] = useState(initialClosed);
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar estado cuando llegan actualizaciones de Pusher
  useEffect(() => {
    setItems(initialItems);
    setClosed(initialClosed);
  }, [initialItems, initialClosed]);

  const handleAddItem = async () => {
    const desc = description.trim();
    const assigned = assignedTo.trim();
    const due = dueDate.trim();

    if (!desc || !assigned || !due || !session?.user || submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/action-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, assignedTo: assigned, dueDate: due })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar item');
        return;
      }

      const data = await response.json();
      setItems(data.commandData.items);
      setDescription('');
      setAssignedTo('');
      setDueDate('');
      onUpdate?.();
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error al agregar item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (itemIndex: number) => {
    if (submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/action-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex, action: 'toggle' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al actualizar');
        return;
      }

      const data = await response.json();
      setItems(data.commandData.items);
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling item:', error);
      alert('Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemIndex: number) => {
    if (submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/action-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex, action: 'delete' })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al eliminar');
        return;
      }

      const data = await response.json();
      setItems(data.commandData.items);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error al eliminar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!session?.user?.id || session.user.id !== createdBy) return;

    try {
      setSubmitting(true);

      // Capturar screenshot antes de cerrar
      await captureCardScreenshot(cardRef.current, {
        projectId,
        channelId,
        commandType: 'action-items',
        title
      });

      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/action-items`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al cerrar');
        return;
      }

      const data = await response.json();
      setClosed(data.commandData.closed);
      onUpdate?.();
    } catch (error) {
      console.error('Error closing:', error);
      alert('Error al cerrar');
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const overdueCount = items.filter(item => !item.completed && new Date(item.dueDate) < new Date()).length;

  return (
    <div ref={cardRef} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-green-400 dark:border-green-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckSquare className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Action Items • {items.length} total • {completedCount} completados
              {overdueCount > 0 && <span className="text-red-600 dark:text-red-400"> • {overdueCount} vencidos</span>}
              {closed && ' • Cerrado'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-2 mb-4">
        {items.map((item, index) => {
          const isOverdue = !item.completed && new Date(item.dueDate) < new Date();
          const canDelete = item.createdBy === session?.user?.id || session?.user?.role === 'ADMIN';

          return (
            <div
              key={index}
              className={`bg-white dark:bg-gray-700 rounded-lg p-3 text-sm group relative ${
                item.completed ? 'opacity-60' : ''
              } ${isOverdue ? 'border-l-4 border-red-500' : ''}`}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => handleToggleComplete(index)}
                  disabled={submitting || closed}
                  className="mt-1 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
                >
                  {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
                <div className="flex-1">
                  <p className={`text-gray-800 dark:text-gray-100 ${item.completed ? 'line-through' : ''}`}>
                    <LinkifyText text={item.description} />
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">👤 {item.assignedToName}</span>
                    <span>📅 {new Date(item.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {item.completed && item.completedAt && (
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {new Date(item.completedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    {isOverdue && <span className="text-red-600 dark:text-red-400 font-semibold">⚠️ Vencido</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Creado por {item.createdByName}
                  </p>
                </div>
                {!closed && canDelete && (
                  <button
                    onClick={() => handleDeleteItem(index)}
                    disabled={submitting}
                    className="opacity-0 group-hover:opacity-100 transition p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item */}
      {!closed && (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
            Agregar Acción:
          </h4>
          <div className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la acción..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={submitting}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Responsable (nombre)..."
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={submitting}
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={submitting}
              />
            </div>
            <button
              onClick={handleAddItem}
              disabled={!description.trim() || !assignedTo.trim() || !dueDate.trim() || submitting}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Agregar Acción
            </button>
          </div>
        </div>
      )}

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Action Items cerrado - {completedCount} de {items.length} completados ({Math.round(completedCount / items.length * 100)}%)
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Action Items
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/action-items</code>
      </div>
    </div>
  );
}

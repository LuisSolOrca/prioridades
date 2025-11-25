'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, ParkingCircle } from 'lucide-react';

interface ParkingItem {
  text: string;
  userId: string;
  userName: string;
}

interface ParkingLotCommandProps {
  projectId: string;
  messageId: string;
  title: string;
  items: ParkingItem[];
  createdBy: string;
  closed: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ParkingLotCommand({
  projectId,
  messageId,
  title,
  items: initialItems,
  createdBy,
  closed: initialClosed,
  onClose,
  onUpdate
}: ParkingLotCommandProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState(initialItems);
  const [closed, setClosed] = useState(initialClosed);
  const [newItem, setNewItem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddItem = async () => {
    const text = newItem.trim();
    if (!text || !session?.user || submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/parking-lot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al agregar');
        return;
      }

      const data = await response.json();
      setItems(data.commandData.items);
      setNewItem('');
      onUpdate?.();
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error al agregar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemIndex: number) => {
    if (submitting || closed) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/parking-lot`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex })
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
      const response = await fetch(`/api/projects/${projectId}/messages/${messageId}/parking-lot`, {
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
    }
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-orange-400 dark:border-orange-600 p-6 my-2 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
            <ParkingCircle className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Parking Lot • {items.length} temas • {closed ? 'Cerrado' : 'Activo'}
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
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-700 rounded-lg p-3 text-sm group relative"
          >
            <p className="text-gray-800 dark:text-gray-100 pr-6">{item.text}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              — {item.userName}
            </p>
            {!closed && item.userId === session?.user?.id && (
              <button
                onClick={() => handleDeleteItem(index)}
                disabled={submitting}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 bg-red-500 text-white rounded hover:bg-red-600"
                title="Eliminar"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Item */}
      {!closed && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem();
              }
            }}
            placeholder="Agregar tema para después..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={submitting}
          />
          <button
            onClick={handleAddItem}
            disabled={!newItem.trim() || submitting}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg transition flex items-center gap-2"
          >
            <Plus size={16} />
            Agregar
          </button>
        </div>
      )}

      {/* Estado */}
      {closed && (
        <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            🔒 Parking Lot cerrado con {items.length} temas pendientes
          </p>
        </div>
      )}

      {/* Botón cerrar (solo creador) */}
      {!closed && createdBy === session?.user?.id && (
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          Cerrar Parking Lot
        </button>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/parking-lot</code>
      </div>
    </div>
  );
}

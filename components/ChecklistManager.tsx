'use client';

import { useState } from 'react';
import { Plus, Check, X, Trash2 } from 'lucide-react';

export interface ChecklistItem {
  _id?: string;
  text: string;
  completed: boolean;
  createdAt?: string;
}

interface ChecklistManagerProps {
  checklist: ChecklistItem[];
  onChange: (checklist: ChecklistItem[]) => void;
  disabled?: boolean;
}

export default function ChecklistManager({ checklist, onChange, disabled = false }: ChecklistManagerProps) {
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        text: newItemText.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };
      onChange([...checklist, newItem]);
      setNewItemText('');
      setIsAdding(false);
    }
  };

  const handleToggleItem = (index: number) => {
    const updatedChecklist = [...checklist];
    updatedChecklist[index].completed = !updatedChecklist[index].completed;
    onChange(updatedChecklist);
  };

  const handleDeleteItem = (index: number) => {
    const updatedChecklist = checklist.filter((_, i) => i !== index);
    onChange(updatedChecklist);
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
          <span>✓ Lista de Tareas</span>
          {totalCount > 0 && (
            <span className="text-sm text-gray-500">
              ({completedCount}/{totalCount} - {completionPercentage}%)
            </span>
          )}
        </h4>
        {!disabled && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
          >
            <Plus size={16} />
            <span>Agregar tarea</span>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-2">
        {checklist.map((item, index) => (
          <div
            key={item._id || index}
            className={`flex items-start space-x-2 p-2 rounded border ${
              item.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <button
              onClick={() => handleToggleItem(index)}
              disabled={disabled}
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                item.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 hover:border-green-500'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {item.completed && <Check size={14} className="text-white" />}
            </button>
            <span
              className={`flex-1 text-sm ${
                item.completed
                  ? 'line-through text-gray-500'
                  : 'text-gray-800'
              }`}
            >
              {item.text}
            </span>
            {!disabled && (
              <button
                onClick={() => handleDeleteItem(index)}
                className="text-red-600 hover:text-red-800 flex-shrink-0"
                title="Eliminar tarea"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new item form */}
      {isAdding && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem();
              } else if (e.key === 'Escape') {
                setIsAdding(false);
                setNewItemText('');
              }
            }}
            placeholder="Escribe una tarea..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            title="Agregar"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewItemText('');
            }}
            className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            title="Cancelar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {checklist.length === 0 && !isAdding && (
        <p className="text-sm text-gray-400 text-center py-4">
          No hay tareas en la lista. Agrega una para comenzar.
        </p>
      )}
    </div>
  );
}

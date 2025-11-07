'use client';

import { useState } from 'react';
import { Plus, Check, X, Trash2 } from 'lucide-react';

export interface ChecklistItem {
  _id?: string;
  text: string;
  completed: boolean;
  completedHours?: number;
  createdAt?: string;
}

interface ChecklistManagerProps {
  checklist: ChecklistItem[];
  onChange: (checklist: ChecklistItem[]) => void;
  disabled?: boolean;
  hasAzureDevOpsLink?: boolean;
}

export default function ChecklistManager({ checklist, onChange, disabled = false, hasAzureDevOpsLink = false }: ChecklistManagerProps) {
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

  const handleHoursChange = (index: number, hours: string) => {
    const numHours = parseFloat(hours) || 0;
    const updatedChecklist = [...checklist];
    updatedChecklist[index].completedHours = numHours > 0 ? numHours : undefined;
    onChange(updatedChecklist);
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
          <span>✓ Lista de Tareas</span>
          {totalCount > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({completedCount}/{totalCount} - {completionPercentage}%)
            </span>
          )}
        </h4>
        {!disabled && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center space-x-1"
          >
            <Plus size={16} />
            <span>Agregar tarea</span>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            <button
              type="button"
              onClick={() => handleToggleItem(index)}
              disabled={disabled}
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                item.completed
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {item.completed && <Check size={14} className="text-white" />}
            </button>
            <div className="flex-1">
              <span
                className={`text-sm ${
                  item.completed
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {item.text}
              </span>
              {/* Campo de horas - solo si la tarea está completada */}
              {item.completed && (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.completedHours || ''}
                    onChange={(e) => handleHoursChange(index, e.target.value)}
                    placeholder="Horas"
                    disabled={disabled}
                    className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">hrs trabajadas</span>
                </div>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleDeleteItem(index)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex-shrink-0"
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
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            title="Agregar"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewItemText('');
            }}
            className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            title="Cancelar"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {checklist.length === 0 && !isAdding && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          No hay tareas en la lista. Agrega una para comenzar.
        </p>
      )}
    </div>
  );
}

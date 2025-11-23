'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Flag, Calendar, Target, CheckCircle, XCircle } from 'lucide-react';

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface QuickPriorityCommandProps {
  projectId: string;
  initialTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickPriorityCommand({
  projectId,
  initialTitle,
  onClose,
  onSuccess
}: QuickPriorityCommandProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [initiativeIds, setInitiativeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO'>('EN_TIEMPO');
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitiatives();
  }, []);

  const loadInitiatives = async () => {
    try {
      const response = await fetch('/api/strategic-initiatives');
      if (response.ok) {
        const data = await response.json();
        setInitiatives(data.filter((i: Initiative) => i));
      }
    } catch (err) {
      console.error('Error loading initiatives:', err);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('El título es requerido');
      return;
    }

    if (initiativeIds.length === 0) {
      setError('Debes seleccionar al menos una iniciativa estratégica');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Obtener fechas de la semana actual
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      const response = await fetch('/api/priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          initiativeIds,
          status,
          projectId,
          weekStart: monday.toISOString(),
          weekEnd: friday.toISOString(),
          completionPercentage: 0,
          type: 'OPERATIVA',
          checklist: [],
          evidenceLinks: []
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear prioridad');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al crear prioridad');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-green-300 dark:border-green-700 p-6 my-2">
        <div className="text-center py-8">
          <CheckCircle className="text-green-600 dark:text-green-400 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ¡Prioridad Creada!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            La prioridad ha sido agregada al proyecto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-green-300 dark:border-green-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
            <Flag className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Crear Prioridad Rápida</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Para la semana actual</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          disabled={loading}
        >
          ✕
        </button>
      </div>

      {/* Formulario */}
      <div className="space-y-4">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <Target size={14} className="inline mr-1" />
            Título *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="¿Qué quieres lograr esta semana?"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={loading}
            autoFocus
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descripción (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles adicionales..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            disabled={loading}
          />
        </div>

        {/* Iniciativas */}
        {initiatives.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Iniciativa(s) Estratégica(s) *
            </label>
            <div className="flex flex-wrap gap-2">
              {initiatives.map(initiative => (
                <button
                  key={initiative._id}
                  onClick={() => {
                    if (initiativeIds.includes(initiative._id)) {
                      setInitiativeIds(initiativeIds.filter(id => id !== initiative._id));
                    } else {
                      setInitiativeIds([...initiativeIds, initiative._id]);
                    }
                  }}
                  disabled={loading}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    initiativeIds.includes(initiative._id)
                      ? 'bg-opacity-100 text-white'
                      : 'bg-opacity-20 text-gray-700 dark:text-gray-300 hover:bg-opacity-30'
                  }`}
                  style={{
                    backgroundColor: initiativeIds.includes(initiative._id)
                      ? initiative.color
                      : `${initiative.color}33`
                  }}
                >
                  {initiative.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estado inicial */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estado Inicial
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('EN_TIEMPO')}
              disabled={loading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                status === 'EN_TIEMPO'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              ✓ En Tiempo
            </button>
            <button
              onClick={() => setStatus('EN_RIESGO')}
              disabled={loading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                status === 'EN_RIESGO'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              ⚠ En Riesgo
            </button>
            <button
              onClick={() => setStatus('BLOQUEADO')}
              disabled={loading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                status === 'BLOQUEADO'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              🚫 Bloqueado
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
              <XCircle size={16} />
              {error}
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || initiativeIds.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creando...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Crear Prioridad
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition"
          >
            Cancelar
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/quick-priority</code>
      </div>
    </div>
  );
}

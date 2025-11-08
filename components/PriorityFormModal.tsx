'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ChecklistManager, { ChecklistItem } from './ChecklistManager';
import EvidenceLinksManager, { EvidenceLink } from './EvidenceLinksManager';

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface Client {
  _id: string;
  name: string;
  isActive: boolean;
}

interface PriorityFormData {
  title: string;
  description?: string;
  initiativeIds: string[];
  clientId?: string; // Opcional aquí para permitir el estado transitorio mientras se crea
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
  type: 'ESTRATEGICA' | 'OPERATIVA';
  checklist: ChecklistItem[];
  evidenceLinks: EvidenceLink[];
  weekStart?: string;
  weekEnd?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface PriorityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: PriorityFormData;
  setFormData: (data: PriorityFormData) => void;
  handleSubmit: (e: React.FormEvent) => void;
  initiatives: Initiative[];
  clients?: Client[];
  onClientCreated?: (client: Client) => void; // Callback cuando se crea un nuevo cliente
  isEditing: boolean;
  weekLabel: string;
  currentWeek?: any;
  nextWeek?: any;
  selectedWeekOffset?: number;
  setSelectedWeekOffset?: (offset: number) => void;
  allowUserReassignment?: boolean; // Nueva prop para permitir reasignar usuario
  users?: User[]; // Lista de usuarios para reasignar
  selectedUserId?: string; // Usuario actual seleccionado
  onUserChange?: (userId: string) => void; // Callback para cambiar usuario
  hasAzureDevOpsLink?: boolean; // Si la prioridad está vinculada a Azure DevOps
}

export default function PriorityFormModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  initiatives,
  clients = [],
  onClientCreated,
  isEditing,
  weekLabel,
  currentWeek,
  nextWeek,
  selectedWeekOffset = 0,
  setSelectedWeekOffset,
  allowUserReassignment = false,
  users = [],
  selectedUserId,
  onUserChange,
  hasAzureDevOpsLink = false
}: PriorityFormModalProps) {
  const [aiLoading, setAiLoading] = useState<'title' | 'description' | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{ type: 'title' | 'description', text: string } | null>(null);
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [clientCreating, setClientCreating] = useState(false);
  const DRAFT_KEY = 'priority_form_draft';

  // Guardar borrador en localStorage cuando formData cambia (solo si el modal está abierto)
  useEffect(() => {
    if (isOpen && formData.title) {
      // Guardar solo si hay contenido para evitar sobrescribir con datos vacíos
      const draft = {
        formData,
        selectedUserId: selectedUserId || undefined, // Incluir selectedUserId si existe (para history/reasignación)
        timestamp: Date.now(),
        isEditing
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [formData, selectedUserId, isOpen, isEditing]);

  // Limpiar borrador cuando se cierra el modal
  const handleClose = () => {
    localStorage.removeItem(DRAFT_KEY);
    onClose();
  };

  // Intentar restaurar borrador al abrir el modal
  useEffect(() => {
    if (isOpen) {
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          const timeDiff = Date.now() - draft.timestamp;

          // Si el borrador tiene menos de 1 hora y coincide el modo (edición/creación)
          if (timeDiff < 3600000 && draft.isEditing === isEditing) {
            // Verificar si el formData actual está vacío o es el inicial
            if (!formData.title || formData.title === '') {
              setFormData(draft.formData);
              // Restaurar selectedUserId si existe y hay callback para cambiarlo
              if (draft.selectedUserId && onUserChange) {
                onUserChange(draft.selectedUserId);
              }
            }
          } else {
            // Borrador muy antiguo, eliminarlo
            localStorage.removeItem(DRAFT_KEY);
          }
        }
      } catch (error) {
        console.error('Error restaurando borrador:', error);
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [isOpen]);

  // Limpiar borrador cuando se envía el formulario
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que si el progreso es 100%, el estado debe ser COMPLETADO
    if (formData.completionPercentage === 100 && formData.status !== 'COMPLETADO') {
      alert('Si el progreso es 100%, el estado debe ser "Completado"');
      return;
    }

    localStorage.removeItem(DRAFT_KEY);
    handleSubmit(e);
  };

  const handleImproveWithAI = async (type: 'title' | 'description') => {
    const text = type === 'title' ? formData.title : formData.description;

    if (!text || text.trim() === '') {
      alert(`Primero escribe ${type === 'title' ? 'un título' : 'una descripción'} para que la IA pueda mejorarlo`);
      return;
    }

    setAiLoading(type);
    setAiSuggestion(null);

    try {
      const res = await fetch('/api/ai/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al mejorar el texto');
      }

      const data = await res.json();
      setAiSuggestion({ type, text: data.improvedText });

    } catch (error: any) {
      console.error('Error improving text:', error);
      alert(error.message || 'Error al comunicarse con la IA');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAcceptSuggestion = () => {
    if (!aiSuggestion) return;

    if (aiSuggestion.type === 'title') {
      setFormData({ ...formData, title: aiSuggestion.text });
    } else {
      setFormData({ ...formData, description: aiSuggestion.text });
    }

    setAiSuggestion(null);
  };

  const handleRejectSuggestion = () => {
    setAiSuggestion(null);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      alert('Por favor ingresa el nombre del cliente');
      return;
    }

    setClientCreating(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          isActive: true
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear el cliente');
      }

      const newClient = await res.json();

      // Actualizar formData con el nuevo cliente
      setFormData({ ...formData, clientId: newClient._id });

      // Resetear estados
      setIsCreatingNewClient(false);
      setNewClientName('');

      // Notificar al componente padre para actualizar la lista de clientes
      if (onClientCreated) {
        onClientCreated(newClient);
      }

    } catch (error: any) {
      console.error('Error creating client:', error);
      alert(error.message || 'Error al crear el cliente');
    } finally {
      setClientCreating(false);
    }
  };

  const getWeekLabel = (date: Date) => {
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {isEditing ? 'Editar Prioridad' : 'Nueva Prioridad'} - {weekLabel}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
          {/* Selector de Semana (solo cuando se crea) */}
          {!isEditing && currentWeek && nextWeek && setSelectedWeekOffset && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Semana *
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={selectedWeekOffset}
                onChange={(e) => {
                  const offset = parseInt(e.target.value);
                  setSelectedWeekOffset(offset);
                  const targetWeek = offset === 0 ? currentWeek : nextWeek;
                  setFormData({
                    ...formData,
                    weekStart: targetWeek.monday.toISOString(),
                    weekEnd: targetWeek.friday.toISOString()
                  });
                }}
              >
                <option value="0">Semana Actual ({getWeekLabel(currentWeek.monday)})</option>
                <option value="1">Siguiente Semana ({getWeekLabel(nextWeek.monday)})</option>
              </select>
            </div>
          )}

          {/* Título con IA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Título de la Prioridad *
              </label>
              <button
                type="button"
                onClick={() => handleImproveWithAI('title')}
                disabled={aiLoading === 'title' || !formData.title}
                className={`text-xs px-3 py-1 rounded-lg transition flex items-center space-x-1 ${
                  aiLoading === 'title'
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : formData.title
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title="Mejorar con IA"
              >
                {aiLoading === 'title' ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    <span>Mejorando...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Mejorar con IA</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
              maxLength={150}
              placeholder="Ej: Aumentar ventas del producto X en 15%"
            />

            {/* Sugerencia de IA para Título */}
            {aiSuggestion && aiSuggestion.type === 'title' && (
              <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">✨</span>
                    <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">Sugerencia de IA</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleRejectSuggestion}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
                    title="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Original</p>
                    <div className="bg-white/70 dark:bg-gray-800/70 rounded p-2 text-sm text-gray-700 dark:text-gray-300">
                      {formData.title}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Mejorado</p>
                    <div className="bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-800 dark:text-gray-100 font-medium border-2 border-purple-300 dark:border-purple-600">
                      {aiSuggestion.text}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAcceptSuggestion}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                    >
                      ✓ Usar Esta Versión
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectSuggestion}
                      className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
                    >
                      × Mantener Original
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Descripción con IA */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descripción Detallada
              </label>
              <button
                type="button"
                onClick={() => handleImproveWithAI('description')}
                disabled={aiLoading === 'description' || !formData.description}
                className={`text-xs px-3 py-1 rounded-lg transition flex items-center space-x-1 ${
                  aiLoading === 'description'
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : formData.description
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                title="Mejorar con IA"
              >
                {aiLoading === 'description' ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    <span>Mejorando...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Mejorar con IA</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={3}
              placeholder="Describe los objetivos y el alcance de esta prioridad"
            />

            {/* Sugerencia de IA para Descripción */}
            {aiSuggestion && aiSuggestion.type === 'description' && (
              <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">✨</span>
                    <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">Sugerencia de IA</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleRejectSuggestion}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
                    title="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Original</p>
                    <div className="bg-white/70 dark:bg-gray-800/70 rounded p-2 text-sm text-gray-700 dark:text-gray-300">
                      {formData.description}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Mejorado</p>
                    <div className="bg-white dark:bg-gray-800 rounded p-2 text-sm text-gray-800 dark:text-gray-100 font-medium border-2 border-purple-300 dark:border-purple-600">
                      {aiSuggestion.text}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAcceptSuggestion}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                    >
                      ✓ Usar Esta Versión
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectSuggestion}
                      className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
                    >
                      × Mantener Original
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reasignación de Usuario (solo para admins en /history) */}
          {allowUserReassignment && users.length > 0 && selectedUserId && onUserChange && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                👤 Reasignar a otro usuario
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => onUserChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email}) - {user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Esta prioridad se reasignará al usuario seleccionado.
              </p>
            </div>
          )}

          {/* Iniciativas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Iniciativas Estratégicas *
            </label>
            <div className="space-y-2">
              {initiatives.map((initiative) => (
                <label
                  key={initiative._id}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.initiativeIds.includes(initiative._id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData({
                        ...formData,
                        initiativeIds: checked
                          ? [...formData.initiativeIds, initiative._id]
                          : formData.initiativeIds.filter(id => id !== initiative._id)
                      });
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span style={{ color: initiative.color }}>●</span>
                  <span className="text-gray-700 dark:text-gray-300">{initiative.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tipo de Prioridad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Prioridad *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'ESTRATEGICA' | 'OPERATIVA' })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ESTRATEGICA">Estratégica</option>
              <option value="OPERATIVA">Operativa</option>
            </select>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cliente *
            </label>

            {!formData.clientId && isEditing && (
              <div className="mb-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Esta prioridad no tiene un cliente asignado. Por favor selecciona uno para poder guardar los cambios.
                </p>
              </div>
            )}

            {!isCreatingNewClient ? (
              <div className="flex gap-2">
                <select
                  value={formData.clientId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '__new__') {
                      setIsCreatingNewClient(true);
                      setFormData({ ...formData, clientId: undefined });
                    } else {
                      setFormData({ ...formData, clientId: value || undefined });
                    }
                  }}
                  required
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{!formData.clientId ? '⚠️ Seleccionar cliente (requerido)...' : 'Seleccionar cliente...'}</option>
                  {clients.filter(c => c.isActive).map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                  <option value="__new__">+ Crear nuevo cliente</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nombre del nuevo cliente"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    maxLength={100}
                    disabled={clientCreating}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateClient();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={clientCreating || !newClientName.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {clientCreating ? '⏳' : '✓ Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewClient(false);
                      setNewClientName('');
                    }}
                    disabled={clientCreating}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Presiona Enter o haz clic en "Crear" para guardar el nuevo cliente
                </p>
              </div>
            )}

            {!isCreatingNewClient && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selecciona un cliente existente o crea uno nuevo
              </p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => {
                const newStatus = e.target.value as any;
                // Si cambia a COMPLETADO, actualizar porcentaje a 100%
                if (newStatus === 'COMPLETADO') {
                  setFormData({ ...formData, status: newStatus, completionPercentage: 100 });
                } else {
                  setFormData({ ...formData, status: newStatus });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="EN_TIEMPO">En Tiempo</option>
              <option value="EN_RIESGO">En Riesgo</option>
              <option value="BLOQUEADO">Bloqueado</option>
              <option value="COMPLETADO">Completado</option>
            </select>
          </div>

          {/* Porcentaje de completado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Porcentaje de Completado: {formData.completionPercentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.completionPercentage}
              onChange={(e) => {
                const newPercentage = parseInt(e.target.value);
                // Si el estado es COMPLETADO y el porcentaje cambia a menos de 100, cambiar estado
                if (formData.status === 'COMPLETADO' && newPercentage < 100) {
                  setFormData({ ...formData, completionPercentage: newPercentage, status: 'EN_TIEMPO' });
                } else {
                  setFormData({ ...formData, completionPercentage: newPercentage });
                }
              }}
              className="w-full"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Checklist */}
          <ChecklistManager
            checklist={formData.checklist}
            onChange={(checklist) => setFormData({ ...formData, checklist })}
            hasAzureDevOpsLink={hasAzureDevOpsLink}
          />

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Enlaces de Evidencia */}
          <EvidenceLinksManager
            evidenceLinks={formData.evidenceLinks}
            onChange={(evidenceLinks) => setFormData({ ...formData, evidenceLinks })}
          />

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {isEditing ? 'Guardar Cambios' : 'Crear Prioridad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

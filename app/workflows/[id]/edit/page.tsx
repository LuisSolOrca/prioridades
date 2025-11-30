'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Initiative {
  _id: string;
  name: string;
}

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

export default function EditWorkflowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [triggerType, setTriggerType] = useState('priority_status_change');
  const [executeOnce, setExecuteOnce] = useState(false);
  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  // Obtener condiciones disponibles según el trigger seleccionado
  const getAvailableConditions = () => {
    const allConditions = [
      { value: 'status_equals', label: 'Si el estado es...', types: ['priority_status_change', 'priority_updated', 'priority_overdue'] },
      { value: 'status_for_days', label: 'Si lleva varios días en un estado...', types: ['priority_status_change', 'priority_updated'] },
      { value: 'completion_less_than', label: 'Si el % completado es menor que...', types: ['priority_updated', 'priority_overdue', 'completion_low'] },
      { value: 'completion_greater_than', label: 'Si el % completado es mayor que...', types: ['priority_updated', 'priority_overdue'] },
      { value: 'user_equals', label: 'Si la prioridad es de cierto usuario...', types: ['priority_status_change', 'priority_created', 'priority_updated', 'priority_overdue', 'completion_low'] },
      { value: 'initiative_equals', label: 'Si la prioridad es de cierta iniciativa...', types: ['priority_status_change', 'priority_created', 'priority_updated', 'priority_overdue', 'completion_low'] },
      { value: 'title_contains', label: 'Si el título contiene...', types: ['priority_status_change', 'priority_created', 'priority_updated', 'priority_overdue', 'completion_low'] },
      { value: 'description_contains', label: 'Si la descripción contiene...', types: ['priority_status_change', 'priority_created', 'priority_updated', 'priority_overdue', 'completion_low'] }
    ];

    return allConditions.filter(condition => condition.types.includes(triggerType));
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      loadWorkflow();
      loadUsers();
      loadInitiatives();
      loadEmailTemplates();
    }
  }, [session, params.id]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workflows/${params.id}`);
      if (!res.ok) throw new Error('Error cargando workflow');

      const workflow = await res.json();

      setName(workflow.name);
      setDescription(workflow.description || '');
      setIsActive(workflow.isActive !== undefined ? workflow.isActive : true);
      setTriggerType(workflow.triggerType);
      setExecuteOnce(workflow.executeOnce || false);
      setConditions(workflow.conditions || []);
      setActions(workflow.actions || []);
    } catch (err: any) {
      alert(err.message);
      router.push('/workflows');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  };

  const loadInitiatives = async () => {
    try {
      const res = await fetch('/api/initiatives');
      if (res.ok) {
        const data = await res.json();
        setInitiatives(data);
      }
    } catch (err) {
      console.error('Error cargando iniciativas:', err);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const res = await fetch('/api/crm/email-templates');
      if (res.ok) {
        const data = await res.json();
        setEmailTemplates(data);
      }
    } catch (err) {
      console.error('Error cargando plantillas de email:', err);
    }
  };

  const addCondition = () => {
    const availableConditions = getAvailableConditions();
    const firstConditionType = availableConditions[0]?.value || 'user_equals';
    setConditions([...conditions, { type: firstConditionType, value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const addAction = () => {
    setActions([...actions, { type: 'send_notification', targetRole: 'OWNER', message: '' }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Por favor ingresa un nombre para la automatización');
      return;
    }

    if (actions.length === 0) {
      alert('Debes agregar al menos una acción a realizar');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/workflows/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          isActive,
          triggerType,
          executeOnce,
          conditions,
          actions
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error actualizando automatización');
      }

      router.push('/workflows');
    } catch (err: any) {
      alert(err.message);
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const TRIGGER_INFO: Record<string, { title: string; description: string; emoji: string }> = {
    priority_status_change: {
      emoji: '📊',
      title: 'Cuando una prioridad cambia de estado',
      description: 'Se ejecuta cuando una prioridad pasa de EN_TIEMPO a EN_RIESGO, de BLOQUEADO a EN_TIEMPO, etc.'
    },
    priority_created: {
      emoji: '✨',
      title: 'Cuando se crea una nueva prioridad',
      description: 'Se ejecuta automáticamente cada vez que tú o alguien crea una nueva prioridad'
    },
    priority_updated: {
      emoji: '✏️',
      title: 'Cuando se actualiza una prioridad',
      description: 'Se ejecuta cada vez que se edita o modifica cualquier campo de una prioridad'
    },
    priority_overdue: {
      emoji: '⏰',
      title: 'Cuando una prioridad está atrasada',
      description: 'Se ejecuta cuando una prioridad no se completó antes del fin de semana'
    },
    completion_low: {
      emoji: '⚠️',
      title: 'Cuando el avance es bajo',
      description: 'Se ejecuta cuando el porcentaje de completado baja de 50%'
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">✏️ Editar Automatización</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Modifica la configuración de tu regla automática</p>
            </div>
            <button
              onClick={() => router.push('/workflows')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              title="Cerrar"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Paso 1: Información básica */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📝 Paso 1: ¿Cómo se llama?</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre descriptivo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Ejemplo: Notificarme si una prioridad lleva 2 días bloqueada"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={2}
                    placeholder="Explica para qué sirve esta automatización..."
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Automatización activa</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={executeOnce}
                      onChange={(e) => setExecuteOnce(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ejecutar solo una vez por prioridad</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Paso 2: Cuándo ejecutar */}
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">⚡ Paso 2: ¿Cuándo debe ejecutarse?</h2>

              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(TRIGGER_INFO).map(([key, info]) => (
                  <label
                    key={key}
                    className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      triggerType === key
                        ? 'border-purple-600 bg-purple-100 dark:bg-purple-900/50'
                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="trigger"
                      value={key}
                      checked={triggerType === key}
                      onChange={(e) => setTriggerType(e.target.value)}
                      className="mt-1 mr-3 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-2xl">{info.emoji}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{info.title}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{info.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Paso 3: Condiciones (opcional) */}
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">🎯 Paso 3: ¿Hay alguna condición? (opcional)</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Si agregas condiciones, la automatización solo se ejecutará cuando TODAS se cumplan.
                    Si no agregas ninguna, siempre se ejecutará.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCondition}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors ml-4"
                >
                  <Plus size={16} />
                  <span>Agregar condición</span>
                </button>
              </div>

              {conditions.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <p className="text-gray-500 dark:text-gray-400">Sin condiciones - la automatización siempre se ejecutará</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-yellow-300 dark:border-yellow-700 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 space-y-3">
                          <select
                            value={condition.type}
                            onChange={(e) => updateCondition(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {getAvailableConditions().map(cond => (
                              <option key={cond.value} value={cond.value}>{cond.label}</option>
                            ))}
                          </select>

                          {/* Campos específicos por tipo de condición */}
                          {condition.type === 'status_equals' && (
                            <select
                              value={condition.value}
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="EN_TIEMPO">EN_TIEMPO</option>
                              <option value="EN_RIESGO">EN_RIESGO</option>
                              <option value="BLOQUEADO">BLOQUEADO</option>
                              <option value="COMPLETADO">COMPLETADO</option>
                            </select>
                          )}

                          {condition.type === 'status_for_days' && (
                            <div className="grid grid-cols-2 gap-3">
                              <select
                                value={condition.value}
                                onChange={(e) => updateCondition(index, 'value', e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <option value="EN_TIEMPO">EN_TIEMPO</option>
                                <option value="EN_RIESGO">EN_RIESGO</option>
                                <option value="BLOQUEADO">BLOQUEADO</option>
                              </select>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  value={condition.days || 1}
                                  onChange={(e) => updateCondition(index, 'days', parseInt(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  min="1"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">días</span>
                              </div>
                            </div>
                          )}

                          {(condition.type === 'completion_less_than' || condition.type === 'completion_greater_than') && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={condition.value || 0}
                                onChange={(e) => updateCondition(index, 'value', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                min="0"
                                max="100"
                              />
                              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                            </div>
                          )}

                          {condition.type === 'user_equals' && (
                            <select
                              value={condition.value || ''}
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">Seleccionar usuario...</option>
                              {users.map(user => (
                                <option key={user._id} value={user._id}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {condition.type === 'initiative_equals' && (
                            <select
                              value={condition.value || ''}
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">Seleccionar iniciativa...</option>
                              {initiatives.map(initiative => (
                                <option key={initiative._id} value={initiative._id}>
                                  {initiative.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {(condition.type === 'title_contains' || condition.type === 'description_contains') && (
                            <input
                              type="text"
                              value={condition.value || ''}
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="Texto a buscar..."
                            />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar condición"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paso 4: Acciones */}
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">🚀 Paso 4: ¿Qué debe hacer? *</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Agrega al menos una acción. Puedes agregar varias para que se ejecuten todas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAction}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ml-4"
                >
                  <Plus size={16} />
                  <span>Agregar acción</span>
                </button>
              </div>

              {actions.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-red-300 dark:border-red-700">
                  <p className="text-red-600 dark:text-red-400 font-medium">⚠️ Debes agregar al menos una acción</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-green-300 dark:border-green-700 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 space-y-3">
                          <select
                            value={action.type}
                            onChange={(e) => updateAction(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="send_notification">🔔 Enviar notificación</option>
                            <option value="send_email">📧 Enviar email</option>
                            <option value="change_status">🔄 Cambiar estado de la prioridad</option>
                            <option value="assign_to_user">👤 Reasignar a otro usuario</option>
                            <option value="add_comment">💬 Agregar comentario automático</option>
                          </select>

                          {/* Campos específicos por tipo de acción */}
                          {action.type === 'send_notification' && (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">¿A quién?</label>
                                <select
                                  value={action.targetRole || 'OWNER'}
                                  onChange={(e) => {
                                    updateAction(index, 'targetRole', e.target.value);
                                    if (e.target.value !== 'USER') {
                                      updateAction(index, 'targetUserId', undefined);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="OWNER">Al dueño de la prioridad</option>
                                  <option value="ADMIN">A todos los administradores</option>
                                  <option value="USER">A un usuario específico</option>
                                </select>
                              </div>

                              {action.targetRole === 'USER' && (
                                <select
                                  value={action.targetUserId || ''}
                                  onChange={(e) => updateAction(index, 'targetUserId', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="">Seleccionar usuario...</option>
                                  {users.map(user => (
                                    <option key={user._id} value={user._id}>
                                      {user.name}
                                    </option>
                                  ))}
                                </select>
                              )}

                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label>
                                <input
                                  type="text"
                                  value={action.message || ''}
                                  onChange={(e) => updateAction(index, 'message', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Tu prioridad {{title}} necesita atención"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  💡 Puedes usar: {'{{title}}'}, {'{{status}}'}, {'{{completion}}'}, {'{{owner}}'}
                                </p>
                              </div>
                            </>
                          )}

                          {action.type === 'send_email' && (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">¿A quién?</label>
                                <select
                                  value={action.targetRole || 'OWNER'}
                                  onChange={(e) => {
                                    updateAction(index, 'targetRole', e.target.value);
                                    if (e.target.value !== 'USER') {
                                      updateAction(index, 'targetUserId', undefined);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="OWNER">Al dueño de la prioridad</option>
                                  <option value="ADMIN">A todos los administradores</option>
                                  <option value="USER">A un usuario específico</option>
                                </select>
                              </div>

                              {action.targetRole === 'USER' && (
                                <select
                                  value={action.targetUserId || ''}
                                  onChange={(e) => updateAction(index, 'targetUserId', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                >
                                  <option value="">Seleccionar usuario...</option>
                                  {users.map(user => (
                                    <option key={user._id} value={user._id}>
                                      {user.name}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {/* Selector de contenido: Manual o Plantilla */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Contenido del email</label>
                                <div className="flex space-x-4 mb-3">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`emailContentType-${index}`}
                                      checked={!action.useTemplate}
                                      onChange={() => {
                                        updateAction(index, 'useTemplate', false);
                                        updateAction(index, 'emailTemplateId', undefined);
                                      }}
                                      className="text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Escribir manualmente</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`emailContentType-${index}`}
                                      checked={action.useTemplate === true}
                                      onChange={() => {
                                        updateAction(index, 'useTemplate', true);
                                        updateAction(index, 'message', undefined);
                                        updateAction(index, 'emailSubject', undefined);
                                      }}
                                      className="text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Usar plantilla</span>
                                  </label>
                                </div>
                              </div>

                              {action.useTemplate ? (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Plantilla de email</label>
                                  <select
                                    value={action.emailTemplateId || ''}
                                    onChange={(e) => updateAction(index, 'emailTemplateId', e.target.value || undefined)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  >
                                    <option value="">Seleccionar plantilla...</option>
                                    {emailTemplates.map(template => (
                                      <option key={template._id} value={template._id}>
                                        {template.name} ({template.category})
                                      </option>
                                    ))}
                                  </select>
                                  {action.emailTemplateId && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                      Se usará el asunto y contenido de la plantilla. Las variables se reemplazarán automáticamente.
                                    </p>
                                  )}
                                  {emailTemplates.length === 0 && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                      No hay plantillas disponibles. <a href="/crm/email-templates" className="underline">Crear una plantilla</a>
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Asunto</label>
                                    <input
                                      type="text"
                                      value={action.emailSubject || ''}
                                      onChange={(e) => updateAction(index, 'emailSubject', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      placeholder="Alerta: Tu prioridad {{title}} necesita atención"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label>
                                    <textarea
                                      value={action.message || ''}
                                      onChange={(e) => updateAction(index, 'message', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      rows={2}
                                      placeholder="La prioridad {{title}} está {{status}}..."
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      💡 Puedes usar: {'{{title}}'}, {'{{status}}'}, {'{{completion}}'}, {'{{owner}}'}
                                    </p>
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {action.type === 'change_status' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cambiar a:</label>
                              <select
                                value={action.newStatus || 'EN_RIESGO'}
                                onChange={(e) => updateAction(index, 'newStatus', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <option value="EN_TIEMPO">EN_TIEMPO</option>
                                <option value="EN_RIESGO">EN_RIESGO</option>
                                <option value="BLOQUEADO">BLOQUEADO</option>
                                <option value="COMPLETADO">COMPLETADO</option>
                              </select>
                            </div>
                          )}

                          {action.type === 'assign_to_user' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a:</label>
                              <select
                                value={action.targetUserId || ''}
                                onChange={(e) => updateAction(index, 'targetUserId', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              >
                                <option value="">Seleccionar usuario...</option>
                                {users.map(user => (
                                  <option key={user._id} value={user._id}>
                                    {user.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {action.type === 'add_comment' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Comentario</label>
                              <input
                                type="text"
                                value={action.message || ''}
                                onChange={(e) => updateAction(index, 'message', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="🤖 Actualización automática: {{completion}}% completado"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                💡 Puedes usar: {'{{title}}'}, {'{{status}}'}, {'{{completion}}'}, {'{{owner}}'}
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar acción"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/workflows')}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || actions.length === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                <Save size={20} />
                <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

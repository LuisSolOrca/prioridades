'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';

type TriggerType =
  | 'priority_status_change'
  | 'priority_created'
  | 'priority_overdue'
  | 'completion_low';

type ConditionType =
  | 'status_equals'
  | 'status_for_days'
  | 'completion_less_than'
  | 'completion_greater_than'
  | 'day_of_week'
  | 'days_until_deadline'
  | 'user_equals'
  | 'initiative_equals'
  | 'title_contains'
  | 'description_contains';

type ActionType =
  | 'send_notification'
  | 'send_email'
  | 'change_status'
  | 'assign_to_user'
  | 'add_comment';

type PriorityStatus = 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO';

interface Condition {
  type: ConditionType;
  value?: any;
  days?: number;
}

interface Action {
  type: ActionType;
  message?: string;
  emailSubject?: string;
  targetUserId?: string;
  targetRole?: 'OWNER' | 'ADMIN' | 'USER';
  newStatus?: PriorityStatus;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Initiative {
  _id: string;
  name: string;
}

export default function EditWorkflowPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('priority_status_change');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [priority, setPriority] = useState(1);
  const [executeOnce, setExecuteOnce] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar workflow
        const workflowRes = await fetch(`/api/workflows/${params.id}`);
        if (!workflowRes.ok) {
          throw new Error('Error cargando workflow');
        }
        const workflow = await workflowRes.json();

        setName(workflow.name);
        setDescription(workflow.description || '');
        setTriggerType(workflow.triggerType);
        setConditions(workflow.conditions || []);
        setActions(workflow.actions || []);
        setPriority(workflow.priority || 1);
        setExecuteOnce(workflow.executeOnce || false);
        setIsActive(workflow.isActive !== undefined ? workflow.isActive : true);

        // Cargar usuarios e iniciativas
        const [usersRes, initiativesRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/initiatives')
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }

        if (initiativesRes.ok) {
          const initiativesData = await initiativesRes.json();
          setInitiatives(initiativesData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        alert('Error cargando datos del workflow');
        router.push('/workflows');
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

  const addCondition = () => {
    setConditions([...conditions, { type: 'status_equals', value: 'EN_RIESGO' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof Condition, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const addAction = () => {
    setActions([...actions, { type: 'send_notification', message: '', targetRole: 'OWNER' }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof Action, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/workflows/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          triggerType,
          conditions,
          actions,
          priority,
          executeOnce,
          isActive
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error actualizando workflow');
      }

      router.push('/workflows');
    } catch (error: any) {
      alert(error.message);
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Editar Workflow</h1>
          <p className="text-gray-600 mt-2">Modifica la configuración del workflow automatizado</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Información básica */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Workflow *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Ej: Notificar prioridades en riesgo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Describe qué hace este workflow..."
            />
          </div>

          {/* Disparador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disparador *
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="priority_status_change">Cambio de estado de prioridad</option>
              <option value="priority_created">Prioridad creada</option>
              <option value="priority_overdue">Prioridad vencida</option>
              <option value="completion_low">Completado bajo</option>
            </select>
          </div>

          {/* Condiciones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Condiciones (todas deben cumplirse)
              </label>
              <button
                type="button"
                onClick={addCondition}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Agregar condición
              </button>
            </div>

            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded">
                  <div className="flex-1 space-y-2">
                    <select
                      value={condition.type}
                      onChange={(e) => updateCondition(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="status_equals">Estado igual a</option>
                      <option value="status_for_days">Estado por N días</option>
                      <option value="completion_less_than">% completado menor que</option>
                      <option value="completion_greater_than">% completado mayor que</option>
                      <option value="day_of_week">Día de la semana</option>
                      <option value="days_until_deadline">Días hasta deadline</option>
                      <option value="user_equals">Usuario igual a</option>
                      <option value="initiative_equals">Iniciativa igual a</option>
                      <option value="title_contains">Título contiene</option>
                      <option value="description_contains">Descripción contiene</option>
                    </select>

                    {/* Campo valor según tipo de condición */}
                    {condition.type === 'status_equals' && (
                      <select
                        value={condition.value || 'EN_RIESGO'}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="EN_TIEMPO">En Tiempo</option>
                        <option value="EN_RIESGO">En Riesgo</option>
                        <option value="BLOQUEADO">Bloqueado</option>
                        <option value="COMPLETADO">Completado</option>
                      </select>
                    )}

                    {condition.type === 'status_for_days' && (
                      <div className="flex gap-2">
                        <select
                          value={condition.value || 'EN_RIESGO'}
                          onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="EN_TIEMPO">En Tiempo</option>
                          <option value="EN_RIESGO">En Riesgo</option>
                          <option value="BLOQUEADO">Bloqueado</option>
                          <option value="COMPLETADO">Completado</option>
                        </select>
                        <input
                          type="number"
                          value={condition.days || 1}
                          onChange={(e) => updateCondition(index, 'days', parseInt(e.target.value))}
                          min="1"
                          placeholder="Días"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    )}

                    {(condition.type === 'completion_less_than' || condition.type === 'completion_greater_than') && (
                      <input
                        type="number"
                        value={condition.value || 50}
                        onChange={(e) => updateCondition(index, 'value', parseInt(e.target.value))}
                        min="0"
                        max="100"
                        placeholder="Porcentaje"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    )}

                    {condition.type === 'day_of_week' && (
                      <select
                        value={condition.value || 1}
                        onChange={(e) => updateCondition(index, 'value', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value={1}>Lunes</option>
                        <option value={2}>Martes</option>
                        <option value={3}>Miércoles</option>
                        <option value={4}>Jueves</option>
                        <option value={5}>Viernes</option>
                        <option value={6}>Sábado</option>
                        <option value={0}>Domingo</option>
                      </select>
                    )}

                    {condition.type === 'days_until_deadline' && (
                      <input
                        type="number"
                        value={condition.value || 1}
                        onChange={(e) => updateCondition(index, 'value', parseInt(e.target.value))}
                        min="0"
                        placeholder="Días"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    )}

                    {condition.type === 'user_equals' && users.length > 0 && (
                      <select
                        value={condition.value || ''}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Seleccionar usuario</option>
                        {users.map(user => (
                          <option key={user._id} value={user._id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    )}

                    {condition.type === 'initiative_equals' && initiatives.length > 0 && (
                      <select
                        value={condition.value || ''}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Seleccionar iniciativa</option>
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
                        placeholder="Texto a buscar..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {conditions.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Sin condiciones - el workflow se ejecutará siempre que ocurra el disparador
                </p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Acciones a ejecutar *
              </label>
              <button
                type="button"
                onClick={addAction}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Agregar acción
              </button>
            </div>

            <div className="space-y-3">
              {actions.map((action, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded space-y-2">
                  <div className="flex gap-2 items-start">
                    <select
                      value={action.type}
                      onChange={(e) => updateAction(index, 'type', e.target.value as ActionType)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="send_notification">Enviar notificación</option>
                      <option value="send_email">Enviar email</option>
                      <option value="change_status">Cambiar estado</option>
                      <option value="assign_to_user">Reasignar usuario</option>
                      <option value="add_comment">Agregar comentario</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removeAction(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Configuración específica por tipo de acción */}
                  {action.type === 'send_notification' && (
                    <>
                      <select
                        value={action.targetRole || 'OWNER'}
                        onChange={(e) => {
                          const role = e.target.value;
                          updateAction(index, 'targetRole', role);
                          if (role !== 'USER') {
                            updateAction(index, 'targetUserId', undefined);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="OWNER">Dueño de la prioridad</option>
                        <option value="ADMIN">Todos los administradores</option>
                        <option value="USER">Usuario específico</option>
                      </select>

                      {action.targetRole === 'USER' && users.length > 0 && (
                        <select
                          value={action.targetUserId || ''}
                          onChange={(e) => updateAction(index, 'targetUserId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Seleccionar usuario</option>
                          {users.map(user => (
                            <option key={user._id} value={user._id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                      )}

                      <div>
                        <input
                          type="text"
                          value={action.message || ''}
                          onChange={(e) => updateAction(index, 'message', e.target.value)}
                          placeholder="Ej: La prioridad {{title}} está {{status}}"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Usa placeholders: {'{{title}}'}, {'{{status}}'}, {'{{completion}}'}, {'{{owner}}'}, {'{{initiative}}'}
                        </p>
                      </div>
                    </>
                  )}

                  {action.type === 'send_email' && (
                    <>
                      <select
                        value={action.targetRole || 'OWNER'}
                        onChange={(e) => {
                          const role = e.target.value;
                          updateAction(index, 'targetRole', role);
                          if (role !== 'USER') {
                            updateAction(index, 'targetUserId', undefined);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="OWNER">Dueño de la prioridad</option>
                        <option value="ADMIN">Todos los administradores</option>
                        <option value="USER">Usuario específico</option>
                      </select>

                      {action.targetRole === 'USER' && users.length > 0 && (
                        <select
                          value={action.targetUserId || ''}
                          onChange={(e) => updateAction(index, 'targetUserId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Seleccionar usuario</option>
                          {users.map(user => (
                            <option key={user._id} value={user._id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                      )}

                      <input
                        type="text"
                        value={action.emailSubject || ''}
                        onChange={(e) => updateAction(index, 'emailSubject', e.target.value)}
                        placeholder="Asunto del email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />

                      <div>
                        <textarea
                          value={action.message || ''}
                          onChange={(e) => updateAction(index, 'message', e.target.value)}
                          placeholder="Mensaje del email"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Usa placeholders: {'{{title}}'}, {'{{status}}'}, {'{{completion}}'}, {'{{owner}}'}, {'{{initiative}}'}
                        </p>
                      </div>
                    </>
                  )}

                  {action.type === 'change_status' && (
                    <select
                      value={action.newStatus || 'EN_RIESGO'}
                      onChange={(e) => updateAction(index, 'newStatus', e.target.value as PriorityStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="EN_TIEMPO">En Tiempo</option>
                      <option value="EN_RIESGO">En Riesgo</option>
                      <option value="BLOQUEADO">Bloqueado</option>
                      <option value="COMPLETADO">Completado</option>
                    </select>
                  )}

                  {action.type === 'assign_to_user' && users.length > 0 && (
                    <select
                      value={action.targetUserId || ''}
                      onChange={(e) => updateAction(index, 'targetUserId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Seleccionar usuario</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  )}

                  {action.type === 'add_comment' && (
                    <div>
                      <input
                        type="text"
                        value={action.message || ''}
                        onChange={(e) => updateAction(index, 'message', e.target.value)}
                        placeholder="Ej: Comentario automático: {{title}} está {{status}}"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Usa placeholders: {'{{title}}'}, {'{{status}}'}, {'{{completion}}'}, {'{{owner}}'}, {'{{initiative}}'}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {actions.length === 0 && (
                <p className="text-sm text-red-500">
                  Debes agregar al menos una acción
                </p>
              )}
            </div>
          </div>

          {/* Configuración avanzada */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Configuración Avanzada</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad de ejecución
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  min="1"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Los workflows con menor prioridad se ejecutan primero
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="executeOnce"
                  checked={executeOnce}
                  onChange={(e) => setExecuteOnce(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="executeOnce" className="text-sm text-gray-700">
                  Ejecutar solo una vez por prioridad
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Workflow activo
                </label>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving || actions.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/workflows')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

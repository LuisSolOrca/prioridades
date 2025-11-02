'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Save, X, Plus, Trash2 } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Initiative {
  _id: string;
  name: string;
}

export default function NewWorkflowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [triggerType, setTriggerType] = useState('priority_status_change');
  const [executeOnce, setExecuteOnce] = useState(false);
  const [priority, setPriority] = useState(100);
  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      loadUsers();
      loadInitiatives();
    }
  }, [session]);

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

  const addCondition = () => {
    setConditions([...conditions, { type: 'status_equals', value: 'EN_RIESGO' }]);
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
    setActions([...actions, { type: 'send_notification', message: '' }]);
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
      alert('El nombre es requerido');
      return;
    }

    if (actions.length === 0) {
      alert('Debe haber al menos una acción');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          isActive,
          triggerType,
          executeOnce,
          priority,
          conditions,
          actions
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error creando workflow');
      }

      router.push('/admin/workflows');
    } catch (err: any) {
      alert(err.message);
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Workflow</h1>
            <button
              onClick={() => router.push('/admin/workflows')}
              className="text-gray-600 hover:text-gray-800"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Workflow *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Notificar riesgos prolongados"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Descripción opcional del workflow"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado inicial
                </label>
                <select
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad de ejecución
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div className="flex items-center pt-7">
                <input
                  type="checkbox"
                  id="executeOnce"
                  checked={executeOnce}
                  onChange={(e) => setExecuteOnce(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="executeOnce" className="text-sm text-gray-700">
                  Ejecutar solo una vez
                </label>
              </div>
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disparador *
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="priority_status_change">📊 Cambio de estado de prioridad</option>
                <option value="priority_created">✨ Prioridad creada</option>
                <option value="priority_overdue">⏰ Prioridad atrasada</option>
                <option value="daily_check">📅 Revisión diaria (manual)</option>
                <option value="weekly_check">📆 Revisión semanal (manual)</option>
                <option value="completion_low">⚠️ % completado bajo</option>
              </select>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Condiciones (todas deben cumplirse)
                </label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus size={16} />
                  <span>Agregar condición</span>
                </button>
              </div>

              {conditions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Sin condiciones (siempre ejecuta)</p>
              ) : (
                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg">
                      <select
                        value={condition.type}
                        onChange={(e) => updateCondition(index, 'type', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="status_equals">Estado igual a</option>
                        <option value="status_for_days">Estado por N días</option>
                        <option value="completion_less_than">% completado menor que</option>
                        <option value="completion_greater_than">% completado mayor que</option>
                        <option value="day_of_week">Día de la semana</option>
                        <option value="days_until_deadline">Días hasta deadline</option>
                        <option value="user_equals">Usuario igual a</option>
                        <option value="initiative_equals">Iniciativa igual a</option>
                      </select>

                      {/* Value input */}
                      {condition.type === 'status_equals' && (
                        <select
                          value={condition.value}
                          onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="EN_TIEMPO">EN_TIEMPO</option>
                          <option value="EN_RIESGO">EN_RIESGO</option>
                          <option value="BLOQUEADO">BLOQUEADO</option>
                          <option value="COMPLETADO">COMPLETADO</option>
                        </select>
                      )}

                      {(condition.type === 'completion_less_than' || condition.type === 'completion_greater_than') && (
                        <input
                          type="number"
                          value={condition.value || 0}
                          onChange={(e) => updateCondition(index, 'value', parseInt(e.target.value))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          min="0"
                          max="100"
                          placeholder="%"
                        />
                      )}

                      {condition.type === 'status_for_days' && (
                        <>
                          <select
                            value={condition.value}
                            onChange={(e) => updateCondition(index, 'value', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="EN_TIEMPO">EN_TIEMPO</option>
                            <option value="EN_RIESGO">EN_RIESGO</option>
                            <option value="BLOQUEADO">BLOQUEADO</option>
                          </select>
                          <input
                            type="number"
                            value={condition.days || 1}
                            onChange={(e) => updateCondition(index, 'days', parseInt(e.target.value))}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="1"
                            placeholder="días"
                          />
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Acciones * (al menos una)
                </label>
                <button
                  type="button"
                  onClick={addAction}
                  className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm"
                >
                  <Plus size={16} />
                  <span>Agregar acción</span>
                </button>
              </div>

              {actions.length === 0 ? (
                <p className="text-sm text-red-600">⚠️ Debes agregar al menos una acción</p>
              ) : (
                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded-lg space-y-2">
                      <div className="flex items-center space-x-2">
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(index, 'type', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="send_notification">🔔 Enviar notificación</option>
                          <option value="send_email">📧 Enviar email</option>
                          <option value="change_status">🔄 Cambiar estado</option>
                          <option value="assign_to_user">👤 Reasignar usuario</option>
                          <option value="add_comment">💬 Agregar comentario</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Action-specific fields */}
                      {(action.type === 'send_notification' || action.type === 'add_comment') && (
                        <input
                          type="text"
                          value={action.message || ''}
                          onChange={(e) => updateAction(index, 'message', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Mensaje"
                        />
                      )}

                      {action.type === 'send_email' && (
                        <>
                          <input
                            type="text"
                            value={action.emailSubject || ''}
                            onChange={(e) => updateAction(index, 'emailSubject', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Asunto del email"
                          />
                          <input
                            type="text"
                            value={action.message || ''}
                            onChange={(e) => updateAction(index, 'message', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Mensaje"
                          />
                        </>
                      )}

                      {action.type === 'change_status' && (
                        <select
                          value={action.newStatus || 'EN_RIESGO'}
                          onChange={(e) => updateAction(index, 'newStatus', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="EN_TIEMPO">EN_TIEMPO</option>
                          <option value="EN_RIESGO">EN_RIESGO</option>
                          <option value="BLOQUEADO">BLOQUEADO</option>
                          <option value="COMPLETADO">COMPLETADO</option>
                        </select>
                      )}

                      {action.type === 'assign_to_user' && users.length > 0 && (
                        <select
                          value={action.targetUserId || ''}
                          onChange={(e) => updateAction(index, 'targetUserId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Seleccionar usuario</option>
                          {users.map(user => (
                            <option key={user._id} value={user._id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/admin/workflows')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || actions.length === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={20} />
                <span>{saving ? 'Guardando...' : 'Guardar Workflow'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

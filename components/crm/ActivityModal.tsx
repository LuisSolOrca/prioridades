'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Phone,
  Mail,
  Users,
  FileText,
  CheckSquare,
  Calendar,
  Clock,
  User,
  Building2,
  Briefcase
} from 'lucide-react';

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task';

interface Client {
  _id: string;
  name: string;
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  clientId?: { _id: string; name: string };
}

interface Deal {
  _id: string;
  title: string;
  clientId?: { _id: string; name: string };
}

interface UserOption {
  _id: string;
  name: string;
}

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: ActivityType;
  clientId?: string;
  contactId?: string;
  dealId?: string;
  clientName?: string;
  contactName?: string;
  dealTitle?: string;
}

const ACTIVITY_TYPES = [
  { type: 'call' as ActivityType, label: 'Llamada', icon: Phone, color: 'blue' },
  { type: 'email' as ActivityType, label: 'Email', icon: Mail, color: 'purple' },
  { type: 'meeting' as ActivityType, label: 'Reunion', icon: Users, color: 'green' },
  { type: 'note' as ActivityType, label: 'Nota', icon: FileText, color: 'gray' },
  { type: 'task' as ActivityType, label: 'Tarea', icon: CheckSquare, color: 'yellow' },
];

export default function ActivityModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'note',
  clientId,
  contactId,
  dealId,
  clientName,
  contactName,
  dealTitle,
}: ActivityModalProps) {
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    type: defaultType,
    title: '',
    description: '',
    clientId: clientId || '',
    contactId: contactId || '',
    dealId: dealId || '',
    dueDate: '',
    duration: '',
    outcome: '',
    assignedTo: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      setFormData({
        type: defaultType,
        title: '',
        description: '',
        clientId: clientId || '',
        contactId: contactId || '',
        dealId: dealId || '',
        dueDate: '',
        duration: '',
        outcome: '',
        assignedTo: '',
      });
    }
  }, [isOpen, defaultType, clientId, contactId, dealId]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [clientsRes, contactsRes, dealsRes, usersRes] = await Promise.all([
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/crm/contacts?activeOnly=true'),
        fetch('/api/crm/deals'),
        fetch('/api/users'),
      ]);

      const [clientsData, contactsData, dealsData, usersData] = await Promise.all([
        clientsRes.json(),
        contactsRes.json(),
        dealsRes.json(),
        usersRes.json(),
      ]);

      setClients(Array.isArray(clientsData) ? clientsData : []);
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setDeals(Array.isArray(dealsData) ? dealsData : []);
      setUsers(Array.isArray(usersData) ? usersData.filter((u: any) => u.isActive) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId && !formData.contactId && !formData.dealId) {
      alert('Debes seleccionar al menos un cliente, contacto o deal');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        outcome: formData.outcome || undefined,
      };

      if (formData.clientId) payload.clientId = formData.clientId;
      if (formData.contactId) payload.contactId = formData.contactId;
      if (formData.dealId) payload.dealId = formData.dealId;
      if (formData.dueDate) payload.dueDate = formData.dueDate;
      if (formData.duration) payload.duration = parseInt(formData.duration);
      if (formData.assignedTo) payload.assignedTo = formData.assignedTo;

      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear actividad');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getTypeConfig = (type: ActivityType) => {
    return ACTIVITY_TYPES.find(t => t.type === type) || ACTIVITY_TYPES[0];
  };

  const selectedTypeConfig = getTypeConfig(formData.type);

  // Filter contacts by selected client
  const filteredContacts = formData.clientId
    ? contacts.filter(c => c.clientId?._id === formData.clientId)
    : contacts;

  // Filter deals by selected client
  const filteredDeals = formData.clientId
    ? deals.filter((d: any) => d.clientId?._id === formData.clientId)
    : deals;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Nueva Actividad
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {loadingData ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Activity Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de actividad
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.map(({ type, label, icon: Icon, color }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition ${
                      formData.type === type
                        ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400`
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    style={formData.type === type ? {
                      borderColor: color === 'blue' ? '#3b82f6' :
                                   color === 'purple' ? '#8b5cf6' :
                                   color === 'green' ? '#10b981' :
                                   color === 'gray' ? '#6b7280' : '#f59e0b',
                      backgroundColor: color === 'blue' ? '#eff6ff' :
                                       color === 'purple' ? '#f5f3ff' :
                                       color === 'green' ? '#ecfdf5' :
                                       color === 'gray' ? '#f9fafb' : '#fffbeb'
                    } : {}}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titulo *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={
                  formData.type === 'call' ? 'Ej: Llamada de seguimiento' :
                  formData.type === 'email' ? 'Ej: Envio de propuesta' :
                  formData.type === 'meeting' ? 'Ej: Reunion de presentacion' :
                  formData.type === 'task' ? 'Ej: Preparar cotizacion' :
                  'Ej: Nota sobre conversacion'
                }
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripcion
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Detalles de la actividad..."
              />
            </div>

            {/* Associations */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Asociar a
              </h3>

              {/* Pre-filled associations */}
              {(clientName || contactName || dealTitle) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {clientName && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                      <Building2 size={14} />
                      {clientName}
                    </span>
                  )}
                  {contactName && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm">
                      <User size={14} />
                      {contactName}
                    </span>
                  )}
                  {dealTitle && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm">
                      <Briefcase size={14} />
                      {dealTitle}
                    </span>
                  )}
                </div>
              )}

              {/* Client */}
              {!clientId && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Cliente
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({
                      ...formData,
                      clientId: e.target.value,
                      contactId: '',
                      dealId: ''
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clients.map(client => (
                      <option key={client._id} value={client._id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contact */}
              {!contactId && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Contacto
                  </label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Seleccionar contacto...</option>
                    {filteredContacts.map(contact => (
                      <option key={contact._id} value={contact._id}>
                        {contact.firstName} {contact.lastName}
                        {contact.clientId && ` (${contact.clientId.name})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Deal */}
              {!dealId && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Deal
                  </label>
                  <select
                    value={formData.dealId}
                    onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Seleccionar deal...</option>
                    {filteredDeals.map((deal: any) => (
                      <option key={deal._id} value={deal._id}>
                        {deal.title}
                        {deal.clientId && ` (${deal.clientId.name})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Conditional fields based on type */}
            <div className="grid grid-cols-2 gap-4">
              {/* Duration - for calls and meetings */}
              {(formData.type === 'call' || formData.type === 'meeting') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Clock size={14} className="inline mr-1" />
                    Duracion (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="30"
                  />
                </div>
              )}

              {/* Due Date - for tasks */}
              {formData.type === 'task' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Fecha limite
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}

              {/* Assigned To - for tasks */}
              {formData.type === 'task' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <User size={14} className="inline mr-1" />
                    Asignar a
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sin asignar</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Outcome - for completed activities */}
            {formData.type !== 'task' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resultado / Siguiente paso
                </label>
                <input
                  type="text"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: Cliente interesado, agendar demo"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                style={{
                  backgroundColor: selectedTypeConfig.color === 'blue' ? '#3b82f6' :
                                   selectedTypeConfig.color === 'purple' ? '#8b5cf6' :
                                   selectedTypeConfig.color === 'green' ? '#10b981' :
                                   selectedTypeConfig.color === 'gray' ? '#6b7280' : '#f59e0b'
                }}
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                Registrar {selectedTypeConfig.label}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

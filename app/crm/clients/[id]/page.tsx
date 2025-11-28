'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  DollarSign,
  Briefcase,
  Tag,
  Calendar,
  ArrowLeft,
  Edit,
  Plus,
  Mail,
  TrendingUp,
  UserCircle,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  ExternalLink,
  MessageSquare,
  PhoneCall,
  Video
} from 'lucide-react';

interface Client {
  _id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  address?: string;
  annualRevenue?: number;
  employeeCount?: number;
  source?: string;
  tags?: string[];
  crmNotes?: string;
  isActive: boolean;
  createdAt: string;
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
}

interface Deal {
  _id: string;
  title: string;
  value: number;
  currency: string;
  probability?: number;
  expectedCloseDate?: string;
  stageId: {
    _id: string;
    name: string;
    color: string;
    probability?: number;
    isClosed: boolean;
    isWon: boolean;
  };
}

interface Activity {
  _id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  createdBy?: { name: string };
  isCompleted: boolean;
}

export default function ClientDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { permissions } = usePermissions();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    industry: '',
    website: '',
    phone: '',
    address: '',
    annualRevenue: 0,
    employeeCount: 0,
    source: '',
    crmNotes: '',
  });

  const [newDeal, setNewDeal] = useState({
    title: '',
    value: 0,
    currency: 'MXN',
    expectedCloseDate: '',
  });

  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    isPrimary: false,
  });

  const [newActivity, setNewActivity] = useState({
    type: 'note',
    title: '',
    description: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      if (!permissions.viewCRM) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, permissions.viewCRM, clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientRes, contactsRes, dealsRes, activitiesRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/crm/contacts?clientId=${clientId}`),
        fetch(`/api/crm/deals?clientId=${clientId}`),
        fetch(`/api/crm/activities?clientId=${clientId}&limit=20`),
      ]);

      if (!clientRes.ok) {
        router.push('/crm');
        return;
      }

      const clientData = await clientRes.json();
      const contactsData = await contactsRes.json();
      const dealsData = await dealsRes.json();
      const activitiesData = await activitiesRes.json();

      setClient(clientData);
      setContacts(contactsData);
      setDeals(dealsData);
      setActivities(activitiesData);

      // Initialize edit form
      setEditForm({
        name: clientData.name || '',
        description: clientData.description || '',
        industry: clientData.industry || '',
        website: clientData.website || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        annualRevenue: clientData.annualRevenue || 0,
        employeeCount: clientData.employeeCount || 0,
        source: clientData.source || '',
        crmNotes: clientData.crmNotes || '',
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Error al actualizar cliente');
      setShowEditModal(false);
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newDeal, clientId }),
      });
      if (!res.ok) throw new Error('Error al crear deal');
      setShowNewDealModal(false);
      setNewDeal({ title: '', value: 0, currency: 'MXN', expectedCloseDate: '' });
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newContact, clientId }),
      });
      if (!res.ok) throw new Error('Error al crear contacto');
      setShowNewContactModal(false);
      setNewContact({ firstName: '', lastName: '', email: '', phone: '', position: '', isPrimary: false });
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newActivity, clientId }),
      });
      if (!res.ok) throw new Error('Error al crear actividad');
      setShowNewActivityModal(false);
      setNewActivity({ type: 'note', title: '', description: '' });
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <PhoneCall size={16} className="text-green-500" />;
      case 'email': return <Mail size={16} className="text-blue-500" />;
      case 'meeting': return <Video size={16} className="text-purple-500" />;
      case 'note': return <FileText size={16} className="text-gray-500" />;
      case 'task': return <CheckCircle size={16} className="text-orange-500" />;
      default: return <MessageSquare size={16} className="text-gray-500" />;
    }
  };

  // Calculate stats
  const totalDealsValue = deals.reduce((sum, d) => sum + d.value, 0);
  const openDeals = deals.filter(d => !d.stageId.isClosed);
  const wonDeals = deals.filter(d => d.stageId.isWon);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !client) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Back button */}
        <Link
          href="/crm"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver al CRM
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-2xl font-bold">
                {client.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{client.name}</h1>
                {client.industry && (
                  <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <Briefcase size={16} />
                    {client.industry}
                  </p>
                )}
                {client.description && (
                  <p className="text-gray-500 dark:text-gray-500 mt-2 max-w-2xl">{client.description}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Edit size={18} />
              Editar
            </button>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t dark:border-gray-700">
            {client.website && (
              <a
                href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Globe size={16} />
                {client.website}
                <ExternalLink size={14} />
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600">
                <Phone size={16} />
                {client.phone}
              </a>
            )}
            {client.address && (
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin size={16} />
                {client.address}
              </span>
            )}
          </div>

          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {client.tags.map((tag, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm flex items-center gap-1">
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <DollarSign size={16} />
              Valor Total Deals
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(totalDealsValue)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <TrendingUp size={16} />
              Deals Abiertos
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{openDeals.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <CheckCircle size={16} className="text-green-500" />
              Ganados
            </div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(wonValue)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
              <Users size={16} />
              Contactos
            </div>
            <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{contacts.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deals */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <DollarSign size={20} className="text-emerald-500" />
                  Deals ({deals.length})
                </h2>
                {permissions.canManageDeals && (
                  <button
                    onClick={() => setShowNewDealModal(true)}
                    className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg"
                  >
                    <Plus size={16} />
                    Nuevo Deal
                  </button>
                )}
              </div>
              <div className="divide-y dark:divide-gray-700">
                {deals.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No hay deals para este cliente
                  </div>
                ) : (
                  deals.map(deal => (
                    <Link
                      key={deal._id}
                      href={`/crm/deals`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-100">{deal.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="px-2 py-0.5 rounded text-xs text-white"
                            style={{ backgroundColor: deal.stageId.color }}
                          >
                            {deal.stageId.name}
                          </span>
                          {deal.expectedCloseDate && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(deal.expectedCloseDate).toLocaleDateString('es-MX')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(deal.value, deal.currency)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {deal.probability || deal.stageId.probability || 0}% prob.
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Activities */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Clock size={20} className="text-purple-500" />
                  Actividades Recientes
                </h2>
                <button
                  onClick={() => setShowNewActivityModal(true)}
                  className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-3 py-1.5 rounded-lg"
                >
                  <Plus size={16} />
                  Nueva Actividad
                </button>
              </div>
              <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No hay actividades registradas
                  </div>
                ) : (
                  activities.map(activity => (
                    <div key={activity._id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-800 dark:text-gray-100">{activity.title}</h4>
                          {activity.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span>{new Date(activity.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            {activity.createdBy && <span>• {activity.createdBy.name}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Contacts & Info */}
          <div className="space-y-6">
            {/* Contacts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <UserCircle size={20} className="text-blue-500" />
                  Contactos
                </h2>
                {permissions.canManageContacts && (
                  <button
                    onClick={() => setShowNewContactModal(true)}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
              <div className="divide-y dark:divide-gray-700">
                {contacts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Sin contactos
                  </div>
                ) : (
                  contacts.map(contact => (
                    <div key={contact._id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-800 dark:text-gray-100 truncate">
                              {contact.firstName} {contact.lastName}
                            </h4>
                            {contact.isPrimary && (
                              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                                Principal
                              </span>
                            )}
                          </div>
                          {contact.position && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{contact.position}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Mail size={12} />
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 flex items-center gap-1"
                          >
                            <Phone size={12} />
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información</h2>
              <div className="space-y-3 text-sm">
                {client.employeeCount && client.employeeCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Empleados</span>
                    <span className="text-gray-800 dark:text-gray-200">{client.employeeCount.toLocaleString()}</span>
                  </div>
                )}
                {client.annualRevenue && client.annualRevenue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Facturación Anual</span>
                    <span className="text-gray-800 dark:text-gray-200">{formatCurrency(client.annualRevenue)}</span>
                  </div>
                )}
                {client.source && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Fuente</span>
                    <span className="text-gray-800 dark:text-gray-200">{client.source}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Creado</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {new Date(client.createdAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
              </div>

              {client.crmNotes && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notas</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{client.crmNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Editar Cliente</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateClient} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industria</label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sitio Web</label>
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empleados</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.employeeCount}
                    onChange={(e) => setEditForm({ ...editForm, employeeCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facturación Anual</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.annualRevenue}
                    onChange={(e) => setEditForm({ ...editForm, annualRevenue: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fuente</label>
                  <input
                    type="text"
                    value={editForm.source}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Ej: Referido, Web, Evento..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas CRM</label>
                  <textarea
                    value={editForm.crmNotes}
                    onChange={(e) => setEditForm({ ...editForm, crmNotes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      {showNewDealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nuevo Deal</h2>
              <button onClick={() => setShowNewDealModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateDeal} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newDeal.value}
                    onChange={(e) => setNewDeal({ ...newDeal, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                  <select
                    value={newDeal.currency}
                    onChange={(e) => setNewDeal({ ...newDeal, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha esperada de cierre</label>
                <input
                  type="date"
                  value={newDeal.expectedCloseDate}
                  onChange={(e) => setNewDeal({ ...newDeal, expectedCloseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setShowNewDealModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Crear Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Contact Modal */}
      {showNewContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nuevo Contacto</h2>
              <button onClick={() => setShowNewContactModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apellido *</label>
                  <input
                    type="text"
                    required
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo</label>
                <input
                  type="text"
                  value={newContact.position}
                  onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newContact.isPrimary}
                  onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Contacto principal</span>
              </label>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setShowNewContactModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Crear Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Activity Modal */}
      {showNewActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nueva Actividad</h2>
              <button onClick={() => setShowNewActivityModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateActivity} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="note">Nota</option>
                  <option value="call">Llamada</option>
                  <option value="email">Email</option>
                  <option value="meeting">Reunión</option>
                  <option value="task">Tarea</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setShowNewActivityModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Crear Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

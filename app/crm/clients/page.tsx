'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Building2,
  Search,
  Plus,
  Globe,
  Phone,
  Users,
  DollarSign,
  ArrowRight,
  Loader2,
  Briefcase,
  X
} from 'lucide-react';

interface Client {
  _id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  employeeCount?: number;
  isActive: boolean;
}

interface ClientStats {
  [clientId: string]: {
    dealsCount: number;
    dealsValue: number;
    contactsCount: number;
  };
}

export default function ClientsListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions } = usePermissions();

  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newClient, setNewClient] = useState({
    name: '',
    description: '',
    industry: '',
    website: '',
    phone: '',
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
  }, [status, router, permissions.viewCRM]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, dealsRes, contactsRes] = await Promise.all([
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/crm/deals'),
        fetch('/api/crm/contacts'),
      ]);

      const clientsData = await clientsRes.json();
      const dealsData = await dealsRes.json();
      const contactsData = await contactsRes.json();

      setClients(Array.isArray(clientsData) ? clientsData : []);

      // Calculate stats per client
      const clientStats: ClientStats = {};
      (Array.isArray(clientsData) ? clientsData : []).forEach((c: Client) => {
        const clientDeals = dealsData.filter((d: any) => d.clientId?._id === c._id || d.clientId === c._id);
        const clientContacts = contactsData.filter((ct: any) => ct.clientId?._id === c._id || ct.clientId === c._id);
        clientStats[c._id] = {
          dealsCount: clientDeals.length,
          dealsValue: clientDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
          contactsCount: clientContacts.length,
        };
      });
      setStats(clientStats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear cliente');
      }
      setShowNewModal(false);
      setNewClient({ name: '', description: '', industry: '', website: '', phone: '' });
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.industry?.toLowerCase().includes(search.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Building2 className="text-blue-500" />
              Clientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {filteredClients.length} clientes activos
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64"
              />
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus size={20} />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => {
            const clientStats = stats[client._id] || { dealsCount: 0, dealsValue: 0, contactsCount: 0 };

            return (
              <Link
                key={client._id}
                href={`/crm/clients/${client._id}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {client.name}
                    </h3>
                    {client.industry && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Briefcase size={14} />
                        {client.industry}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={20} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
                </div>

                {client.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">
                    {client.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-4 pt-4 border-t dark:border-gray-700 text-sm">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <DollarSign size={16} className="text-emerald-500" />
                    <span>{formatCurrency(clientStats.dealsValue)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Briefcase size={16} className="text-blue-500" />
                    <span>{clientStats.dealsCount} deals</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Users size={16} className="text-purple-500" />
                    <span>{clientStats.contactsCount}</span>
                  </div>
                </div>

                {(client.website || client.phone) && (
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {client.website && (
                      <span className="flex items-center gap-1">
                        <Globe size={12} />
                        {client.website.replace(/^https?:\/\//, '').split('/')[0]}
                      </span>
                    )}
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {client.phone}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}

          {filteredClients.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              No se encontraron clientes
            </div>
          )}
        </div>
      </div>

      {/* New Client Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nuevo Cliente</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={newClient.description}
                  onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Industria
                  </label>
                  <input
                    type="text"
                    value={newClient.industry}
                    onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Ej: Tecnología"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sitio Web
                </label>
                <input
                  type="text"
                  value={newClient.website}
                  onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="https://ejemplo.com"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useMemo } from 'react';
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
  X,
  LayoutGrid,
  Table,
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

interface Client {
  _id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  employeeCount?: number;
  isActive: boolean;
  createdAt?: string;
}

interface ClientStats {
  [clientId: string]: {
    dealsCount: number;
    dealsValue: number;
    contactsCount: number;
  };
}

type ViewMode = 'cards' | 'table';
type SortField = 'name' | 'industry' | 'dealsCount' | 'dealsValue' | 'contactsCount' | 'createdAt';
type SortDirection = 'asc' | 'desc';

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

  // View and filters
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showFilters, setShowFilters] = useState(false);
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [activityFilter, setActivityFilter] = useState<string>(''); // 'active', 'inactive', 'all'
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

  // Get unique industries from clients
  const industries = useMemo(() => {
    const uniqueIndustries = new Set<string>();
    clients.forEach(c => {
      if (c.industry) uniqueIndustries.add(c.industry);
    });
    return Array.from(uniqueIndustries).sort();
  }, [clients]);

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let result = clients.filter(client => {
      // Search filter
      const matchesSearch = client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.industry?.toLowerCase().includes(search.toLowerCase()) ||
        client.description?.toLowerCase().includes(search.toLowerCase());

      // Industry filter
      const matchesIndustry = !industryFilter || client.industry === industryFilter;

      // Activity filter (based on deals)
      const clientStats = stats[client._id] || { dealsCount: 0, dealsValue: 0, contactsCount: 0 };
      let matchesActivity = true;
      if (activityFilter === 'active') {
        matchesActivity = clientStats.dealsCount > 0;
      } else if (activityFilter === 'inactive') {
        matchesActivity = clientStats.dealsCount === 0;
      }

      return matchesSearch && matchesIndustry && matchesActivity;
    });

    // Sort
    result.sort((a, b) => {
      const statsA = stats[a._id] || { dealsCount: 0, dealsValue: 0, contactsCount: 0 };
      const statsB = stats[b._id] || { dealsCount: 0, dealsValue: 0, contactsCount: 0 };

      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'industry':
          comparison = (a.industry || '').localeCompare(b.industry || '');
          break;
        case 'dealsCount':
          comparison = statsA.dealsCount - statsB.dealsCount;
          break;
        case 'dealsValue':
          comparison = statsA.dealsValue - statsB.dealsValue;
          break;
        case 'contactsCount':
          comparison = statsA.contactsCount - statsB.contactsCount;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [clients, stats, search, industryFilter, activityFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-blue-500" />
      : <ChevronDown size={14} className="text-blue-500" />;
  };

  const clearFilters = () => {
    setSearch('');
    setIndustryFilter('');
    setActivityFilter('');
  };

  const hasActiveFilters = search || industryFilter || activityFilter;

  // Calculate totals
  const totals = useMemo(() => {
    return filteredAndSortedClients.reduce((acc, client) => {
      const clientStats = stats[client._id] || { dealsCount: 0, dealsValue: 0, contactsCount: 0 };
      return {
        dealsCount: acc.dealsCount + clientStats.dealsCount,
        dealsValue: acc.dealsValue + clientStats.dealsValue,
        contactsCount: acc.contactsCount + clientStats.contactsCount,
      };
    }, { dealsCount: 0, dealsValue: 0, contactsCount: 0 });
  }, [filteredAndSortedClients, stats]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-500" size={40} />
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
              {filteredAndSortedClients.length} de {clients.length} clientes
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* View Toggle */}
            <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  viewMode === 'cards'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <LayoutGrid size={16} />
                Kardex
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  viewMode === 'table'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Table size={16} />
                Tabla
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter size={18} />
              Filtros
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {[search, industryFilter, activityFilter].filter(Boolean).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus size={20} />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Help Card */}
        <CrmHelpCard
          id="crm-clients-guide"
          title="Gestiona tus empresas clientes"
          variant="info"
          className="mb-4"
          defaultCollapsed={true}
          tips={[
            'Los clientes representan empresas u organizaciones con las que haces negocios',
            'Cada cliente puede tener múltiples contactos asociados',
            'Haz clic en un cliente para ver su perfil completo con deals, contactos y actividades',
            'Usa los filtros para segmentar por industria o estado',
          ]}
        />

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industria
                </label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todas las industrias</option>
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Actividad
                </label>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todos</option>
                  <option value="active">Con deals activos</option>
                  <option value="inactive">Sin deals</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{filteredAndSortedClients.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Clientes</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <DollarSign size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(totals.dealsValue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Valor total</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Briefcase size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totals.dealsCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Deals activos</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Users size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totals.contactsCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Contactos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards View (Kardex) */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedClients.map(client => {
              const clientStats = stats[client._id] || { dealsCount: 0, dealsValue: 0, contactsCount: 0 };

              return (
                <Link
                  key={client._id}
                  href={`/crm/clients/${client._id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                >
                  {/* Gradient Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {client.name}
                        </h3>
                        {client.industry && (
                          <p className="text-sm text-blue-100 flex items-center gap-1 mt-0.5">
                            <Briefcase size={14} />
                            {client.industry}
                          </p>
                        )}
                      </div>
                      <ArrowRight size={20} className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {client.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {client.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(clientStats.dealsValue).replace('MXN', '').trim()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Valor</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {clientStats.dealsCount}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Deals</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {clientStats.contactsCount}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Contactos</p>
                      </div>
                    </div>

                    {/* Contact Info */}
                    {(client.website || client.phone) && (
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t dark:border-gray-700">
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
                  </div>
                </Link>
              );
            })}

            {filteredAndSortedClients.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                <Building2 size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg">No se encontraron clientes</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Cliente
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3">
                      <button
                        onClick={() => handleSort('industry')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Industria
                        <SortIcon field="industry" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-3">
                      <button
                        onClick={() => handleSort('dealsValue')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 ml-auto"
                      >
                        Valor
                        <SortIcon field="dealsValue" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button
                        onClick={() => handleSort('dealsCount')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mx-auto"
                      >
                        Deals
                        <SortIcon field="dealsCount" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button
                        onClick={() => handleSort('contactsCount')}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mx-auto"
                      >
                        Contactos
                        <SortIcon field="contactsCount" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Contacto
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedClients.map(client => {
                    const clientStats = stats[client._id] || { dealsCount: 0, dealsValue: 0, contactsCount: 0 };

                    return (
                      <tr
                        key={client._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {client.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/crm/clients/${client._id}`}
                                className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                              >
                                {client.name}
                              </Link>
                              {client.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {client.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {client.industry ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                              <Briefcase size={12} />
                              {client.industry}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${
                            clientStats.dealsValue > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {formatCurrency(clientStats.dealsValue)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium ${
                            clientStats.dealsCount > 0
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            {clientStats.dealsCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium ${
                            clientStats.contactsCount > 0
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            {clientStats.contactsCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 text-sm">
                            {client.website && (
                              <a
                                href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <Globe size={12} />
                                <span className="truncate max-w-[120px]">
                                  {client.website.replace(/^https?:\/\//, '').split('/')[0]}
                                </span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                            {client.phone && (
                              <a
                                href={`tel:${client.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                              >
                                <Phone size={12} />
                                {client.phone}
                              </a>
                            )}
                            {!client.website && !client.phone && (
                              <span className="text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/crm/clients/${client._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                          >
                            Ver detalle
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAndSortedClients.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Building2 size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg">No se encontraron clientes</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* Table Footer with totals */}
            {filteredAndSortedClients.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Mostrando {filteredAndSortedClients.length} clientes
                  </span>
                  <div className="flex items-center gap-6">
                    <span className="text-gray-600 dark:text-gray-400">
                      Total valor: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.dealsValue)}</span>
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Total deals: <span className="font-semibold text-blue-600 dark:text-blue-400">{totals.dealsCount}</span>
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Total contactos: <span className="font-semibold text-purple-600 dark:text-purple-400">{totals.contactsCount}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Client Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nuevo Cliente</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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

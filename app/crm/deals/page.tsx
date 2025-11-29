'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Search, Filter, DollarSign, Calendar, User, Building2, X, Loader2, UserPlus, Layers, ChevronDown } from 'lucide-react';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

interface Pipeline {
  _id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

interface PipelineStage {
  _id: string;
  name: string;
  order: number;
  color: string;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
}

interface Client {
  _id: string;
  name: string;
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface Deal {
  _id: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate?: string;
  probability?: number;
  clientId: Client;
  contactId?: Contact;
  stageId: PipelineStage;
  ownerId: { _id: string; name: string };
}

interface User {
  _id: string;
  name: string;
  isActive: boolean;
}

export default function DealsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);

  const [newDeal, setNewDeal] = useState({
    title: '',
    value: 0,
    currency: 'MXN',
    clientId: '',
    contactId: '',
    ownerId: '',
    expectedCloseDate: '',
    description: '',
    pipelineId: '',
  });

  // Estados para creación inline
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newContact, setNewContact] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [savingClient, setSavingClient] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    // Wait for permissions to load before checking access
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.viewCRM || !permissions.canManageDeals) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, permissions.viewCRM, permissions.canManageDeals, permissionsLoading]);

  const loadData = async (pipelineId?: string) => {
    try {
      setLoading(true);

      // Fetch pipelines first
      const pipelinesRes = await fetch('/api/crm/pipelines');
      const pipelinesData = await pipelinesRes.json();
      setPipelines(pipelinesData);

      // Determine which pipeline to use
      let activePipelineId = pipelineId || selectedPipelineId;
      if (!activePipelineId && pipelinesData.length > 0) {
        // Use default pipeline or first one
        const defaultPipeline = pipelinesData.find((p: Pipeline) => p.isDefault) || pipelinesData[0];
        activePipelineId = defaultPipeline._id;
        setSelectedPipelineId(activePipelineId);
      }

      // Build query params
      const stagesQuery = activePipelineId ? `?activeOnly=true&pipelineId=${activePipelineId}` : '?activeOnly=true';
      const dealsQuery = activePipelineId ? `?pipelineId=${activePipelineId}` : '';

      const [stagesRes, dealsRes, clientsRes, usersRes] = await Promise.all([
        fetch(`/api/crm/pipeline-stages${stagesQuery}`),
        fetch(`/api/crm/deals${dealsQuery}`),
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/users'),
      ]);

      const stagesData = await stagesRes.json();
      const dealsData = await dealsRes.json();
      const clientsData = await clientsRes.json();
      const usersData = await usersRes.json();

      setStages(stagesData.sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
      setDeals(dealsData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setUsers(Array.isArray(usersData) ? usersData.filter((u: User) => u.isActive) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    setShowPipelineDropdown(false);
    loadData(pipelineId);
  };

  const selectedPipeline = pipelines.find(p => p._id === selectedPipelineId);

  const loadContacts = async (clientId: string) => {
    if (!clientId) {
      setContacts([]);
      return;
    }
    try {
      const res = await fetch(`/api/crm/contacts?clientId=${clientId}&activeOnly=true`);
      const data = await res.json();
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    setSavingClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientName.trim() }),
      });
      if (!res.ok) throw new Error('Error al crear cliente');
      const client = await res.json();
      setClients([...clients, client]);
      setNewDeal({ ...newDeal, clientId: client._id, contactId: '' });
      setNewClientName('');
      setShowNewClientForm(false);
      loadContacts(client._id);
    } catch (error: any) {
      alert(error.message || 'Error al crear cliente');
    } finally {
      setSavingClient(false);
    }
  };

  const handleCreateContact = async () => {
    if (!newContact.firstName.trim() || !newContact.lastName.trim()) return;
    if (!newDeal.clientId) {
      alert('Primero selecciona un cliente');
      return;
    }
    setSavingContact(true);
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newContact, clientId: newDeal.clientId }),
      });
      if (!res.ok) throw new Error('Error al crear contacto');
      const contact = await res.json();
      setContacts([...contacts, contact]);
      setNewDeal({ ...newDeal, contactId: contact._id });
      setNewContact({ firstName: '', lastName: '', email: '', phone: '' });
      setShowNewContactForm(false);
    } catch (error: any) {
      alert(error.message || 'Error al crear contacto');
    } finally {
      setSavingContact(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    // Optimistic update
    const updatedDeals = deals.map(deal => {
      if (deal._id === draggableId) {
        const newStage = stages.find(s => s._id === destination.droppableId);
        return {
          ...deal,
          stageId: newStage || deal.stageId,
        };
      }
      return deal;
    });
    setDeals(updatedDeals);

    try {
      await fetch(`/api/crm/deals/${draggableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: destination.droppableId }),
      });
    } catch (error) {
      console.error('Error updating deal stage:', error);
      loadData(); // Revert on error
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeal),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      setShowNewDealModal(false);
      setNewDeal({
        title: '',
        value: 0,
        currency: 'MXN',
        clientId: '',
        contactId: '',
        ownerId: '',
        expectedCloseDate: '',
        description: '',
        pipelineId: selectedPipelineId,
      });
      loadData(selectedPipelineId);
    } catch (error: any) {
      alert(error.message || 'Error al crear el deal');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStageDeals = (stageId: string) => {
    return deals.filter(deal => {
      const matchesStage = deal.stageId._id === stageId;
      const matchesSearch = !search ||
        deal.title.toLowerCase().includes(search.toLowerCase()) ||
        deal.clientId?.name?.toLowerCase().includes(search.toLowerCase());
      return matchesStage && matchesSearch;
    });
  };

  const calculateStageValue = (stageId: string) => {
    return getStageDeals(stageId).reduce((sum, deal) => sum + deal.value, 0);
  };

  const totalPipelineValue = deals
    .filter(d => !d.stageId.isClosed)
    .reduce((sum, deal) => sum + deal.value, 0);

  const weightedPipelineValue = deals
    .filter(d => !d.stageId.isClosed)
    .reduce((sum, deal) => sum + (deal.value * (deal.probability || deal.stageId.probability) / 100), 0);

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={40} />
          <div className="text-gray-600 dark:text-gray-400">Cargando pipeline...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <DollarSign className="text-emerald-500" />
                Pipeline de Ventas
              </h1>
              {/* Pipeline Selector */}
              {pipelines.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {selectedPipeline && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedPipeline.color }}
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {selectedPipeline?.name || 'Seleccionar Pipeline'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showPipelineDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                      {pipelines.map((pipeline) => (
                        <button
                          key={pipeline._id}
                          onClick={() => handlePipelineChange(pipeline._id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                            selectedPipelineId === pipeline._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: pipeline.color }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">
                            {pipeline.name}
                          </span>
                          {pipeline.isDefault && (
                            <span className="text-xs text-gray-400">Default</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Total: <strong className="text-gray-800 dark:text-gray-200">{formatCurrency(totalPipelineValue, 'MXN')}</strong></span>
              <span>Ponderado: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(weightedPipelineValue, 'MXN')}</strong></span>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar deals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64"
              />
            </div>
            <button
              onClick={() => setShowNewDealModal(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-medium"
            >
              <Plus size={20} />
              Nuevo Deal
            </button>
          </div>
        </div>

        {/* Help Card */}
        <CrmHelpCard
          id="crm-deals-guide"
          title="Gestiona tu pipeline de ventas"
          variant="tip"
          className="mb-4"
          defaultCollapsed={true}
          tips={[
            'Arrastra y suelta los deals entre columnas para cambiar su etapa',
            'Haz clic en un deal para ver detalles, agregar productos y crear cotizaciones',
            'El valor ponderado se calcula multiplicando el valor por la probabilidad de la etapa',
            'Usa el buscador para filtrar deals por nombre o cliente',
          ]}
        />

        {/* Pipeline Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map(stage => {
              const stageDeals = getStageDeals(stage._id);
              const stageValue = calculateStageValue(stage._id);

              return (
                <div key={stage._id} className="flex-shrink-0 w-80">
                  {/* Stage Header */}
                  <div
                    className="rounded-t-lg px-4 py-3 text-white"
                    style={{ backgroundColor: stage.color }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{stage.name}</h3>
                      <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-sm opacity-90 mt-1">
                      {formatCurrency(stageValue, 'MXN')} • {stage.probability}%
                    </div>
                  </div>

                  {/* Deals Column */}
                  <Droppable droppableId={stage._id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[500px] p-2 rounded-b-lg transition-colors ${
                          snapshot.isDraggingOver
                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal._id} draggableId={deal._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => router.push(`/crm/deals/${deal._id}`)}
                                className={`bg-white dark:bg-gray-700 rounded-lg p-4 mb-2 shadow-sm cursor-pointer hover:shadow-md transition ${
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-emerald-400' : ''
                                }`}
                              >
                                <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                                  {deal.title}
                                </h4>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                                  {formatCurrency(deal.value, deal.currency)}
                                </div>
                                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <Building2 size={14} />
                                    <span className="truncate">{deal.clientId?.name || 'Sin cliente'}</span>
                                  </div>
                                  {deal.expectedCloseDate && (
                                    <div className="flex items-center gap-1">
                                      <Calendar size={14} />
                                      <span>{new Date(deal.expectedCloseDate).toLocaleDateString('es-MX')}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <User size={14} />
                                    <span className="truncate">{deal.ownerId?.name}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {stageDeals.length === 0 && (
                          <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
                            Sin deals
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* New Deal Modal */}
      {showNewDealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nuevo Deal</h2>
              <button
                onClick={() => setShowNewDealModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título del Deal *
                </label>
                <input
                  type="text"
                  required
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: Implementación sistema X"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Moneda
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliente *
                </label>
                {!showNewClientForm ? (
                  <div className="flex gap-2">
                    <select
                      required
                      value={newDeal.clientId}
                      onChange={(e) => {
                        setNewDeal({ ...newDeal, clientId: e.target.value, contactId: '' });
                        loadContacts(e.target.value);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clients.map(client => (
                        <option key={client._id} value={client._id}>{client.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewClientForm(true)}
                      className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800"
                      title="Nuevo cliente"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 font-medium mb-2">
                      <Building2 size={16} />
                      Nuevo Cliente
                    </div>
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => { setShowNewClientForm(false); setNewClientName(''); }}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateClient}
                        disabled={!newClientName.trim() || savingClient}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {savingClient && <Loader2 size={14} className="animate-spin" />}
                        Crear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {newDeal.clientId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contacto
                  </label>
                  {!showNewContactForm ? (
                    <div className="flex gap-2">
                      <select
                        value={newDeal.contactId}
                        onChange={(e) => setNewDeal({ ...newDeal, contactId: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Seleccionar contacto...</option>
                        {contacts.map(contact => (
                          <option key={contact._id} value={contact._id}>
                            {contact.firstName} {contact.lastName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewContactForm(true)}
                        className="px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800"
                        title="Nuevo contacto"
                      >
                        <UserPlus size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400 font-medium mb-2">
                        <UserPlus size={16} />
                        Nuevo Contacto
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nombre *"
                          value={newContact.firstName}
                          onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                          autoFocus
                        />
                        <input
                          type="text"
                          placeholder="Apellido *"
                          value={newContact.lastName}
                          onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          placeholder="Email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                        <input
                          type="tel"
                          placeholder="Teléfono"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { setShowNewContactForm(false); setNewContact({ firstName: '', lastName: '', email: '', phone: '' }); }}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateContact}
                          disabled={!newContact.firstName.trim() || !newContact.lastName.trim() || savingContact}
                          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingContact && <Loader2 size={14} className="animate-spin" />}
                          Crear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendedor/Responsable
                </label>
                <select
                  value={newDeal.ownerId}
                  onChange={(e) => setNewDeal({ ...newDeal, ownerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Usuario actual (por defecto)</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Si no seleccionas uno, se asignará automáticamente al usuario que crea el deal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha esperada de cierre
                </label>
                <input
                  type="date"
                  value={newDeal.expectedCloseDate}
                  onChange={(e) => setNewDeal({ ...newDeal, expectedCloseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={newDeal.description}
                  onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowNewDealModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Crear Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

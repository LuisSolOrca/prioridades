'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Search, Filter, DollarSign, Calendar, User, Building2, X, Loader2 } from 'lucide-react';

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

export default function DealsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [saving, setSaving] = useState(false);

  const [newDeal, setNewDeal] = useState({
    title: '',
    value: 0,
    currency: 'MXN',
    clientId: '',
    contactId: '',
    expectedCloseDate: '',
    description: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      if (!hasPermission('viewCRM') || !hasPermission('canManageDeals')) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, router, hasPermission]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stagesRes, dealsRes, clientsRes] = await Promise.all([
        fetch('/api/crm/pipeline-stages?activeOnly=true'),
        fetch('/api/crm/deals'),
        fetch('/api/clients?activeOnly=true'),
      ]);

      const stagesData = await stagesRes.json();
      const dealsData = await dealsRes.json();
      const clientsData = await clientsRes.json();

      setStages(stagesData.sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
      setDeals(dealsData);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        expectedCloseDate: '',
        description: '',
      });
      loadData();
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

  if (status === 'loading' || loading) {
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
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <DollarSign className="text-emerald-500" />
              Pipeline de Ventas
            </h1>
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
                                onClick={() => setSelectedDeal(deal)}
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
                <select
                  required
                  value={newDeal.clientId}
                  onChange={(e) => {
                    setNewDeal({ ...newDeal, clientId: e.target.value, contactId: '' });
                    loadContacts(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>{client.name}</option>
                  ))}
                </select>
              </div>

              {contacts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contacto
                  </label>
                  <select
                    value={newDeal.contactId}
                    onChange={(e) => setNewDeal({ ...newDeal, contactId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Seleccionar contacto...</option>
                    {contacts.map(contact => (
                      <option key={contact._id} value={contact._id}>
                        {contact.firstName} {contact.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedDeal.title}</h2>
              <button
                onClick={() => setSelectedDeal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: selectedDeal.stageId.color }}
                >
                  {selectedDeal.stageId.name}
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedDeal.value, selectedDeal.currency)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Cliente:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{selectedDeal.clientId?.name}</p>
                </div>
                {selectedDeal.contactId && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Contacto:</span>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedDeal.contactId.firstName} {selectedDeal.contactId.lastName}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Responsable:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{selectedDeal.ownerId?.name}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Probabilidad:</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {selectedDeal.probability || selectedDeal.stageId.probability}%
                  </p>
                </div>
                {selectedDeal.expectedCloseDate && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Fecha esperada de cierre:</span>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {new Date(selectedDeal.expectedCloseDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setSelectedDeal(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

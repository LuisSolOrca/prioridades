'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';
import {
  DollarSign,
  Building2,
  UserCircle,
  Calendar,
  ArrowLeft,
  Edit,
  Plus,
  Mail,
  Phone,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  User,
  FileText,
  PhoneCall,
  Video,
  MessageSquare,
  Tag,
  Briefcase,
  ArrowRight,
  ChevronDown,
  Percent,
  AlertCircle,
  Trophy,
  Target,
  Package,
  ShoppingCart,
  FileSpreadsheet,
  Send,
  Download,
  Trash2,
  Search,
  Receipt,
  Eye,
} from 'lucide-react';

interface PipelineStage {
  _id: string;
  name: string;
  color: string;
  probability: number;
  isClosed: boolean;
  isWon: boolean;
  order: number;
}

interface Client {
  _id: string;
  name: string;
  industry?: string;
  phone?: string;
  website?: string;
}

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
}

interface Deal {
  _id: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  lostReason?: string;
  tags?: string[];
  clientId: Client;
  contactId?: Contact;
  stageId: PipelineStage;
  ownerId: { _id: string; name: string; email: string };
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  _id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  createdBy?: { _id: string; name: string };
  isCompleted: boolean;
  dueDate?: string;
  outcome?: string;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  currency: string;
  category?: string;
  unit?: string;
  taxRate?: number;
  pricingTiers?: { minQuantity: number; price: number }[];
}

interface DealProduct {
  _id: string;
  productId: Product;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  notes?: string;
  order: number;
}

interface Quote {
  _id: string;
  quoteNumber: string;
  version: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  items: any[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  clientName: string;
  createdAt: string;
  pdfGeneratedAt?: string;
  sentAt?: string;
  sentTo?: string;
}

interface ProductTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  itemCount: number;
}

export default function DealDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Products & Quotes state
  const [dealProducts, setDealProducts] = useState<DealProduct[]>([]);
  const [productTotals, setProductTotals] = useState<ProductTotals | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'activities' | 'products' | 'quotes'>('activities');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCreateQuoteModal, setShowCreateQuoteModal] = useState(false);
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    value: 0,
    currency: 'MXN',
    probability: 0,
    expectedCloseDate: '',
    contactId: '',
    ownerId: '',
    tags: '',
  });

  const [newActivity, setNewActivity] = useState({
    type: 'note',
    title: '',
    description: '',
  });

  const [lostReason, setLostReason] = useState('');

  // Add product form
  const [addProductForm, setAddProductForm] = useState({
    productId: '',
    quantity: 1,
    discount: 0,
    notes: '',
  });

  // Quote form
  const [quoteForm, setQuoteForm] = useState({
    validDays: 30,
    terms: '',
    notes: '',
  });

  // Send quote form
  const [sendQuoteForm, setSendQuoteForm] = useState({
    email: '',
    subject: '',
    message: '',
  });

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
  }, [status, router, permissions.viewCRM, permissions.canManageDeals, permissionsLoading, dealId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dealRes, stagesRes, usersRes, productsRes, quotesRes] = await Promise.all([
        fetch(`/api/crm/deals/${dealId}`),
        fetch('/api/crm/pipeline-stages?activeOnly=true'),
        fetch('/api/users'),
        fetch(`/api/crm/deals/${dealId}/products`),
        fetch(`/api/crm/quotes?dealId=${dealId}`),
      ]);

      if (!dealRes.ok) {
        router.push('/crm/deals');
        return;
      }

      const dealData = await dealRes.json();
      const stagesData = await stagesRes.json();
      const usersData = await usersRes.json();
      const productsData = await productsRes.json();
      const quotesData = await quotesRes.json();

      setDeal(dealData);
      setActivities(dealData.activities || []);
      setStages(stagesData.sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
      setUsers(Array.isArray(usersData) ? usersData : []);
      setDealProducts(productsData.products || []);
      setProductTotals(productsData.totals || null);
      setQuotes(quotesData.quotes || []);

      // Load contacts for the client
      if (dealData.clientId?._id) {
        const contactsRes = await fetch(`/api/crm/contacts?clientId=${dealData.clientId._id}`);
        const contactsData = await contactsRes.json();
        setContacts(contactsData);
      }

      // Initialize edit form
      setEditForm({
        title: dealData.title || '',
        description: dealData.description || '',
        value: dealData.value || 0,
        currency: dealData.currency || 'MXN',
        probability: dealData.probability ?? dealData.stageId?.probability ?? 0,
        expectedCloseDate: dealData.expectedCloseDate ? dealData.expectedCloseDate.split('T')[0] : '',
        contactId: dealData.contactId?._id || '',
        ownerId: dealData.ownerId?._id || '',
        tags: dealData.tags?.join(', ') || '',
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProducts = async (search: string = '') => {
    try {
      const res = await fetch(`/api/crm/products?activeOnly=true&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setAvailableProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addProductForm.productId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/deals/${dealId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addProductForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al agregar producto');
      }
      setShowAddProductModal(false);
      setAddProductForm({ productId: '', quantity: 1, discount: 0, notes: '' });
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProduct = async (productLineId: string) => {
    if (!confirm('¿Eliminar este producto del deal?')) return;
    try {
      const res = await fetch(`/api/crm/deals/${dealId}/products?lineId=${productLineId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar producto');
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + quoteForm.validDays);

      const res = await fetch('/api/crm/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          validUntil: validUntil.toISOString(),
          terms: quoteForm.terms,
          notes: quoteForm.notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear cotización');
      }
      setShowCreateQuoteModal(false);
      setQuoteForm({ validDays: 30, terms: '', notes: '' });
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadQuotePdf = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/crm/quotes/${quoteId}/pdf`);
      if (!res.ok) throw new Error('Error al generar PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotizacion-${quoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/quotes/${selectedQuote._id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendQuoteForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar cotización');
      }
      setShowSendQuoteModal(false);
      setSendQuoteForm({ email: '', subject: '', message: '' });
      setSelectedQuote(null);
      loadData();
      alert('Cotización enviada exitosamente');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const openSendQuoteModal = (quote: Quote) => {
    setSelectedQuote(quote);
    setSendQuoteForm({
      email: deal?.contactId?.email || '',
      subject: `Cotización ${quote.quoteNumber} - ${deal?.clientId?.name || ''}`,
      message: '',
    });
    setShowSendQuoteModal(true);
  };

  const getQuoteStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string; bg: string }> = {
      draft: { label: 'Borrador', color: '#6b7280', bg: 'bg-gray-100 dark:bg-gray-700' },
      sent: { label: 'Enviada', color: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30' },
      accepted: { label: 'Aceptada', color: '#10b981', bg: 'bg-green-100 dark:bg-green-900/30' },
      rejected: { label: 'Rechazada', color: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30' },
      expired: { label: 'Expirada', color: '#f59e0b', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    };
    return labels[status] || labels.draft;
  };

  const handleUpdateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        contactId: editForm.contactId || undefined,
      };

      const res = await fetch(`/api/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al actualizar deal');
      setShowEditModal(false);
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStage = async (newStageId: string) => {
    setSaving(true);
    try {
      const newStage = stages.find(s => s._id === newStageId);

      // If it's a lost stage, show lost reason modal
      if (newStage?.isClosed && !newStage?.isWon) {
        setShowStageModal(false);
        setShowLostModal(true);
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: newStageId }),
      });
      if (!res.ok) throw new Error('Error al cambiar etapa');
      setShowStageModal(false);
      loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsLost = async () => {
    setSaving(true);
    try {
      const lostStage = stages.find(s => s.isClosed && !s.isWon);
      if (!lostStage) throw new Error('No hay etapa de pérdida configurada');

      const res = await fetch(`/api/crm/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageId: lostStage._id,
          lostReason: lostReason,
        }),
      });
      if (!res.ok) throw new Error('Error al marcar como perdido');
      setShowLostModal(false);
      setLostReason('');
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
        body: JSON.stringify({
          ...newActivity,
          dealId,
          clientId: deal?.clientId?._id,
        }),
      });
      if (!res.ok) throw new Error('Error al crear actividad');
      setShowActivityModal(false);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      note: 'Nota',
      call: 'Llamada',
      email: 'Email',
      meeting: 'Reunión',
      task: 'Tarea',
    };
    return labels[type] || type;
  };

  // Calculate weighted value
  const weightedValue = deal ? deal.value * ((deal.probability ?? deal.stageId?.probability ?? 0) / 100) : 0;

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !deal) return null;

  const isWon = deal.stageId?.isWon;
  const isLost = deal.stageId?.isClosed && !deal.stageId?.isWon;
  const isClosed = deal.stageId?.isClosed;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Back button */}
        <Link
          href="/crm/deals"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver al Pipeline
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setShowStageModal(true)}
                  disabled={isClosed}
                  className="px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-1 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: deal.stageId?.color }}
                >
                  {deal.stageId?.name}
                  {!isClosed && <ChevronDown size={16} />}
                </button>
                {isWon && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                    <Trophy size={16} />
                    Ganado
                  </span>
                )}
                {isLost && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-medium">
                    <XCircle size={16} />
                    Perdido
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{deal.title}</h1>

              {deal.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">{deal.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link
                  href={`/crm/clients/${deal.clientId?._id}`}
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Building2 size={16} />
                  {deal.clientId?.name}
                </Link>

                {deal.contactId && (
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <UserCircle size={16} />
                    {deal.contactId.firstName} {deal.contactId.lastName}
                  </span>
                )}

                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <User size={16} />
                  {deal.ownerId?.name}
                </span>

                {deal.expectedCloseDate && (
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Calendar size={16} />
                    Cierre: {formatDate(deal.expectedCloseDate)}
                  </span>
                )}
              </div>

              {deal.tags && deal.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {deal.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs flex items-center gap-1">
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {isLost && deal.lostReason && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-medium mb-1">
                    <AlertCircle size={16} />
                    Razón de pérdida
                  </div>
                  <p className="text-red-600 dark:text-red-300 text-sm">{deal.lostReason}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(deal.value, deal.currency)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                  <Percent size={14} />
                  {deal.probability ?? deal.stageId?.probability ?? 0}% probabilidad
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                  <Target size={14} />
                  Ponderado: {formatCurrency(weightedValue, deal.currency)}
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content with tabs */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
              <div className="flex border-b dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('activities')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                    activeTab === 'activities'
                      ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Clock size={18} />
                  Actividades ({activities.length})
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                    activeTab === 'products'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Package size={18} />
                  Productos ({dealProducts.length})
                </button>
                <button
                  onClick={() => setActiveTab('quotes')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                    activeTab === 'quotes'
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FileSpreadsheet size={18} />
                  Cotizaciones ({quotes.length})
                </button>
              </div>
            </div>

            {/* Activities Tab */}
            {activeTab === 'activities' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Clock size={20} className="text-purple-500" />
                    Actividades
                  </h2>
                  <button
                    onClick={() => setShowActivityModal(true)}
                    className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-3 py-1.5 rounded-lg"
                  >
                    <Plus size={16} />
                    Nueva
                  </button>
                </div>

                <div className="divide-y dark:divide-gray-700">
                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No hay actividades registradas
                    </div>
                  ) : (
                    activities.map((activity, index) => (
                      <div key={activity._id} className="p-4 relative">
                        {index < activities.length - 1 && (
                          <div className="absolute left-7 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                        )}

                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  {getActivityTypeLabel(activity.type)}
                                </span>
                                <h4 className="font-medium text-gray-800 dark:text-gray-100">{activity.title}</h4>
                              </div>
                              {activity.isCompleted && (
                                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                              )}
                            </div>

                            {activity.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                                {activity.description}
                              </p>
                            )}

                            {activity.outcome && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-300">
                                <strong>Resultado:</strong> {activity.outcome}
                              </div>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span>{formatDateTime(activity.createdAt)}</span>
                              {activity.createdBy && (
                                <span>• {activity.createdBy.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Package size={20} className="text-blue-500" />
                    Productos del Deal
                  </h2>
                  <button
                    onClick={() => { loadAvailableProducts(); setShowAddProductModal(true); }}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg"
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>

                {dealProducts.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShoppingCart size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No hay productos agregados</p>
                    <button
                      onClick={() => { loadAvailableProducts(); setShowAddProductModal(true); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus size={16} />
                      Agregar Producto
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="divide-y dark:divide-gray-700">
                      {dealProducts.map((item) => (
                        <div key={item._id} className="p-4 flex items-center gap-4">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-100">{item.productName}</div>
                            {item.productSku && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.productSku}</div>
                            )}
                            {item.notes && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.notes}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {item.quantity} x {formatCurrency(item.unitPrice, deal?.currency || 'MXN')}
                            </div>
                            {item.discount > 0 && (
                              <div className="text-xs text-green-600 dark:text-green-400">-{item.discount}% desc.</div>
                            )}
                          </div>
                          <div className="text-right w-28">
                            <div className="font-semibold text-gray-800 dark:text-gray-100">
                              {formatCurrency(item.total, deal?.currency || 'MXN')}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">IVA: {item.taxRate}%</div>
                          </div>
                          <button
                            onClick={() => handleRemoveProduct(item._id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    {productTotals && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700">
                        <div className="max-w-xs ml-auto space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                            <span className="text-gray-800 dark:text-gray-200">{formatCurrency(productTotals.subtotal, deal?.currency || 'MXN')}</span>
                          </div>
                          {productTotals.discountAmount > 0 && (
                            <div className="flex justify-between text-green-600 dark:text-green-400">
                              <span>Descuento:</span>
                              <span>-{formatCurrency(productTotals.discountAmount, deal?.currency || 'MXN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">IVA:</span>
                            <span className="text-gray-800 dark:text-gray-200">{formatCurrency(productTotals.taxAmount, deal?.currency || 'MXN')}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t dark:border-gray-600 font-bold text-lg">
                            <span className="text-gray-800 dark:text-gray-100">Total:</span>
                            <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(productTotals.total, deal?.currency || 'MXN')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Quotes Tab */}
            {activeTab === 'quotes' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FileSpreadsheet size={20} className="text-emerald-500" />
                    Cotizaciones
                  </h2>
                  <button
                    onClick={() => setShowCreateQuoteModal(true)}
                    disabled={dealProducts.length === 0}
                    className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title={dealProducts.length === 0 ? 'Agrega productos primero' : ''}
                  >
                    <Plus size={16} />
                    Nueva Cotización
                  </button>
                </div>

                {quotes.length === 0 ? (
                  <div className="p-8 text-center">
                    <Receipt size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No hay cotizaciones</p>
                    {dealProducts.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500">Agrega productos al deal para crear cotizaciones</p>
                    ) : (
                      <button
                        onClick={() => setShowCreateQuoteModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Plus size={16} />
                        Crear Cotización
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {quotes.map((quote) => {
                      const statusInfo = getQuoteStatusLabel(quote.status);
                      return (
                        <div key={quote._id} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-800 dark:text-gray-100">{quote.quoteNumber}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg}`} style={{ color: statusInfo.color }}>
                                {statusInfo.label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">v{quote.version}</span>
                            </div>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(quote.total, quote.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-4">
                              <span>{quote.items?.length || 0} productos</span>
                              <span>Válida hasta: {formatDate(quote.validUntil)}</span>
                              {quote.sentAt && (
                                <span className="text-blue-600 dark:text-blue-400">Enviada: {formatDateTime(quote.sentAt)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDownloadQuotePdf(quote._id)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                title="Descargar PDF"
                              >
                                <Download size={16} />
                              </button>
                              {quote.status === 'draft' && (
                                <button
                                  onClick={() => openSendQuoteModal(quote)}
                                  className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                                  title="Enviar por email"
                                >
                                  <Send size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Acciones Rápidas</h3>
              <div className="space-y-2">
                <button
                  onClick={() => { setNewActivity({ type: 'call', title: '', description: '' }); setShowActivityModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <PhoneCall size={16} className="text-green-500" />
                  Registrar Llamada
                </button>
                <button
                  onClick={() => { setNewActivity({ type: 'email', title: '', description: '' }); setShowActivityModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Mail size={16} className="text-blue-500" />
                  Registrar Email
                </button>
                <button
                  onClick={() => { setNewActivity({ type: 'meeting', title: '', description: '' }); setShowActivityModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Video size={16} className="text-purple-500" />
                  Registrar Reunión
                </button>
                <button
                  onClick={() => { setNewActivity({ type: 'note', title: '', description: '' }); setShowActivityModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FileText size={16} className="text-gray-500" />
                  Agregar Nota
                </button>
              </div>
            </div>

            {/* Contact Info */}
            {deal.contactId && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <UserCircle size={18} className="text-blue-500" />
                  Contacto
                </h3>
                <div className="space-y-2">
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    {deal.contactId.firstName} {deal.contactId.lastName}
                  </p>
                  {deal.contactId.position && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{deal.contactId.position}</p>
                  )}
                  {deal.contactId.email && (
                    <a
                      href={`mailto:${deal.contactId.email}`}
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Mail size={14} />
                      {deal.contactId.email}
                    </a>
                  )}
                  {deal.contactId.phone && (
                    <a
                      href={`tel:${deal.contactId.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600"
                    >
                      <Phone size={14} />
                      {deal.contactId.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Detalles</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Creado</span>
                  <span className="text-gray-800 dark:text-gray-200">{formatDate(deal.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Actualizado</span>
                  <span className="text-gray-800 dark:text-gray-200">{formatDate(deal.updatedAt)}</span>
                </div>
                {deal.actualCloseDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Cerrado</span>
                    <span className="text-gray-800 dark:text-gray-200">{formatDate(deal.actualCloseDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Creado por</span>
                  <span className="text-gray-800 dark:text-gray-200">{deal.createdBy?.name}</span>
                </div>
              </div>
            </div>

            {/* Pipeline Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Pipeline</h3>
              <div className="space-y-2">
                {stages.filter(s => !s.isClosed).map((stage) => (
                  <div
                    key={stage._id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      stage._id === deal.stageId._id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className={stage._id === deal.stageId._id ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}>
                      {stage.name}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">{stage.probability}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Editar Deal</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateDeal} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                  <select
                    value={editForm.currency}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Probabilidad %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.probability}
                    onChange={(e) => setEditForm({ ...editForm, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contacto</label>
                  <select
                    value={editForm.contactId}
                    onChange={(e) => setEditForm({ ...editForm, contactId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sin contacto</option>
                    {contacts.map(c => (
                      <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsable</label>
                  <select
                    value={editForm.ownerId}
                    onChange={(e) => setEditForm({ ...editForm, ownerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha esperada de cierre</label>
                <input
                  type="date"
                  value={editForm.expectedCloseDate}
                  onChange={(e) => setEditForm({ ...editForm, expectedCloseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (separados por coma)</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ej: urgente, expansión, renovación"
                />
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

      {/* Change Stage Modal */}
      {showStageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Cambiar Etapa</h2>
              <button onClick={() => setShowStageModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {stages.map((stage) => (
                <button
                  key={stage._id}
                  onClick={() => handleChangeStage(stage._id)}
                  disabled={stage._id === deal.stageId._id || saving}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                    stage._id === deal.stageId._id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  } disabled:opacity-50`}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100">{stage.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {stage.probability}% probabilidad
                      {stage.isClosed && (stage.isWon ? ' • Ganado' : ' • Perdido')}
                    </div>
                  </div>
                  {stage._id === deal.stageId._id && (
                    <CheckCircle size={20} className="text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lost Reason Modal */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <XCircle className="text-red-500" />
                Marcar como Perdido
              </h2>
              <button onClick={() => setShowLostModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Razón de pérdida
                </label>
                <textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="¿Por qué se perdió este deal?"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLostModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMarkAsLost}
                  disabled={saving}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Marcar como Perdido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Nueva Actividad</h2>
              <button onClick={() => setShowActivityModal(false)} className="text-gray-400 hover:text-gray-600">
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
                  placeholder={
                    newActivity.type === 'call' ? 'Ej: Llamada de seguimiento' :
                    newActivity.type === 'email' ? 'Ej: Envío de propuesta' :
                    newActivity.type === 'meeting' ? 'Ej: Demo del producto' :
                    'Título de la actividad'
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Detalles de la actividad..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setShowActivityModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
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

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Package className="text-blue-500" />
                Agregar Producto
              </h2>
              <button onClick={() => setShowAddProductModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    loadAvailableProducts(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {availableProducts.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <Package size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No hay productos disponibles</p>
                  <Link href="/crm/products" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                    Ir al catálogo de productos
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableProducts.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => setAddProductForm({ ...addProductForm, productId: product._id })}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        addProductForm.productId === product._id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-100">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(product.price, product.currency)}
                          </div>
                          {product.category && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{product.category}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {addProductForm.productId && (
              <form onSubmit={handleAddProduct} className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={addProductForm.quantity}
                      onChange={(e) => setAddProductForm({ ...addProductForm, quantity: parseFloat(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descuento %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={addProductForm.discount}
                      onChange={(e) => setAddProductForm({ ...addProductForm, discount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                  <input
                    type="text"
                    value={addProductForm.notes}
                    onChange={(e) => setAddProductForm({ ...addProductForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Notas opcionales..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
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
                    Agregar al Deal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create Quote Modal */}
      {showCreateQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-500" />
                Crear Cotización
              </h2>
              <button onClick={() => setShowCreateQuoteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                Se creará una cotización con {dealProducts.length} producto(s) por un total de{' '}
                <strong>{productTotals ? formatCurrency(productTotals.total, deal?.currency || 'MXN') : '$0'}</strong>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Válida por (días)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={quoteForm.validDays}
                  onChange={(e) => setQuoteForm({ ...quoteForm, validDays: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas para el cliente
                </label>
                <textarea
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Notas visibles en la cotización..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Términos y condiciones
                </label>
                <textarea
                  value={quoteForm.terms}
                  onChange={(e) => setQuoteForm({ ...quoteForm, terms: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Términos y condiciones de la cotización..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCreateQuoteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Crear Cotización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Quote Modal */}
      {showSendQuoteModal && selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Send className="text-emerald-500" />
                Enviar Cotización
              </h2>
              <button onClick={() => { setShowSendQuoteModal(false); setSelectedQuote(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSendQuote} className="p-4 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800 dark:text-gray-100">{selectedQuote.quoteNumber}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedQuote.total, selectedQuote.currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email del destinatario *
                </label>
                <input
                  type="email"
                  required
                  value={sendQuoteForm.email}
                  onChange={(e) => setSendQuoteForm({ ...sendQuoteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="cliente@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={sendQuoteForm.subject}
                  onChange={(e) => setSendQuoteForm({ ...sendQuoteForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mensaje personalizado
                </label>
                <textarea
                  value={sendQuoteForm.message}
                  onChange={(e) => setSendQuoteForm({ ...sendQuoteForm, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Mensaje opcional para el cliente..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setShowSendQuoteModal(false); setSelectedQuote(null); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  <Send size={16} />
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

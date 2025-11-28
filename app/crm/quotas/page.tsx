'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Target,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  Users,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  Award
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Quota {
  _id: string;
  userId: User;
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number;
  quarter?: number;
  targetValue: number;
  targetDeals?: number;
  currency: string;
  notes?: string;
  isActive: boolean;
  periodLabel?: string;
}

interface QuotaProgress {
  quota: Quota;
  actualValue: number;
  actualDeals: number;
  progressValue: number;
  progressDeals: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'exceeded';
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  expectedProgressPercent: number;
}

interface Summary {
  totalQuotas: number;
  exceeded: number;
  onTrack: number;
  atRisk: number;
  behind: number;
  totalTargetValue: number;
  totalActualValue: number;
  overallProgress: number;
}

const PERIODS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
];

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const QUARTERS = [
  { value: 1, label: 'Q1 (Ene-Mar)' },
  { value: 2, label: 'Q2 (Abr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' },
  { value: 4, label: 'Q4 (Oct-Dic)' },
];

const STATUS_CONFIG = {
  exceeded: { label: 'Superado', color: 'text-green-600 bg-green-100 dark:bg-green-900/30', icon: Award },
  on_track: { label: 'En Camino', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icon: CheckCircle },
  at_risk: { label: 'En Riesgo', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30', icon: AlertTriangle },
  behind: { label: 'Atrasado', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: TrendingDown },
};

export default function QuotasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<QuotaProgress[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingQuota, setEditingQuota] = useState<Quota | null>(null);

  // Filtros
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterPeriod, setFilterPeriod] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');

  // Formulario
  const [formData, setFormData] = useState({
    userId: '',
    period: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    targetValue: 0,
    targetDeals: 0,
    currency: 'MXN',
    notes: '',
  });

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadData();
      if (isAdmin) loadUsers();
    }
  }, [status, router, filterYear, filterPeriod, filterUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('year', filterYear.toString());
      if (filterPeriod) params.append('period', filterPeriod);
      if (filterUser) params.append('userId', filterUser);

      const res = await fetch(`/api/crm/quotas/progress?${params}`);
      const data = await res.json();

      if (res.ok) {
        setProgressData(data.progress || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Error loading quotas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users?activeOnly=true');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingQuota
        ? `/api/crm/quotas/${editingQuota._id}`
        : '/api/crm/quotas';

      const res = await fetch(url, {
        method: editingQuota ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingQuota(null);
        resetForm();
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving quota:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta meta?')) return;

    try {
      const res = await fetch(`/api/crm/quotas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting quota:', error);
    }
  };

  const handleEdit = (quota: Quota) => {
    setEditingQuota(quota);
    setFormData({
      userId: quota.userId._id,
      period: quota.period,
      year: quota.year,
      month: quota.month || 1,
      quarter: quota.quarter || 1,
      targetValue: quota.targetValue,
      targetDeals: quota.targetDeals || 0,
      currency: quota.currency,
      notes: quota.notes || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      period: 'monthly',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      targetValue: 0,
      targetDeals: 0,
      currency: 'MXN',
      notes: '',
    });
  };

  const formatCurrency = (value: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Target className="text-blue-500" />
              Metas de Venta
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Seguimiento de cuotas y objetivos comerciales
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                setEditingQuota(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Nueva Meta
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Año
              </label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
              >
                {[2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Período
              </label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
              >
                <option value="">Todos</option>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendedor
                </label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
                >
                  <option value="">Todos</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Meta Total</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(summary.totalTargetValue)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Logrado</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(summary.totalActualValue)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Progreso</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {summary.overallProgress}%
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-green-600 dark:text-green-400">Superados</p>
              <p className="text-xl font-bold text-green-600">{summary.exceeded}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">En Riesgo</p>
              <p className="text-xl font-bold text-yellow-600">{summary.atRisk}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-red-600 dark:text-red-400">Atrasados</p>
              <p className="text-xl font-bold text-red-600">{summary.behind}</p>
            </div>
          </div>
        )}

        {/* Alertas */}
        {progressData.filter(p => p.status === 'behind' || p.status === 'at_risk').length > 0 && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <h3 className="font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2 mb-2">
              <AlertTriangle size={20} />
              Metas que requieren atención
            </h3>
            <div className="space-y-2">
              {progressData
                .filter(p => p.status === 'behind' || p.status === 'at_risk')
                .slice(0, 3)
                .map((p) => (
                  <div
                    key={p.quota._id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-orange-700 dark:text-orange-300">
                      {p.quota.userId.name} - {p.quota.periodLabel}
                    </span>
                    <span className={p.status === 'behind' ? 'text-red-600' : 'text-yellow-600'}>
                      {p.progressValue}% ({p.daysRemaining} días restantes)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Lista de Metas */}
        {progressData.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
            <Target className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400">
              No hay metas configuradas para este período
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear primera meta
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {progressData.map((item) => {
              const StatusIcon = STATUS_CONFIG[item.status].icon;
              return (
                <div
                  key={item.quota._id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${STATUS_CONFIG[item.status].color}`}>
                        <StatusIcon size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          {item.quota.userId.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.quota.periodLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[item.status].color}`}>
                        {STATUS_CONFIG[item.status].label}
                      </span>
                      {isAdmin && (
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEdit(item.quota)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.quota._id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        Progreso: {item.progressValue}%
                      </span>
                      <span className="text-gray-500 dark:text-gray-500">
                        Esperado: {item.expectedProgressPercent}%
                      </span>
                    </div>
                    <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      {/* Expected progress marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500 z-10"
                        style={{ left: `${Math.min(item.expectedProgressPercent, 100)}%` }}
                      />
                      {/* Actual progress */}
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === 'exceeded'
                            ? 'bg-green-500'
                            : item.status === 'on_track'
                              ? 'bg-blue-500'
                              : item.status === 'at_risk'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(item.progressValue, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Meta</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        {formatCurrency(item.quota.targetValue, item.quota.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Logrado</p>
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(item.actualValue, item.quota.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Deals</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        {item.actualDeals}
                        {item.quota.targetDeals ? ` / ${item.quota.targetDeals}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Días restantes</p>
                      <p className={`font-semibold ${item.daysRemaining <= 7 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>
                        {item.daysRemaining}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {editingQuota ? 'Editar Meta' : 'Nueva Meta de Venta'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingQuota(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {!editingQuota && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vendedor *
                    </label>
                    <select
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      required
                      className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    >
                      <option value="">Seleccionar vendedor</option>
                      {users.map((u) => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!editingQuota && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Período *
                      </label>
                      <select
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      >
                        {PERIODS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Año *
                      </label>
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      >
                        {[2024, 2025, 2026].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {!editingQuota && formData.period === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mes *
                    </label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                      className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    >
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!editingQuota && formData.period === 'quarterly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Trimestre *
                    </label>
                    <select
                      value={formData.quarter}
                      onChange={(e) => setFormData({ ...formData, quarter: parseInt(e.target.value) })}
                      className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    >
                      {QUARTERS.map((q) => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Meta en Valor *
                    </label>
                    <input
                      type="number"
                      value={formData.targetValue}
                      onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                      required
                      min={0}
                      className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Moneda
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Meta en Deals (opcional)
                  </label>
                  <input
                    type="number"
                    value={formData.targetDeals}
                    onChange={(e) => setFormData({ ...formData, targetDeals: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingQuota(null);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingQuota ? 'Guardar Cambios' : 'Crear Meta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

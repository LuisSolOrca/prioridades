'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface KPI {
  _id: string;
  name: string;
  description?: string;
  strategicObjective: string;
  initiativeId: {
    _id: string;
    name: string;
    color: string;
  };
  unit: string;
  periodicity: string;
  responsible: {
    _id: string;
    name: string;
    email: string;
  };
  target: number;
  kpiType: string;
  status: string;
  currentVersion: number;
  isActive: boolean;
  createdAt: string;
}

const STATUS_COLORS: { [key: string]: string } = {
  BORRADOR: 'bg-gray-200 text-gray-800',
  EN_REVISION: 'bg-yellow-200 text-yellow-800',
  APROBADO: 'bg-green-200 text-green-800',
  ACTIVO: 'bg-blue-200 text-blue-800',
  INACTIVO: 'bg-gray-400 text-gray-800',
  ARCHIVADO: 'bg-red-200 text-red-800',
};

const STATUS_LABELS: { [key: string]: string } = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En Revisión',
  APROBADO: 'Aprobado',
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  ARCHIVADO: 'Archivado',
};

const PERIODICITY_LABELS: { [key: string]: string } = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  MENSUAL: 'Mensual',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual',
};

export default function AdminKPIsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterInitiative, setFilterInitiative] = useState<string>('');
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Estados para diálogos de cambio de estado
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState<string>('');
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [selectedApprover, setSelectedApprover] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      if (!hasPermission('canManageKPIs')) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [status, session, router, hasPermission]);

  const loadData = async () => {
    try {
      const [kpisRes, initiativesRes, usersRes] = await Promise.all([
        fetch('/api/kpis?activeOnly=false'),
        fetch('/api/initiatives?activeOnly=true'),
        fetch('/api/users'),
      ]);

      const kpisData = await kpisRes.json();
      const initiativesData = await initiativesRes.json();
      const usersData = await usersRes.json();

      setKpis(kpisData);
      setInitiatives(initiativesData);
      setUsers(usersData.filter((u: User) => u._id)); // Solo usuarios activos
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewKPI = () => {
    router.push('/admin/kpis/new');
  };

  const handleEditKPI = (id: string) => {
    router.push(`/admin/kpis/${id}`);
  };

  const handleReview = (id: string) => {
    setSelectedKpiId(id);
    setSelectedReviewer((session?.user as any)?.id || '');
    setShowReviewDialog(true);
  };

  const confirmReview = async () => {
    if (!selectedReviewer) {
      alert('Selecciona un revisor');
      return;
    }

    try {
      const res = await fetch(`/api/kpis/${selectedKpiId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: selectedReviewer }),
      });

      if (res.ok) {
        setShowReviewDialog(false);
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al revisar KPI');
      }
    } catch (error) {
      console.error('Error reviewing KPI:', error);
      alert('Error al revisar KPI');
    }
  };

  const handleApprove = (id: string) => {
    setSelectedKpiId(id);
    setSelectedApprover((session?.user as any)?.id || '');
    setShowApproveDialog(true);
  };

  const confirmApprove = async () => {
    if (!selectedApprover) {
      alert('Selecciona un aprobador');
      return;
    }

    try {
      const res = await fetch(`/api/kpis/${selectedKpiId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: selectedApprover }),
      });

      if (res.ok) {
        setShowApproveDialog(false);
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al aprobar KPI');
      }
    } catch (error) {
      console.error('Error approving KPI:', error);
      alert('Error al aprobar KPI');
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm('¿Activar este KPI?')) return;

    try {
      const res = await fetch(`/api/kpis/${id}/activate`, {
        method: 'POST',
      });

      if (res.ok) {
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al activar KPI');
      }
    } catch (error) {
      console.error('Error activating KPI:', error);
      alert('Error al activar KPI');
    }
  };

  const handleDelete = async (id: string, hardDelete = false) => {
    const message = hardDelete
      ? '¿ELIMINAR PERMANENTEMENTE este KPI? Esta acción NO se puede deshacer y se perderán todos los datos asociados.'
      : '¿Archivar este KPI? Puedes reactivarlo más tarde.';

    if (!confirm(message)) return;

    try {
      const url = hardDelete ? `/api/kpis/${id}?hard=true` : `/api/kpis/${id}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al eliminar KPI');
      }
    } catch (error) {
      console.error('Error deleting KPI:', error);
      alert('Error al eliminar KPI');
    }
  };

  const filteredKpis = kpis.filter((kpi) => {
    if (filterStatus && kpi.status !== filterStatus) return false;
    if (filterInitiative && kpi.initiativeId._id !== filterInitiative) return false;
    return true;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestión de KPIs</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Administra los indicadores clave de rendimiento
            </p>
          </div>
          <button
            onClick={handleNewKPI}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            + Nuevo KPI
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todos los estados</option>
                {Object.keys(STATUS_LABELS).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por iniciativa
              </label>
              <select
                value={filterInitiative}
                onChange={(e) => setFilterInitiative(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Todas las iniciativas</option>
                {initiatives.map((initiative) => (
                  <option key={initiative._id} value={initiative._id}>
                    {initiative.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de KPIs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  KPI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Iniciativa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Periodicidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Meta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Versión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredKpis.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No hay KPIs registrados
                  </td>
                </tr>
              ) : (
                filteredKpis.map((kpi) => (
                  <tr key={kpi._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {kpi.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {kpi.strategicObjective}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${kpi.initiativeId.color}20`,
                          color: kpi.initiativeId.color,
                        }}
                      >
                        {kpi.initiativeId.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {kpi.responsible.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {PERIODICITY_LABELS[kpi.periodicity]}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {kpi.target} {kpi.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[kpi.status]
                        }`}
                      >
                        {STATUS_LABELS[kpi.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      v{kpi.currentVersion}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditKPI(kpi._id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Editar
                      </button>

                      {kpi.status === 'BORRADOR' && (
                        <button
                          onClick={() => handleReview(kpi._id)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                        >
                          Revisar
                        </button>
                      )}

                      {kpi.status === 'EN_REVISION' && (
                        <button
                          onClick={() => handleApprove(kpi._id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Aprobar
                        </button>
                      )}

                      {kpi.status === 'APROBADO' && (
                        <button
                          onClick={() => handleActivate(kpi._id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Activar
                        </button>
                      )}

                      {kpi.status !== 'ARCHIVADO' && (
                        <button
                          onClick={() => handleDelete(kpi._id, false)}
                          className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                        >
                          Archivar
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(kpi._id, true)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Eliminar permanentemente (para pruebas)"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal para seleccionar revisor */}
        {showReviewDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Marcar como "En Revisión"
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Selecciona quién será el revisor de este KPI:
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Revisor *
                </label>
                <select
                  value={selectedReviewer}
                  onChange={(e) => setSelectedReviewer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Seleccionar revisor...</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReviewDialog(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReview}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                  disabled={!selectedReviewer}
                >
                  Confirmar Revisión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para seleccionar aprobador */}
        {showApproveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Aprobar KPI
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Selecciona quién aprobará este KPI:
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Aprobador *
                </label>
                <select
                  value={selectedApprover}
                  onChange={(e) => setSelectedApprover(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Seleccionar aprobador...</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApproveDialog(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  disabled={!selectedApprover}
                >
                  Confirmar Aprobación
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Mail,
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  Edit,
  Users,
  Clock,
  ChevronRight,
  BarChart3,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  MousePointerClick,
  MessageSquare,
  RefreshCw,
  Filter,
} from 'lucide-react';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

interface Sequence {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  steps: any[];
  totalEnrolled: number;
  activeEnrolled: number;
  completedCount: number;
  openRate: number;
  replyRate: number;
  createdBy: { name: string };
  createdAt: string;
}

export default function SequencesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchSequences();
  }, [filterActive, search]);

  const fetchSequences = async () => {
    try {
      const params = new URLSearchParams();
      if (filterActive) params.append('isActive', filterActive);
      if (search) params.append('search', search);

      const res = await fetch(`/api/crm/sequences?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSequences(data);
      }
    } catch (error) {
      console.error('Error fetching sequences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSequence = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/crm/sequences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        fetchSequences();
      }
    } catch (error) {
      console.error('Error toggling sequence:', error);
    }
  };

  const deleteSequence = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta secuencia? Esta acción no se puede deshacer.')) return;

    try {
      const res = await fetch(`/api/crm/sequences/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSequences();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error deleting sequence:', error);
    }
  };

  const stats = {
    total: sequences.length,
    active: sequences.filter(s => s.isActive).length,
    totalEnrolled: sequences.reduce((sum, s) => sum + s.totalEnrolled, 0),
    activeEnrolled: sequences.reduce((sum, s) => sum + s.activeEnrolled, 0),
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-7 h-7 text-indigo-600" />
                Secuencias de Email
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Automatiza el seguimiento con secuencias de emails personalizados
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => router.push('/crm/sequences/new')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Nueva Secuencia
              </button>
            )}
          </div>

          {/* Help Card */}
          <CrmHelpCard
            id="crm-sequences-guide"
            title="Secuencias de email automatizadas"
            variant="feature"
            className="mb-6"
            defaultCollapsed={true}
            steps={[
              {
                title: 'Crea una secuencia',
                description: 'Define los pasos de tu secuencia de seguimiento',
              },
              {
                title: 'Agrega contactos',
                description: 'Inscribe contactos para que reciban la secuencia automáticamente',
              },
              {
                title: 'Monitorea resultados',
                description: 'Revisa tasas de apertura, clics y respuestas',
              },
            ]}
          />

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Secuencias</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Activas</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Contactos Enrollados</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalEnrolled}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Send className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">En Proceso</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.activeEnrolled}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar secuencias..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
            <button
              onClick={fetchSequences}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              title="Refrescar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Sequences List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : sequences.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay secuencias
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Crea tu primera secuencia de email para automatizar el seguimiento
              </p>
              {isAdmin && (
                <button
                  onClick={() => router.push('/crm/sequences/new')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Crear Secuencia
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sequences.map((sequence) => (
                <div
                  key={sequence._id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${sequence.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <Mail className={`w-5 h-5 ${sequence.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{sequence.name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              sequence.isActive
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {sequence.isActive ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {sequence.description || `${sequence.steps.length} pasos`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSequence(sequence._id, sequence.isActive);
                              }}
                              className={`p-2 rounded-lg ${
                                sequence.isActive
                                  ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                  : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                              }`}
                              title={sequence.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {sequence.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/crm/sequences/${sequence._id}`);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSequence(sequence._id);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-4 grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-sm mb-1">
                        <Clock className="w-3 h-3" />
                        <span>Pasos</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {sequence.steps.length}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-sm mb-1">
                        <Users className="w-3 h-3" />
                        <span>Activos</span>
                      </div>
                      <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {sequence.activeEnrolled}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-sm mb-1">
                        <Eye className="w-3 h-3" />
                        <span>Aperturas</span>
                      </div>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {sequence.openRate || 0}%
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-sm mb-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>Respuestas</span>
                      </div>
                      <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                        {sequence.replyRate || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => router.push(`/crm/sequences/${sequence._id}`)}
                  >
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {sequence.completedCount} completados
                      </span>
                      <span>
                        {sequence.totalEnrolled} total enrollados
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

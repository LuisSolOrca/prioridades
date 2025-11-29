'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Globe,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

interface Competitor {
  _id: string;
  name: string;
  website?: string;
  description?: string;
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
  marketPosition: 'leader' | 'challenger' | 'niche' | 'unknown';
  logo?: string;
  isActive: boolean;
  stats?: {
    totalDeals: number;
    wonAgainst: number;
    lostTo: number;
    winRate: number | null;
  };
}

const MARKET_POSITIONS = {
  leader: { label: 'Lider', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  challenger: { label: 'Retador', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  niche: { label: 'Nicho', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  unknown: { label: 'Desconocido', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
};

export default function CompetitorsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
    strengths: '',
    weaknesses: '',
    pricing: '',
    marketPosition: 'unknown' as 'leader' | 'challenger' | 'niche' | 'unknown',
    logo: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadCompetitors();
    }
  }, [session]);

  const loadCompetitors = async () => {
    try {
      const res = await fetch('/api/crm/competitors?includeStats=true');
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data);
      }
    } catch (error) {
      console.error('Error loading competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const body = {
        ...formData,
        strengths: formData.strengths.split('\n').filter(s => s.trim()),
        weaknesses: formData.weaknesses.split('\n').filter(s => s.trim()),
      };

      const url = editingCompetitor
        ? `/api/crm/competitors/${editingCompetitor._id}`
        : '/api/crm/competitors';

      const res = await fetch(url, {
        method: editingCompetitor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      await loadCompetitors();
      handleCloseModal();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este competidor?')) return;

    try {
      const res = await fetch(`/api/crm/competitors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadCompetitors();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting competitor:', error);
    }
  };

  const handleEdit = (competitor: Competitor) => {
    setEditingCompetitor(competitor);
    setFormData({
      name: competitor.name,
      website: competitor.website || '',
      description: competitor.description || '',
      strengths: competitor.strengths.join('\n'),
      weaknesses: competitor.weaknesses.join('\n'),
      pricing: competitor.pricing || '',
      marketPosition: competitor.marketPosition,
      logo: competitor.logo || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCompetitor(null);
    setFormData({
      name: '',
      website: '',
      description: '',
      strengths: '',
      weaknesses: '',
      pricing: '',
      marketPosition: 'unknown',
      logo: '',
    });
  };

  const filteredCompetitors = competitors.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="pt-16 main-content">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Competidores
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Inteligencia competitiva para tus deals
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Nuevo Competidor</span>
            </button>
          </div>

          {/* Help Card */}
          <CrmHelpCard
            id="crm-competitors-guide"
            title="Inteligencia competitiva para cerrar más deals"
            variant="tip"
            className="mb-6"
            defaultCollapsed={true}
            tips={[
              'Registra las fortalezas y debilidades de cada competidor',
              'Asocia competidores a tus deals para analizar patrones de pérdida/ganancia',
              'El Win Rate te muestra qué tan exitoso eres contra cada competidor',
              'Usa esta información para ajustar tu estrategia de ventas',
            ]}
          />

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar competidor..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Competitors Grid */}
          {filteredCompetitors.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                No hay competidores
              </h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Comienza agregando tus competidores principales
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompetitors.map((competitor) => (
                <div
                  key={competitor._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {competitor.logo ? (
                          <img
                            src={competitor.logo}
                            alt={competitor.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Target className="text-gray-500" size={20} />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {competitor.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${MARKET_POSITIONS[competitor.marketPosition].color}`}>
                            {MARKET_POSITIONS[competitor.marketPosition].label}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(competitor)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(competitor._id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  {competitor.stats && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {competitor.stats.totalDeals}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Deals</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center justify-center">
                          <TrendingUp size={14} className="mr-1" />
                          {competitor.stats.wonAgainst}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Ganados</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center justify-center">
                          <TrendingDown size={14} className="mr-1" />
                          {competitor.stats.lostTo}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Perdidos</div>
                      </div>
                    </div>
                  )}

                  {/* Win Rate */}
                  {competitor.stats?.winRate !== null && (
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
                        <span className={`text-sm font-semibold ${
                          (competitor.stats?.winRate || 0) >= 50
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {competitor.stats?.winRate}%
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (competitor.stats?.winRate || 0) >= 50 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${competitor.stats?.winRate || 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expandable Details */}
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setExpandedId(expandedId === competitor._id ? null : competitor._id)}
                      className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      <span>Ver detalles</span>
                      {expandedId === competitor._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {expandedId === competitor._id && (
                      <div className="mt-3 space-y-3">
                        {competitor.website && (
                          <a
                            href={competitor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Globe size={14} />
                            <span>{competitor.website}</span>
                          </a>
                        )}

                        {competitor.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {competitor.description}
                          </p>
                        )}

                        {competitor.strengths.length > 0 && (
                          <div>
                            <div className="flex items-center space-x-1 text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                              <Shield size={14} />
                              <span>Fortalezas</span>
                            </div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                              {competitor.strengths.map((s, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-2">+</span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {competitor.weaknesses.length > 0 && (
                          <div>
                            <div className="flex items-center space-x-1 text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                              <AlertTriangle size={14} />
                              <span>Debilidades</span>
                            </div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                              {competitor.weaknesses.map((w, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="mr-2">-</span>
                                  {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {competitor.pricing && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Precios
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {competitor.pricing}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingCompetitor ? 'Editar Competidor' : 'Nuevo Competidor'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Posicion de Mercado
                  </label>
                  <select
                    value={formData.marketPosition}
                    onChange={(e) => setFormData({ ...formData, marketPosition: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="unknown">Desconocido</option>
                    <option value="leader">Lider</option>
                    <option value="challenger">Retador</option>
                    <option value="niche">Nicho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL del Logo
                  </label>
                  <input
                    type="url"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="https://"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripcion
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fortalezas (una por linea)
                  </label>
                  <textarea
                    value={formData.strengths}
                    onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={4}
                    placeholder="Buen precio&#10;Soporte 24/7&#10;Marca conocida"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Debilidades (una por linea)
                  </label>
                  <textarea
                    value={formData.weaknesses}
                    onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={4}
                    placeholder="Implementacion lenta&#10;Sin integraciones&#10;Soporte limitado"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Informacion de Precios
                </label>
                <textarea
                  value={formData.pricing}
                  onChange={(e) => setFormData({ ...formData, pricing: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={2}
                  placeholder="Descripcion de su modelo de precios..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingCompetitor ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

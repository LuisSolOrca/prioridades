'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Copy,
  Merge,
  Users,
  Building2,
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Check,
  X,
  ArrowRight,
  Eye,
  Phone,
  Mail,
  Globe,
  Briefcase,
  Calendar,
} from 'lucide-react';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

interface DuplicatePair {
  record1: any;
  record2: any;
  similarity: number;
  matchedOn: string[];
}

interface DuplicatesData {
  clients: DuplicatePair[];
  contacts: DuplicatePair[];
}

export default function DuplicatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [duplicates, setDuplicates] = useState<DuplicatesData>({ clients: [], contacts: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clients' | 'contacts'>('clients');
  const [selectedPair, setSelectedPair] = useState<{ type: string; pair: DuplicatePair } | null>(null);
  const [merging, setMerging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/crm/duplicates?type=all&limit=100');
      if (res.ok) {
        const data = await res.json();
        setDuplicates(data);
      }
    } catch (error) {
      console.error('Error fetching duplicates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMerge = async (keepId: string, mergeId: string, mergeFields: string[]) => {
    if (!isAdmin) {
      alert('Solo administradores pueden fusionar registros');
      return;
    }

    setMerging(true);
    try {
      const res = await fetch('/api/crm/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab === 'clients' ? 'client' : 'contact',
          keepId,
          mergeId,
          mergeFields,
        }),
      });

      if (res.ok) {
        setSelectedPair(null);
        fetchDuplicates();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al fusionar');
      }
    } catch (error) {
      console.error('Error merging:', error);
      alert('Error al fusionar registros');
    } finally {
      setMerging(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-red-600 bg-red-100';
    if (similarity >= 0.8) return 'text-orange-600 bg-orange-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const formatMatchedOn = (matchedOn: string[]) => {
    const labels: Record<string, string> = {
      name: 'Nombre',
      email: 'Email',
      phone: 'Teléfono',
    };
    return matchedOn.map(m => labels[m] || m).join(', ');
  };

  const currentDuplicates = activeTab === 'clients' ? duplicates.clients : duplicates.contacts;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Copy className="w-7 h-7 text-orange-500" />
                Detección de Duplicados
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Identifica y fusiona registros duplicados para mantener datos limpios
              </p>
            </div>
            <button
              onClick={fetchDuplicates}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          {/* Help Card */}
          <CrmHelpCard
            id="crm-duplicates-guide"
            title="Mantén tu base de datos limpia"
            variant="tip"
            className="mb-6"
            defaultCollapsed={true}
            tips={[
              'El sistema detecta automáticamente registros con nombres o emails similares',
              'Revisa cuidadosamente antes de fusionar: compara todos los campos',
              'Al fusionar, selecciona el registro principal que conservará la información',
              'Los deals y actividades del registro eliminado se transfieren automáticamente',
            ]}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Clientes Duplicados</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {duplicates.clients.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Contactos Duplicados</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {duplicates.contacts.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                activeTab === 'clients'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Clientes ({duplicates.clients.length})
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                activeTab === 'contacts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Contactos ({duplicates.contacts.length})
            </button>
          </div>

          {/* Duplicates List */}
          {currentDuplicates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Sin duplicados detectados
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron {activeTab === 'clients' ? 'clientes' : 'contactos'} duplicados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentDuplicates.map((pair, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(pair.similarity)}`}>
                        {Math.round(pair.similarity * 100)}% similar
                      </span>
                      <span className="text-sm text-gray-500">
                        Coincide en: {formatMatchedOn(pair.matchedOn)}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setSelectedPair({ type: activeTab, pair })}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Merge className="w-4 h-4" />
                        Fusionar
                      </button>
                    )}
                  </div>

                  {/* Records Comparison */}
                  <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                    {/* Record 1 */}
                    <div className="p-4">
                      {activeTab === 'clients' ? (
                        <ClientCard client={pair.record1} />
                      ) : (
                        <ContactCard contact={pair.record1} />
                      )}
                    </div>

                    {/* Record 2 */}
                    <div className="p-4">
                      {activeTab === 'clients' ? (
                        <ClientCard client={pair.record2} />
                      ) : (
                        <ContactCard contact={pair.record2} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Merge Modal */}
      {selectedPair && (
        <MergeModal
          type={selectedPair.type}
          pair={selectedPair.pair}
          onMerge={handleMerge}
          onClose={() => setSelectedPair(null)}
          merging={merging}
        />
      )}
    </div>
  );
}

// Client Card Component
function ClientCard({ client }: { client: any }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
        {client.name}
      </h3>
      <div className="space-y-2 text-sm">
        {client.industry && (
          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Briefcase className="w-4 h-4" />
            {client.industry}
          </p>
        )}
        {client.phone && (
          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Phone className="w-4 h-4" />
            {client.phone}
          </p>
        )}
        {client.website && (
          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Globe className="w-4 h-4" />
            {client.website}
          </p>
        )}
        {client.createdAt && (
          <p className="flex items-center gap-2 text-gray-400 text-xs">
            <Calendar className="w-3 h-3" />
            Creado: {new Date(client.createdAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

// Contact Card Component
function ContactCard({ contact }: { contact: any }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
        {contact.firstName} {contact.lastName}
      </h3>
      <div className="space-y-2 text-sm">
        {contact.clientId?.name && (
          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Building2 className="w-4 h-4" />
            {contact.clientId.name}
          </p>
        )}
        {contact.position && (
          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Briefcase className="w-4 h-4" />
            {contact.position}
          </p>
        )}
        {contact.email && (
          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Mail className="w-4 h-4" />
            {contact.email}
          </p>
        )}
        {contact.phone && (
          <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Phone className="w-4 h-4" />
            {contact.phone}
          </p>
        )}
        {contact.createdAt && (
          <p className="flex items-center gap-2 text-gray-400 text-xs">
            <Calendar className="w-3 h-3" />
            Creado: {new Date(contact.createdAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

// Merge Modal Component
function MergeModal({
  type,
  pair,
  onMerge,
  onClose,
  merging,
}: {
  type: string;
  pair: DuplicatePair;
  onMerge: (keepId: string, mergeId: string, mergeFields: string[]) => void;
  onClose: () => void;
  merging: boolean;
}) {
  const [keepRecord, setKeepRecord] = useState<'1' | '2'>('1');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const record1 = pair.record1;
  const record2 = pair.record2;

  const fields = type === 'clients'
    ? ['industry', 'phone', 'website', 'address', 'annualRevenue', 'employeeCount', 'source', 'crmNotes']
    : ['position', 'department', 'phone', 'linkedInUrl'];

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      industry: 'Industria',
      phone: 'Teléfono',
      website: 'Sitio Web',
      address: 'Dirección',
      annualRevenue: 'Ingresos Anuales',
      employeeCount: 'Empleados',
      source: 'Fuente',
      crmNotes: 'Notas CRM',
      position: 'Cargo',
      department: 'Departamento',
      linkedInUrl: 'LinkedIn',
    };
    return labels[field] || field;
  };

  const handleMerge = () => {
    const keepId = keepRecord === '1' ? record1._id : record2._id;
    const mergeId = keepRecord === '1' ? record2._id : record1._id;
    onMerge(keepId, mergeId, selectedFields);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Merge className="w-5 h-5 text-blue-600" />
            Fusionar {type === 'clients' ? 'Clientes' : 'Contactos'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Selecciona qué registro conservar. El otro será marcado como fusionado y sus relaciones serán transferidas.
          </p>

          {/* Record Selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div
              onClick={() => setKeepRecord('1')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                keepRecord === '1'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">Registro 1</span>
                {keepRecord === '1' && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    Conservar
                  </span>
                )}
              </div>
              {type === 'clients' ? (
                <ClientCard client={record1} />
              ) : (
                <ContactCard contact={record1} />
              )}
            </div>

            <div
              onClick={() => setKeepRecord('2')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                keepRecord === '2'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">Registro 2</span>
                {keepRecord === '2' && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    Conservar
                  </span>
                )}
              </div>
              {type === 'clients' ? (
                <ClientCard client={record2} />
              ) : (
                <ContactCard contact={record2} />
              )}
            </div>
          </div>

          {/* Field Selection */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Campos a copiar del registro que será eliminado:
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Los campos vacíos del registro conservado serán completados con los datos del registro eliminado.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {fields.map((field) => {
                const keepRec = keepRecord === '1' ? record1 : record2;
                const mergeRec = keepRecord === '1' ? record2 : record1;
                const hasValueInMerge = mergeRec[field];
                const hasValueInKeep = keepRec[field];

                return (
                  <label
                    key={field}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      !hasValueInMerge
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${selectedFields.includes(field) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFields([...selectedFields, field]);
                        } else {
                          setSelectedFields(selectedFields.filter(f => f !== field));
                        }
                      }}
                      disabled={!hasValueInMerge}
                      className="rounded text-blue-600"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getFieldLabel(field)}
                      </span>
                      {hasValueInMerge && !hasValueInKeep && (
                        <span className="text-xs text-green-600 ml-2">(Recomendado)</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Acción irreversible</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  El registro eliminado será marcado como fusionado. Todos sus deals, contactos y actividades serán transferidos al registro conservado.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleMerge}
            disabled={merging}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {merging ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Fusionando...
              </>
            ) : (
              <>
                <Merge className="w-4 h-4" />
                Fusionar Registros
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

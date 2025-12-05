'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Code,
  Facebook,
  Linkedin,
  Info,
  ShieldAlert,
} from 'lucide-react';

type PixelType = 'META_PIXEL' | 'GOOGLE_ADS' | 'LINKEDIN_INSIGHT' | 'TIKTOK_PIXEL' | 'TWITTER_PIXEL' | 'CUSTOM';

interface TrackingPixel {
  _id: string;
  name: string;
  type: PixelType;
  pixelId: string;
  conversionLabel?: string;
  customScript?: string;
  injectIn: {
    app: boolean;
    landingPages: boolean;
    publicForms: boolean;
  };
  trackEvents: {
    pageView: boolean;
    formSubmit: boolean;
    buttonClick: boolean;
    purchase: boolean;
    lead: boolean;
    customEvents: string[];
  };
  isActive: boolean;
  createdAt: string;
}

const PIXEL_TYPES: { value: PixelType; label: string; icon: any; color: string; description: string }[] = [
  { value: 'META_PIXEL', label: 'Facebook/Meta Pixel', icon: Facebook, color: 'bg-blue-600', description: 'Para retargeting en Facebook e Instagram' },
  { value: 'GOOGLE_ADS', label: 'Google Ads Tag', icon: Target, color: 'bg-red-500', description: 'Para remarketing y conversiones en Google Ads' },
  { value: 'LINKEDIN_INSIGHT', label: 'LinkedIn Insight Tag', icon: Linkedin, color: 'bg-blue-700', description: 'Para retargeting en LinkedIn' },
  { value: 'TIKTOK_PIXEL', label: 'TikTok Pixel', icon: Target, color: 'bg-black', description: 'Para retargeting en TikTok' },
  { value: 'TWITTER_PIXEL', label: 'Twitter/X Pixel', icon: Target, color: 'bg-gray-800', description: 'Para retargeting en Twitter/X' },
  { value: 'CUSTOM', label: 'Script Personalizado', icon: Code, color: 'bg-purple-600', description: 'Código de tracking personalizado' },
];

const DEFAULT_PIXEL: Partial<TrackingPixel> = {
  name: '',
  type: 'META_PIXEL',
  pixelId: '',
  conversionLabel: '',
  customScript: '',
  injectIn: {
    app: false,
    landingPages: true,
    publicForms: true,
  },
  trackEvents: {
    pageView: true,
    formSubmit: true,
    buttonClick: false,
    purchase: false,
    lead: true,
    customEvents: [],
  },
  isActive: true,
};

export default function TrackingPixelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pixels, setPixels] = useState<TrackingPixel[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPixel, setEditingPixel] = useState<Partial<TrackingPixel> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const canManage = permissions?.canManageCampaigns || (session?.user as any)?.role === 'ADMIN';

  useEffect(() => {
    if (status === 'authenticated' && !permissionsLoading) {
      if (canManage) {
        fetchPixels();
      } else {
        setLoading(false);
      }
    }
  }, [status, permissionsLoading, canManage]);

  const fetchPixels = async () => {
    try {
      const res = await fetch('/api/admin/tracking-pixels');
      if (res.ok) {
        const data = await res.json();
        setPixels(data);
      }
    } catch (error) {
      console.error('Error fetching pixels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPixel?.name || !editingPixel?.pixelId) {
      alert('Nombre e ID del pixel son requeridos');
      return;
    }

    setSaving(true);
    try {
      const method = editingPixel._id ? 'PUT' : 'POST';
      const body = editingPixel._id
        ? { id: editingPixel._id, ...editingPixel }
        : editingPixel;

      const res = await fetch('/api/admin/tracking-pixels', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchPixels();
        setShowModal(false);
        setEditingPixel(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving pixel:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/tracking-pixels?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchPixels();
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting pixel:', error);
    }
  };

  const toggleActive = async (pixel: TrackingPixel) => {
    try {
      const res = await fetch('/api/admin/tracking-pixels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pixel._id,
          isActive: !pixel.isActive,
        }),
      });

      if (res.ok) {
        await fetchPixels();
      }
    } catch (error) {
      console.error('Error toggling pixel:', error);
    }
  };

  const getPixelTypeInfo = (type: PixelType) => {
    return PIXEL_TYPES.find(p => p.value === type) || PIXEL_TYPES[0];
  };

  if (status === 'loading' || permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <ShieldAlert className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Acceso Restringido
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          Necesitas permisos de gestión de campañas para configurar píxeles de retargeting.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Target className="text-purple-600" size={28} />
            Píxeles de Retargeting
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configura los píxeles de tracking para remarketing
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPixel({ ...DEFAULT_PIXEL });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus size={20} />
          Nuevo Pixel
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800 dark:text-purple-200">
            <p className="font-medium mb-1">Los píxeles se inyectan automáticamente en:</p>
            <ul className="list-disc list-inside space-y-1 text-purple-700 dark:text-purple-300">
              <li><strong>Landing Pages:</strong> Todas las páginas públicas de marketing</li>
              <li><strong>Formularios Públicos:</strong> Formularios de captura de leads</li>
              <li><strong>App (opcional):</strong> La aplicación interna (usuarios autenticados)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Pixels List */}
      {pixels.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay píxeles configurados
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Agrega tu primer pixel para empezar a trackear visitantes
          </p>
          <button
            onClick={() => {
              setEditingPixel({ ...DEFAULT_PIXEL });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={18} />
            Agregar Pixel
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {pixels.map((pixel) => {
            const typeInfo = getPixelTypeInfo(pixel.type);
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={pixel._id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 ${
                  !pixel.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${typeInfo.color} text-white`}>
                      <TypeIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {pixel.name}
                        {!pixel.isActive && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                            Inactivo
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {typeInfo.label}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                          ID: {pixel.pixelId}
                        </code>
                        {pixel.conversionLabel && (
                          <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                            Label: {pixel.conversionLabel}
                          </code>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        {pixel.injectIn.landingPages && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                            Landing Pages
                          </span>
                        )}
                        {pixel.injectIn.publicForms && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            Formularios
                          </span>
                        )}
                        {pixel.injectIn.app && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                            App
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(pixel)}
                      className={`p-2 rounded-lg transition ${
                        pixel.isActive
                          ? 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={pixel.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {pixel.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPixel(pixel);
                        setShowModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(pixel._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && editingPixel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingPixel._id ? 'Editar Pixel' : 'Nuevo Pixel'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPixel(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Pixel Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Pixel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PIXEL_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setEditingPixel({ ...editingPixel, type: type.value })}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition text-left ${
                          editingPixel.type === type.value
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className={`p-2 rounded ${type.color} text-white`}>
                          <TypeIcon size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{type.label}</p>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={editingPixel.name || ''}
                  onChange={(e) => setEditingPixel({ ...editingPixel, name: e.target.value })}
                  placeholder="Ej: Facebook Pixel Principal"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Pixel ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {editingPixel.type === 'GOOGLE_ADS' ? 'Conversion ID (AW-XXXXXXXXX)' : 'Pixel ID'} *
                </label>
                <input
                  type="text"
                  value={editingPixel.pixelId || ''}
                  onChange={(e) => setEditingPixel({ ...editingPixel, pixelId: e.target.value })}
                  placeholder={
                    editingPixel.type === 'META_PIXEL' ? '123456789012345' :
                    editingPixel.type === 'GOOGLE_ADS' ? 'AW-123456789' :
                    editingPixel.type === 'LINKEDIN_INSIGHT' ? '123456' :
                    editingPixel.type === 'TIKTOK_PIXEL' ? 'XXXXXXXXXX' :
                    'ID del pixel'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Conversion Label for Google Ads */}
              {editingPixel.type === 'GOOGLE_ADS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Conversion Label (opcional)
                  </label>
                  <input
                    type="text"
                    value={editingPixel.conversionLabel || ''}
                    onChange={(e) => setEditingPixel({ ...editingPixel, conversionLabel: e.target.value })}
                    placeholder="AbCdEfGhIjKlMnO"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Para tracking de conversiones específicas</p>
                </div>
              )}

              {/* Custom Script */}
              {editingPixel.type === 'CUSTOM' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Script Personalizado
                  </label>
                  <textarea
                    value={editingPixel.customScript || ''}
                    onChange={(e) => setEditingPixel({ ...editingPixel, customScript: e.target.value })}
                    placeholder="<script>...</script>"
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  />
                </div>
              )}

              {/* Inject In */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inyectar en
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingPixel.injectIn?.landingPages || false}
                      onChange={(e) => setEditingPixel({
                        ...editingPixel,
                        injectIn: { ...editingPixel.injectIn!, landingPages: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Landing Pages públicas</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingPixel.injectIn?.publicForms || false}
                      onChange={(e) => setEditingPixel({
                        ...editingPixel,
                        injectIn: { ...editingPixel.injectIn!, publicForms: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Formularios públicos</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingPixel.injectIn?.app || false}
                      onChange={(e) => setEditingPixel({
                        ...editingPixel,
                        injectIn: { ...editingPixel.injectIn!, app: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Aplicación interna (usuarios autenticados)</span>
                  </label>
                </div>
              </div>

              {/* Track Events */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Eventos a trackear
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingPixel.trackEvents?.pageView || false}
                      onChange={(e) => setEditingPixel({
                        ...editingPixel,
                        trackEvents: { ...editingPixel.trackEvents!, pageView: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 dark:text-gray-300">PageView</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingPixel.trackEvents?.formSubmit || false}
                      onChange={(e) => setEditingPixel({
                        ...editingPixel,
                        trackEvents: { ...editingPixel.trackEvents!, formSubmit: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Form Submit</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingPixel.trackEvents?.lead || false}
                      onChange={(e) => setEditingPixel({
                        ...editingPixel,
                        trackEvents: { ...editingPixel.trackEvents!, lead: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Lead</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingPixel.trackEvents?.purchase || false}
                      onChange={(e) => setEditingPixel({
                        ...editingPixel,
                        trackEvents: { ...editingPixel.trackEvents!, purchase: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Purchase</span>
                  </label>
                </div>
              </div>

              {/* Active */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={editingPixel.isActive || false}
                  onChange={(e) => setEditingPixel({ ...editingPixel, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">Pixel activo</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPixel(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar Pixel
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro de que deseas eliminar este pixel? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

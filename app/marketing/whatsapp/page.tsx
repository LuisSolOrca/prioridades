'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageCircle,
  Send,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  FileText,
  RefreshCw,
  Settings,
  ExternalLink,
  X,
  Upload,
  Search,
} from 'lucide-react';

interface WhatsAppTemplate {
  _id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: {
    type: string;
    text?: string;
    format?: string;
  }[];
  externalTemplateId?: string;
  createdAt: string;
}

interface WhatsAppStats {
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  templatesApproved: number;
  templatesPending: number;
  activeConversations: number;
}

export default function WhatsAppPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [stats, setStats] = useState<WhatsAppStats>({
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
    templatesApproved: 0,
    templatesPending: 0,
    activeConversations: 0,
  });
  const [syncing, setSyncing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sendPhoneNumber, setSendPhoneNumber] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [broadcastName, setBroadcastName] = useState('');
  const [broadcastPhones, setBroadcastPhones] = useState('');
  const [broadcastTemplate, setBroadcastTemplate] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Check connection status
      const statusRes = await fetch('/api/marketing/whatsapp/status');
      const statusData = await statusRes.json();
      setConnected(statusData.connected);

      if (statusData.connected) {
        // Load templates
        try {
          const templatesRes = await fetch('/api/marketing/whatsapp/templates');
          if (templatesRes.ok) {
            const templatesData = await templatesRes.json();
            setTemplates(templatesData.templates || []);

            // Calculate stats from templates
            const approved = templatesData.templates?.filter((t: WhatsAppTemplate) => t.status === 'APPROVED').length || 0;
            const pending = templatesData.templates?.filter((t: WhatsAppTemplate) => t.status === 'PENDING').length || 0;

            setStats(prev => ({
              ...prev,
              templatesApproved: approved,
              templatesPending: pending,
            }));
          }
        } catch (error) {
          console.error('Error loading templates:', error);
        }
      }
    } catch (error) {
      console.error('Error loading WhatsApp data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router, loadData]);

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/marketing/whatsapp/auth');
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error connecting to WhatsApp:', error);
    }
  };

  const handleSyncTemplates = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/marketing/whatsapp/templates/sync', {
        method: 'POST',
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error syncing templates:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !sendPhoneNumber.trim()) return;

    setSendLoading(true);
    try {
      const response = await fetch('/api/marketing/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate._id,
          phoneNumber: sendPhoneNumber.replace(/\D/g, ''),
        }),
      });

      if (response.ok) {
        setShowSendModal(false);
        setSendPhoneNumber('');
        setSelectedTemplate(null);
        alert('Mensaje enviado correctamente');
      } else {
        const data = await response.json();
        alert(data.error || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar mensaje');
    } finally {
      setSendLoading(false);
    }
  };

  const handleCreateBroadcast = async () => {
    if (!broadcastTemplate || !broadcastPhones.trim() || !broadcastName.trim()) return;

    setSendLoading(true);
    try {
      const phones = broadcastPhones.split('\n').map(p => p.trim().replace(/\D/g, '')).filter(p => p);

      const response = await fetch('/api/marketing/whatsapp/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: broadcastName,
          templateId: broadcastTemplate,
          phoneNumbers: phones,
        }),
      });

      if (response.ok) {
        setShowBroadcastModal(false);
        setBroadcastName('');
        setBroadcastPhones('');
        setBroadcastTemplate('');
        alert(`Broadcast creado. Enviando a ${phones.length} contactos...`);
      } else {
        const data = await response.json();
        alert(data.error || 'Error al crear broadcast');
      }
    } catch (error) {
      console.error('Error creating broadcast:', error);
      alert('Error al crear broadcast');
    } finally {
      setSendLoading(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) return;

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/marketing/whatsapp/contacts/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setShowImportModal(false);
        setImportFile(null);
        alert(`${data.imported || 0} contactos importados correctamente`);
      } else {
        const data = await response.json();
        alert(data.error || 'Error al importar contactos');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      alert('Error al importar contactos');
    } finally {
      setImportLoading(false);
    }
  };

  const openSendModal = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setShowSendModal(true);
  };

  const getStatusBadge = (templateStatus: string) => {
    switch (templateStatus) {
      case 'APPROVED':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Aprobado
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Rechazado
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs">
            {templateStatus}
          </span>
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'MARKETING':
        return 'Marketing';
      case 'UTILITY':
        return 'Utilidad';
      case 'AUTHENTICATION':
        return 'Autenticación';
      default:
        return category;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Conecta WhatsApp Business
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Conecta tu cuenta de WhatsApp Business API para gestionar templates, enviar mensajes masivos y ver métricas de conversaciones.
            </p>
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Conectar WhatsApp Business
            </button>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
              Requiere una cuenta de Meta Business y acceso a WhatsApp Business API
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-green-600" />
              WhatsApp Business
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gestiona templates y mensajes de WhatsApp Business API
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={handleSyncTemplates}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
            <button
              onClick={() => router.push('/admin/marketing-integrations')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Settings className="w-4 h-4" />
              Configuración
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mensajes Enviados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.messagesSent.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tasa de Lectura</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.messagesDelivered > 0
                    ? `${((stats.messagesRead / stats.messagesDelivered) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Templates Aprobados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.templatesApproved}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Conversaciones Activas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.activeConversations.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Templates Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Templates de Mensajes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Templates aprobados por Meta para envío de mensajes
              </p>
            </div>
            <Link
              href="/marketing/whatsapp/templates/new"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              Crear Template
            </Link>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {templates.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No hay templates configurados
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Crea tu primer template para comenzar a enviar mensajes
                </p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template._id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        {getStatusBadge(template.status)}
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          {getCategoryLabel(template.category)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {template.components.find(c => c.type === 'BODY')?.text || 'Sin contenido'}
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                        <span>Idioma: {template.language}</span>
                        <span>Creado: {new Date(template.createdAt).toLocaleDateString('es-MX')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {template.status === 'APPROVED' && (
                        <button
                          onClick={() => openSendModal(template)}
                          className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg flex items-center gap-1"
                        >
                          <Send className="w-4 h-4" />
                          Enviar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <h3 className="font-semibold text-lg mb-2">Enviar Mensaje Masivo</h3>
            <p className="text-green-100 text-sm mb-4">
              Envía mensajes a múltiples contactos usando templates aprobados
            </p>
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="px-4 py-2 bg-white text-green-600 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
            >
              Crear Broadcast
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <h3 className="font-semibold text-lg mb-2">Importar Contactos</h3>
            <p className="text-blue-100 text-sm mb-4">
              Importa contactos desde un archivo CSV para campañas de WhatsApp
            </p>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Importar CSV
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
            Acerca de WhatsApp Business API
          </h3>
          <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
            <li>• Los templates deben ser aprobados por Meta antes de poder usarlos</li>
            <li>• Solo puedes enviar mensajes a usuarios que han interactuado en las últimas 24 horas, o usar templates aprobados</li>
            <li>• Las conversaciones de marketing tienen costo por mensaje</li>
            <li>• Configura webhooks para recibir respuestas en tiempo real</li>
          </ul>
        </div>
      </main>

      {/* Send Template Modal */}
      {showSendModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Enviar Template
              </h3>
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedTemplate(null);
                  setSendPhoneNumber('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedTemplate.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedTemplate.components.find(c => c.type === 'BODY')?.text || 'Sin contenido'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número de teléfono
              </label>
              <input
                type="tel"
                value={sendPhoneNumber}
                onChange={(e) => setSendPhoneNumber(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Incluye el código de país (ej: +52 para México)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedTemplate(null);
                  setSendPhoneNumber('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendTemplate}
                disabled={sendLoading || !sendPhoneNumber.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Crear Broadcast
              </h3>
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastName('');
                  setBroadcastPhones('');
                  setBroadcastTemplate('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Broadcast
                </label>
                <input
                  type="text"
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                  placeholder="Ej: Promoción Navidad 2024"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template
                </label>
                <select
                  value={broadcastTemplate}
                  onChange={(e) => setBroadcastTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Selecciona un template</option>
                  {templates
                    .filter(t => t.status === 'APPROVED')
                    .map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Números de teléfono
                </label>
                <textarea
                  value={broadcastPhones}
                  onChange={(e) => setBroadcastPhones(e.target.value)}
                  placeholder="+52 55 1234 5678&#10;+52 55 8765 4321&#10;..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Un número por línea. Incluye código de país.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastName('');
                  setBroadcastPhones('');
                  setBroadcastTemplate('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateBroadcast}
                disabled={sendLoading || !broadcastName.trim() || !broadcastTemplate || !broadcastPhones.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Crear Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Importar Contactos
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-500 dark:hover:border-green-500 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" />
                  {importFile ? (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {importFile.name}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Haz clic para seleccionar un archivo CSV
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        O arrastra y suelta aquí
                      </p>
                    </>
                  )}
                </div>
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">
                Formato esperado del CSV:
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 font-mono">
                nombre,telefono,email<br />
                Juan Pérez,+525512345678,juan@email.com
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportCSV}
                disabled={importLoading || !importFile}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

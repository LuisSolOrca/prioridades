'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Tag,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Globe,
  GitBranch,
  MousePointer,
  Eye,
  MousePointerClick,
  FileEdit,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: string;
  source?: string;
  tags?: string[];
  notes?: string;
  clientId?: {
    _id: string;
    name: string;
  };
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Deal {
  _id: string;
  title: string;
  value: number;
  currency: string;
  stageId?: {
    _id: string;
    name: string;
    color?: string;
  };
  createdAt: string;
}

interface JourneyEvent {
  type: 'touchpoint' | 'conversion';
  eventType: string;
  channel?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  url?: string;
  metadata?: Record<string, any>;
  occurredAt: string;
}

interface CustomerJourney {
  stats: {
    totalTouchpoints: number;
    totalConversions: number;
    totalValue: number;
    journeyDuration: number;
    channels: string[];
    channelBreakdown: Record<string, number>;
  };
  timeline: JourneyEvent[];
}

const TOUCHPOINT_LABELS: Record<string, string> = {
  page_view: 'Vista de página',
  form_submission: 'Formulario enviado',
  email_open: 'Email abierto',
  email_click: 'Clic en email',
  landing_page_view: 'Vista de landing',
  landing_page_conversion: 'Conversión en landing',
  ad_click: 'Clic en anuncio',
  ad_impression: 'Impresión de anuncio',
  social_engagement: 'Interacción social',
};

const TOUCHPOINT_ICONS: Record<string, React.ReactNode> = {
  page_view: <Eye className="w-4 h-4" />,
  form_submission: <FileEdit className="w-4 h-4" />,
  email_open: <Mail className="w-4 h-4" />,
  email_click: <MousePointerClick className="w-4 h-4" />,
  landing_page_view: <Globe className="w-4 h-4" />,
  landing_page_conversion: <DollarSign className="w-4 h-4" />,
  ad_click: <ExternalLink className="w-4 h-4" />,
  default: <MousePointer className="w-4 h-4" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  paid_social: 'bg-pink-500',
  organic_social: 'bg-purple-500',
  paid_search: 'bg-green-500',
  organic_search: 'bg-teal-500',
  direct: 'bg-gray-500',
  referral: 'bg-orange-500',
  display: 'bg-yellow-500',
  other: 'bg-slate-500',
};

export default function ContactDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [journey, setJourney] = useState<CustomerJourney | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (contactId) {
      fetchContact();
      fetchDeals();
      fetchJourney();
    }
  }, [contactId]);

  const fetchContact = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/contacts/${contactId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Contacto no encontrado');
      }
      const data = await res.json();
      setContact(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async () => {
    try {
      const res = await fetch(`/api/crm/deals?contactId=${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || data || []);
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
    }
  };

  const fetchJourney = async () => {
    try {
      setJourneyLoading(true);
      const res = await fetch(`/api/marketing/attribution/journey/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setJourney(data);
      }
    } catch (err) {
      console.error('Error fetching journey:', err);
    } finally {
      setJourneyLoading(false);
    }
  };

  const deleteContact = async () => {
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return;

    try {
      const res = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/crm/contacts');
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-16 main-content px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <User size={48} className="mx-auto text-gray-400 mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Contacto no encontrado
              </h1>
              <p className="text-gray-500 mb-4">{error || 'El contacto no existe o fue eliminado.'}</p>
              <Link
                href="/crm/contacts"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ArrowLeft size={20} />
                Volver a Contactos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/crm/contacts"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ArrowLeft size={24} className="text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {contact.firstName} {contact.lastName}
                </h1>
                {contact.position && (
                  <p className="text-gray-500">{contact.position}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={deleteContact}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                title="Eliminar"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Información de Contacto
                </h2>
                <div className="space-y-4">
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Teléfono</p>
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-gray-900 dark:text-white hover:text-blue-600"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {(contact.company || contact.clientId) && (
                    <div className="flex items-center gap-3">
                      <Building2 className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Empresa</p>
                        {contact.clientId ? (
                          <Link
                            href={`/crm/clients/${contact.clientId._id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {contact.clientId.name}
                          </Link>
                        ) : (
                          <p className="text-gray-900 dark:text-white">{contact.company}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {contact.position && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Cargo</p>
                        <p className="text-gray-900 dark:text-white">{contact.position}</p>
                      </div>
                    </div>
                  )}
                  {contact.source && (
                    <div className="flex items-center gap-3">
                      <Globe className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Fuente</p>
                        <p className="text-gray-900 dark:text-white">{contact.source}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {contact.notes && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Notas
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {contact.notes}
                  </p>
                </div>
              )}

              {/* Deals */}
              {deals.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Deals Asociados
                  </h2>
                  <div className="space-y-3">
                    {deals.map((deal) => (
                      <Link
                        key={deal._id}
                        href={`/crm/deals?dealId=${deal._id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <DollarSign className="text-green-500" size={20} />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {deal.title}
                            </p>
                            {deal.stageId && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${deal.stageId.color || '#3b82f6'}20`,
                                  color: deal.stageId.color || '#3b82f6',
                                }}
                              >
                                {deal.stageId.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${deal.value?.toLocaleString()} {deal.currency}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Journey */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <GitBranch className="text-purple-500" size={20} />
                    Customer Journey
                  </h2>
                  {journey && journey.stats.totalTouchpoints > 0 && (
                    <Link
                      href="/marketing/attribution"
                      className="text-sm text-purple-600 hover:underline"
                    >
                      Ver Attribution
                    </Link>
                  )}
                </div>

                {journeyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-purple-500" size={24} />
                  </div>
                ) : !journey || journey.stats.totalTouchpoints === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <MousePointer className="mx-auto mb-2" size={32} />
                    <p>Sin touchpoints registrados</p>
                    <p className="text-sm mt-1">
                      Los eventos de marketing aparecerán aquí cuando el contacto interactúe con emails, landing pages o formularios.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Journey Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-purple-600">{journey.stats.totalTouchpoints}</p>
                        <p className="text-xs text-gray-500">Touchpoints</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">{journey.stats.totalConversions}</p>
                        <p className="text-xs text-gray-500">Conversiones</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{journey.stats.journeyDuration}</p>
                        <p className="text-xs text-gray-500">Días</p>
                      </div>
                    </div>

                    {/* Channels */}
                    {journey.stats.channels.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {journey.stats.channels.map(ch => (
                          <span
                            key={ch}
                            className={`px-2 py-1 rounded-full text-xs text-white capitalize ${CHANNEL_COLORS[ch] || 'bg-gray-500'}`}
                          >
                            {ch.replace('_', ' ')}
                            {journey.stats.channelBreakdown[ch] && ` (${journey.stats.channelBreakdown[ch]})`}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="relative">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                      <div className="space-y-3">
                        {(showAllEvents ? journey.timeline : journey.timeline.slice(0, 5)).map((event, idx) => (
                          <div key={idx} className="relative flex items-start gap-3 pl-8">
                            <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-white ${
                              event.type === 'conversion' ? 'bg-green-500' : (CHANNEL_COLORS[event.channel || 'other'] || 'bg-gray-500')
                            }`}>
                              {TOUCHPOINT_ICONS[event.eventType] || TOUCHPOINT_ICONS.default}
                            </div>
                            <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                  {event.type === 'conversion' ? '🎉 Conversión' : (TOUCHPOINT_LABELS[event.eventType] || event.eventType)}
                                </p>
                                <span className="text-xs text-gray-500">
                                  {new Date(event.occurredAt).toLocaleDateString('es-ES', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {event.campaign && <span className="mr-2">📣 {event.campaign}</span>}
                                {event.metadata?.formName && <span>📝 {event.metadata.formName}</span>}
                                {event.metadata?.campaignName && <span>✉️ {event.metadata.campaignName}</span>}
                                {event.metadata?.pageTitle && <span>🔗 {event.metadata.pageTitle}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Show more button */}
                    {journey.timeline.length > 5 && (
                      <button
                        onClick={() => setShowAllEvents(!showAllEvents)}
                        className="mt-4 w-full py-2 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg flex items-center justify-center gap-1"
                      >
                        {showAllEvents ? (
                          <>
                            <ChevronUp size={16} />
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            Ver {journey.timeline.length - 5} eventos más
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Tag size={20} />
                    Etiquetas
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar size={20} />
                  Información
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Creado</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(contact.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {contact.createdBy && (
                    <div>
                      <p className="text-gray-500">Creado por</p>
                      <p className="text-gray-900 dark:text-white">{contact.createdBy.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Última actualización</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(contact.updatedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

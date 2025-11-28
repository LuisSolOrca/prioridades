'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import {
  Mail,
  Send,
  Eye,
  EyeOff,
  MousePointerClick,
  Reply,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Filter,
  Search,
  ChevronRight,
  ExternalLink,
  X,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { EMAIL_STATUS_LABELS, EMAIL_STATUS_COLORS } from '@/lib/crm/emailTrackingConstants';

interface EmailTrackingItem {
  _id: string;
  trackingId: string;
  subject: string;
  bodyPreview: string;
  recipientEmail: string;
  recipientName?: string;
  status: string;
  sentAt: string;
  openedAt?: string;
  openCount: number;
  lastOpenedAt?: string;
  clickedAt?: string;
  clickCount: number;
  clickedLinks?: { url: string; clickedAt: string }[];
  repliedAt?: string;
  bouncedAt?: string;
  dealId?: { _id: string; title: string };
  contactId?: { _id: string; firstName: string; lastName: string };
  clientId?: { _id: string; name: string };
}

interface Stats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalBounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
}

const STATUS_ICONS: Record<string, any> = {
  sent: Send,
  delivered: CheckCircle,
  opened: Eye,
  clicked: MousePointerClick,
  replied: Reply,
  bounced: AlertTriangle,
};

const STATUS_COLORS: Record<string, string> = {
  sent: 'text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300',
  delivered: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  opened: 'text-green-500 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  clicked: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  replied: 'text-teal-500 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400',
  bounced: 'text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
};

export default function EmailTrackingPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<EmailTrackingItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailTrackingItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterUnopened, setFilterUnopened] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchStats();
    fetchEmails();
  }, [filterStatus, filterUnopened, page]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/crm/email/tracking?stats=true');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');

      if (filterStatus) params.append('status', filterStatus);
      if (filterUnopened) params.append('unopened', 'true');

      const res = await fetch(`/api/crm/email/tracking?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (filterUnopened) {
          setEmails(data);
          setTotalPages(1);
        } else {
          setEmails(data.emails);
          setTotalPages(data.pagination.pages);
        }
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    if (diffDays < 7) return `hace ${diffDays} días`;
    return formatDate(dateStr);
  };

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(search.toLowerCase()) ||
    email.recipientEmail.toLowerCase().includes(search.toLowerCase()) ||
    email.recipientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail className="w-7 h-7 text-blue-500" />
              Email Tracking
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitorea aperturas, clics y respuestas de tus emails
            </p>
          </div>
          <button
            onClick={() => { fetchStats(); fetchEmails(); }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enviados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSent}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Abiertos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.totalOpened}
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">
                    ({stats.openRate.toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <MousePointerClick className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Clics</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.totalClicked}
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">
                    ({stats.clickRate.toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Reply className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Respondidos</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {stats.totalReplied}
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">
                    ({stats.replyRate.toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rebotados</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.totalBounced}
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">
                    ({stats.bounceRate.toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por asunto o destinatario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          disabled={filterUnopened}
        >
          <option value="">Todos los estados</option>
          <option value="sent">Enviados</option>
          <option value="delivered">Entregados</option>
          <option value="opened">Abiertos</option>
          <option value="clicked">Con clics</option>
          <option value="replied">Respondidos</option>
          <option value="bounced">Rebotados</option>
        </select>
        <button
          onClick={() => { setFilterUnopened(!filterUnopened); setFilterStatus(''); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
            filterUnopened
              ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <EyeOff className="w-4 h-4" />
          Sin abrir (+3 días)
        </button>
      </div>

      {/* Email List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay emails para mostrar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEmails.map((email) => {
              const StatusIcon = STATUS_ICONS[email.status] || Mail;
              return (
                <div
                  key={email._id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => setSelectedEmail(email)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${STATUS_COLORS[email.status]}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {email.subject}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[email.status]}`}>
                          {EMAIL_STATUS_LABELS[email.status as keyof typeof EMAIL_STATUS_LABELS]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Para: {email.recipientName || email.recipientEmail}
                        {email.recipientName && (
                          <span className="text-gray-400 dark:text-gray-500 ml-1">({email.recipientEmail})</span>
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(email.sentAt)}
                        </span>
                        {email.openCount > 0 && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Eye className="w-3 h-3" />
                            {email.openCount} apertura{email.openCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {email.clickCount > 0 && (
                          <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                            <MousePointerClick className="w-3 h-3" />
                            {email.clickCount} clic{email.clickCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {email.dealId && (
                          <span className="text-blue-500 dark:text-blue-400">
                            Deal: {email.dealId.title}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !filterUnopened && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedEmail.subject}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Para: {selectedEmail.recipientName || selectedEmail.recipientEmail}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm ${STATUS_COLORS[selectedEmail.status]}`}>
                  {EMAIL_STATUS_LABELS[selectedEmail.status as keyof typeof EMAIL_STATUS_LABELS]}
                </span>
                {selectedEmail.dealId && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                    Deal: {selectedEmail.dealId.title}
                  </span>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Timeline de actividad</h3>
                <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-600 space-y-4">
                  {/* Sent */}
                  <div className="relative">
                    <div className="absolute -left-[25px] w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">Enviado</p>
                      <p className="text-gray-500 dark:text-gray-400">{formatDate(selectedEmail.sentAt)}</p>
                    </div>
                  </div>

                  {/* Opened */}
                  {selectedEmail.openedAt && (
                    <div className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">
                          Abierto
                          {selectedEmail.openCount > 1 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              ({selectedEmail.openCount} veces)
                            </span>
                          )}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Primera vez: {formatDate(selectedEmail.openedAt)}
                        </p>
                        {selectedEmail.lastOpenedAt && selectedEmail.lastOpenedAt !== selectedEmail.openedAt && (
                          <p className="text-gray-400 dark:text-gray-500 text-xs">
                            Última vez: {formatDate(selectedEmail.lastOpenedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Clicks */}
                  {selectedEmail.clickedAt && (
                    <div className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 bg-purple-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">
                          Clic en link
                          {selectedEmail.clickCount > 1 && (
                            <span className="text-purple-600 dark:text-purple-400 ml-1">
                              ({selectedEmail.clickCount} clics)
                            </span>
                          )}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Primer clic: {formatDate(selectedEmail.clickedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Clicked Links */}
                  {selectedEmail.clickedLinks && selectedEmail.clickedLinks.length > 0 && (
                    <div className="ml-4 mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Links clickeados:</p>
                      <div className="space-y-1">
                        {selectedEmail.clickedLinks.map((link, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate max-w-[300px] hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {link.url}
                            </a>
                            <span className="text-gray-400 dark:text-gray-500 ml-auto">
                              {formatRelativeTime(link.clickedAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Replied */}
                  {selectedEmail.repliedAt && (
                    <div className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 bg-teal-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">Respondido</p>
                        <p className="text-gray-500 dark:text-gray-400">{formatDate(selectedEmail.repliedAt)}</p>
                      </div>
                    </div>
                  )}

                  {/* Bounced */}
                  {selectedEmail.bouncedAt && (
                    <div className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      <div className="text-sm">
                        <p className="font-medium text-red-600 dark:text-red-400">Rebotado</p>
                        <p className="text-gray-500 dark:text-gray-400">{formatDate(selectedEmail.bouncedAt)}</p>
                      </div>
                    </div>
                  )}

                  {/* No activity yet */}
                  {!selectedEmail.openedAt && !selectedEmail.bouncedAt && (
                    <div className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800"></div>
                      <div className="text-sm text-gray-400 dark:text-gray-500">
                        Sin actividad registrada aún
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {selectedEmail.bodyPreview && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Vista previa</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {selectedEmail.bodyPreview}...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

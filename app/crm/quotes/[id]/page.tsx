'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  FileText,
  ArrowLeft,
  DollarSign,
  Building2,
  User,
  Calendar,
  Loader2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Package,
} from 'lucide-react';

interface QuoteItem {
  _id: string;
  productId?: { _id: string; name: string };
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Quote {
  _id: string;
  quoteNumber: string;
  dealId?: { _id: string; title: string };
  clientId?: { _id: string; name: string };
  contactId?: { _id: string; firstName: string; lastName: string };
  createdBy?: { _id: string; name: string };
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export default function QuoteDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadQuote();
    }
  }, [status, router, quoteId]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/quotes/${quoteId}`);
      if (!res.ok) {
        router.push('/crm');
        return;
      }
      const data = await res.json();
      setQuote(data);
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Aceptada' };
      case 'REJECTED':
        return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Rechazada' };
      case 'EXPIRED':
        return { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock, label: 'Expirada' };
      case 'SENT':
        return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: FileText, label: 'Enviada' };
      default:
        return { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: FileText, label: 'Borrador' };
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !quote) return null;

  const statusConfig = getStatusConfig(quote.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-5xl mx-auto">
        <Link
          href="/crm"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver al CRM
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${statusConfig.color}`}>
                <StatusIcon size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Cotización #{quote.quoteNumber}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium mt-1 ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(quote.total, quote.currency)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t dark:border-gray-700 text-sm">
            {quote.clientId && (
              <Link
                href={`/crm/clients/${quote.clientId._id}`}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Building2 size={16} />
                {quote.clientId.name}
              </Link>
            )}
            {quote.contactId && (
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User size={16} />
                {quote.contactId.firstName} {quote.contactId.lastName}
              </span>
            )}
            {quote.validUntil && (
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar size={16} />
                Válida hasta: {new Date(quote.validUntil).toLocaleDateString('es-MX')}
              </span>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Package size={20} className="text-indigo-500" />
              Productos / Servicios ({quote.items.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cant.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Precio Unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Desc.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {quote.items.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                      {item.productId?.name || item.description}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {formatCurrency(item.unitPrice, quote.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.discount}%</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200">
                      {formatCurrency(item.total, quote.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-800 dark:text-gray-200">{formatCurrency(quote.subtotal, quote.currency)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Descuento</span>
                  <span className="text-red-600 dark:text-red-400">-{formatCurrency(quote.discount, quote.currency)}</span>
                </div>
              )}
              {quote.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Impuestos</span>
                  <span className="text-gray-800 dark:text-gray-200">{formatCurrency(quote.tax, quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-gray-600">
                <span className="text-gray-800 dark:text-gray-100">Total</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(quote.total, quote.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quote.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Notas</h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Términos y Condiciones</h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{quote.terms}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

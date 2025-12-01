'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Building,
  ArrowLeft,
  Globe,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  Edit,
  ThumbsUp,
  ThumbsDown,
  Target,
} from 'lucide-react';

interface Competitor {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  marketShare?: number;
  strengths?: string[];
  weaknesses?: string[];
  products?: string[];
  pricing?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CompetitorDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const competitorId = params.id as string;

  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadCompetitor();
    }
  }, [status, router, competitorId]);

  const loadCompetitor = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/competitors/${competitorId}`);
      if (!res.ok) {
        router.push('/crm');
        return;
      }
      const data = await res.json();
      setCompetitor(data);
    } catch (error) {
      console.error('Error loading competitor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !competitor) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-4xl mx-auto">
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
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center">
                <Building size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{competitor.name}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    competitor.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {competitor.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {competitor.website && (
                  <a
                    href={competitor.website.startsWith('http') ? competitor.website : `https://${competitor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                  >
                    <Globe size={14} />
                    {competitor.website}
                  </a>
                )}
              </div>
            </div>
            <Link
              href="/crm"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Edit size={18} />
              Editar
            </Link>
          </div>

          {competitor.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-300">{competitor.description}</p>
          )}

          {competitor.marketShare !== undefined && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Target size={20} className="text-indigo-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Participación de mercado:</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{competitor.marketShare}%</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          {competitor.strengths && competitor.strengths.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <ThumbsUp size={20} className="text-green-500" />
                  Fortalezas ({competitor.strengths.length})
                </h2>
              </div>
              <ul className="divide-y dark:divide-gray-700">
                {competitor.strengths.map((strength, idx) => (
                  <li key={idx} className="p-3 text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <TrendingUp size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {competitor.weaknesses && competitor.weaknesses.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <ThumbsDown size={20} className="text-red-500" />
                  Debilidades ({competitor.weaknesses.length})
                </h2>
              </div>
              <ul className="divide-y dark:divide-gray-700">
                {competitor.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="p-3 text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <TrendingDown size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Products */}
          {competitor.products && competitor.products.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Productos/Servicios</h2>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {competitor.products.map((product, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                    {product}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pricing & Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información Adicional</h2>

            {competitor.pricing && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                  <DollarSign size={14} />
                  Pricing
                </h3>
                <p className="text-gray-700 dark:text-gray-300">{competitor.pricing}</p>
              </div>
            )}

            {competitor.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notas</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{competitor.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t dark:border-gray-700 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Creado</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {new Date(competitor.createdAt).toLocaleDateString('es-MX')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

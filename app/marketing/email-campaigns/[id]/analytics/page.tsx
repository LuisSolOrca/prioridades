'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CampaignAnalytics from '@/components/marketing/CampaignAnalytics';
import { ChevronLeft, BarChart3 } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EmailCampaignAnalyticsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/marketing/email-campaigns')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Analytics de Campaña
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Analiza el rendimiento detallado de tu campaña de email
              </p>
            </div>
          </div>
        </div>

        <CampaignAnalytics campaignId={id} />
      </div>
    </div>
  );
}

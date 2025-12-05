'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CampaignAnalytics from '@/components/marketing/CampaignAnalytics';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/marketing/email-campaigns')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics de Campana</h1>
          <p className="text-gray-600 mt-1">
            Analiza el rendimiento de tu campana de email
          </p>
        </div>
      </div>

      <CampaignAnalytics campaignId={params.id as string} />
    </div>
  );
}

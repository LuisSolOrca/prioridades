'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CampaignEditor from '@/components/marketing/CampaignEditor';

export default function EditCampaignPage() {
  const params = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/email-campaigns/${params.id}`);
      if (!response.ok) {
        throw new Error('Error al cargar la campana');
      }
      const data = await response.json();
      setCampaign(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <a href="/marketing/email-campaigns" className="text-blue-600 hover:underline">
            Volver a campanas
          </a>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <CampaignEditor
      campaignId={params.id as string}
      initialData={{
        name: campaign.name,
        subject: campaign.subject,
        preheader: campaign.preheader,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo,
        category: campaign.category,
        tags: campaign.tags || [],
        audience: campaign.audience,
        content: campaign.content || {
          json: { blocks: [], globalStyles: {} },
          html: '',
        },
        abTest: campaign.abTest || {
          enabled: false,
          testType: 'subject',
          variants: [],
          testSize: 20,
          winnerCriteria: 'open_rate',
          testDuration: 4,
        },
      }}
    />
  );
}

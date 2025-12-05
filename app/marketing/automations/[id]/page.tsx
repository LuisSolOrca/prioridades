'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AutomationEditor from '@/components/marketing/AutomationEditor';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditAutomationPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [automation, setAutomation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAutomation();
  }, [id]);

  const fetchAutomation = async () => {
    try {
      const res = await fetch(`/api/marketing/automations/${id}`);

      if (!res.ok) {
        if (res.status === 404) {
          setError('Automatización no encontrada');
        } else {
          const data = await res.json();
          setError(data.error || 'Error al cargar la automatización');
        }
        return;
      }

      const data = await res.json();
      setAutomation(data);
    } catch (e: any) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando automatización...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Link
              href="/marketing/automations"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Volver a automatizaciones
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AutomationEditor
        automationId={id}
        initialData={automation}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LandingPageEditor from '@/components/landing-pages/LandingPageEditor';

export default function EditLandingPage() {
  const params = useParams();
  const router = useRouter();
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/marketing/landing-pages/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Landing page no encontrada');
          } else {
            setError('Error al cargar la landing page');
          }
          return;
        }

        const data = await res.json();
        setPageData({
          name: data.name,
          slug: data.slug,
          title: data.title,
          description: data.description || '',
          sections: data.content?.sections || [],
          globalStyles: data.content?.globalStyles || {
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            backgroundColor: '#ffffff',
            textColor: '#1F2937',
            fontFamily: 'Inter, system-ui, sans-serif',
            containerWidth: 1200,
            borderRadius: 8,
          },
          formId: data.formId,
          keywords: data.keywords || [],
          ogTitle: data.ogTitle || '',
          ogDescription: data.ogDescription || '',
          ogImage: data.ogImage || '',
          favicon: data.favicon || '',
          scripts: data.scripts || {},
          abTest: data.abTest,
        });
      } catch (e) {
        setError('Error de conexion');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPage();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-500 text-lg">{error}</div>
        <button
          onClick={() => router.push('/marketing/landing-pages')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Volver a Landing Pages
        </button>
      </div>
    );
  }

  return (
    <LandingPageEditor
      pageId={params.id as string}
      initialData={pageData}
    />
  );
}

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import SectionRenderer from '@/components/landing-pages/sections/SectionRenderer';
import { ILandingSection, ILandingGlobalStyles } from '@/models/LandingPage';
import { AlertTriangle, Eye } from 'lucide-react';

interface PreviewData {
  pageId: string;
  sections: ILandingSection[];
  globalStyles: ILandingGlobalStyles;
  title?: string;
  createdAt: number;
  expiresAt: number;
}

function PreviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const previewData = useMemo<PreviewData | null>(() => {
    if (!token) return null;

    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }, [token]);

  if (!token || !previewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Preview no disponible</h1>
          <p className="text-gray-600">
            El enlace de preview es inválido o ha expirado. Genera uno nuevo desde el editor.
          </p>
        </div>
      </div>
    );
  }

  // Check if preview has expired
  if (Date.now() > previewData.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Preview expirado</h1>
          <p className="text-gray-600">
            Este preview ha expirado. Genera uno nuevo desde el editor de landing pages.
          </p>
        </div>
      </div>
    );
  }

  const { sections, globalStyles, title } = previewData;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: globalStyles.backgroundColor || '#ffffff',
        color: globalStyles.textColor || '#1F2937',
        fontFamily: globalStyles.fontFamily || 'Inter, system-ui, sans-serif',
        '--primary-color': globalStyles.primaryColor || '#3B82F6',
        '--secondary-color': globalStyles.secondaryColor || '#10B981',
        '--border-radius': `${globalStyles.borderRadius || 8}px`,
        '--container-width': `${globalStyles.containerWidth || 1200}px`,
      } as React.CSSProperties}
    >
      {/* Preview Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
          <Eye className="w-4 h-4" />
          <span>MODO PREVIEW</span>
          {title && <span className="mx-2">-</span>}
          {title && <span className="font-normal">{title}</span>}
          <span className="ml-4 text-yellow-700 font-normal">
            Esta página no está publicada
          </span>
        </div>
      </div>

      {/* Page Content with top padding for banner */}
      <div className="pt-10">
        {sections.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-gray-400">
            <div className="text-center">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Sin contenido</p>
              <p className="text-sm">Agrega secciones desde el editor</p>
            </div>
          </div>
        ) : (
          sections.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              globalStyles={globalStyles}
              isEditing={false}
            />
          ))
        )}
      </div>

      <style jsx global>{`
        :root {
          --primary-color: ${globalStyles.primaryColor || '#3B82F6'};
          --secondary-color: ${globalStyles.secondaryColor || '#10B981'};
          --border-radius: ${globalStyles.borderRadius || 8}px;
          --container-width: ${globalStyles.containerWidth || 1200}px;
        }
      `}</style>
    </div>
  );
}

function PreviewLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando preview...</p>
      </div>
    </div>
  );
}

export default function LandingPagePreview() {
  return (
    <Suspense fallback={<PreviewLoading />}>
      <PreviewContent />
    </Suspense>
  );
}

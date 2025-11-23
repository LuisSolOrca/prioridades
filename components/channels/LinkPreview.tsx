'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface LinkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

interface LinkPreviewProps {
  url: string;
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch metadata');
        }

        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error('Error fetching link preview:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (loading) {
    return (
      <div className="my-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900 animate-pulse">
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
          <div className="w-20 h-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    // Mostrar link simple sin preview
    return null;
  }

  // Si no hay suficiente metadata, no mostrar preview
  if (!metadata.title && !metadata.description && !metadata.image) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-600 transition group"
    >
      <div className="flex bg-white dark:bg-gray-800">
        {/* Contenido */}
        <div className="flex-1 p-3">
          {/* Título */}
          {metadata.title && (
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
              {metadata.title}
            </h4>
          )}

          {/* Descripción */}
          {metadata.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
              {metadata.description}
            </p>
          )}

          {/* Footer con favicon y nombre del sitio */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            {metadata.favicon && (
              <img
                src={metadata.favicon}
                alt="favicon"
                className="w-4 h-4 rounded"
                onError={(e) => {
                  // Ocultar si falla la carga del favicon
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="truncate">
              {metadata.siteName || new URL(url).hostname}
            </span>
            <ExternalLink size={12} className="flex-shrink-0" />
          </div>
        </div>

        {/* Imagen */}
        {metadata.image && (
          <div className="w-24 sm:w-32 flex-shrink-0 bg-gray-100 dark:bg-gray-900">
            <img
              src={metadata.image}
              alt={metadata.title || 'Link preview'}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Ocultar contenedor si falla la carga de la imagen
                e.currentTarget.parentElement!.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </a>
  );
}

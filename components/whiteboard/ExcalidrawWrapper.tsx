'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamic import of Excalidraw to avoid SSR issues
// Excalidraw uses browser-only APIs (canvas, window)
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-gray-500 dark:text-gray-400">Cargando pizarra...</span>
        </div>
      </div>
    ),
  }
);

export default Excalidraw;

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getPusherClient } from '@/lib/pusher-client';

// Importar CSS de Excalidraw
import '@excalidraw/excalidraw/index.css';
import {
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  Users,
  ArrowLeft,
  ExternalLink,
  X
} from 'lucide-react';
// Type will be inferred from the API callback
type ExcalidrawAPI = any;

// Dynamic import of Excalidraw
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
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

interface WhiteboardCanvasProps {
  whiteboardId: string;
  projectId?: string;
}

interface WhiteboardData {
  _id: string;
  title: string;
  elements: any[];
  appState: any;
  files: { [key: string]: any };
  libraryItems: any[];
  version: number;
  projectId: string;
  channelId: string;
  createdBy: { _id: string; name: string; email: string };
  collaborators: any[];
}

export default function WhiteboardCanvas({ whiteboardId, projectId }: WhiteboardCanvasProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const librarySaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReadyToSaveRef = useRef(false);
  const lastSavedElementsRef = useRef<string>('');
  const lastSavedLibraryRef = useRef<string>('');
  const localVersionRef = useRef(0);

  const [whiteboard, setWhiteboard] = useState<WhiteboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [localVersion, setLocalVersion] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isUpdatingFromRemote, setIsUpdatingFromRemote] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [pendingLibraryUrl, setPendingLibraryUrl] = useState<string | null>(null);
  const [excalidrawReady, setExcalidrawReady] = useState(false);

  // Manejar importación de librería desde URL hash (#addLibrary=...)
  useEffect(() => {
    const handleLibraryFromHash = () => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash;
      if (!hash.includes('addLibrary=')) return;

      const params = new URLSearchParams(hash.slice(1));
      const libraryUrl = params.get('addLibrary');

      if (libraryUrl) {
        console.log('Library URL detected:', libraryUrl);
        setPendingLibraryUrl(decodeURIComponent(libraryUrl));
        // Limpiar el hash para evitar re-importaciones
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    handleLibraryFromHash();
    window.addEventListener('hashchange', handleLibraryFromHash);
    return () => window.removeEventListener('hashchange', handleLibraryFromHash);
  }, []);

  // Importar librería pendiente cuando Excalidraw esté listo
  useEffect(() => {
    const importLibrary = async () => {
      if (!pendingLibraryUrl || !excalidrawReady || !excalidrawAPIRef.current) return;

      try {
        console.log('Fetching library from:', pendingLibraryUrl);
        const response = await fetch(pendingLibraryUrl);
        if (!response.ok) throw new Error('Failed to fetch library');

        const libraryData = await response.json();
        console.log('Library data:', libraryData);

        // Extraer los items de la librería
        const libraryItems = libraryData.libraryItems || libraryData.library || [];

        if (libraryItems.length > 0) {
          // Usar updateLibrary para agregar items a la librería
          await excalidrawAPIRef.current.updateLibrary({
            libraryItems: libraryItems,
            merge: true, // Merge con librería existente
            openLibraryMenu: true // Abrir el menú de librería
          });

          console.log('Library updated successfully with', libraryItems.length, 'items');
          alert(`Librería importada: ${libraryItems.length} elementos agregados`);
        } else {
          console.log('No library items found in response');
        }
      } catch (err) {
        console.error('Error importing library:', err);
        alert('Error al importar la librería. Intenta de nuevo.');
      } finally {
        setPendingLibraryUrl(null);
      }
    };

    importLibrary();
  }, [pendingLibraryUrl, excalidrawReady]);

  // Cargar librería guardada después de que Excalidraw esté listo
  useEffect(() => {
    if (!whiteboard || !excalidrawReady || !excalidrawAPIRef.current) return;

    const loadSavedLibrary = async () => {
      const savedLibrary = whiteboard.libraryItems || [];
      if (savedLibrary.length > 0) {
        console.log('Loading saved library with', savedLibrary.length, 'items');
        try {
          await excalidrawAPIRef.current.updateLibrary({
            libraryItems: savedLibrary,
            merge: false // Reemplazar, no merge
          });
          console.log('Saved library loaded successfully');
        } catch (err) {
          console.error('Error loading saved library:', err);
        }
      }
    };

    loadSavedLibrary();
  }, [whiteboard, excalidrawReady]);

  // Detectar tema
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    // Observer para cambios de tema
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Load whiteboard data
  useEffect(() => {
    const loadWhiteboard = async () => {
      try {
        setLoading(true);

        // First try to get projectId from the whiteboard if not provided
        let fetchUrl = '';
        if (projectId) {
          fetchUrl = `/api/projects/${projectId}/whiteboards/${whiteboardId}`;
        } else {
          // Need to fetch whiteboard to get projectId
          const searchRes = await fetch(`/api/whiteboards/${whiteboardId}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            fetchUrl = `/api/projects/${searchData.whiteboard.projectId}/whiteboards/${whiteboardId}`;
          } else {
            throw new Error('No se pudo encontrar la pizarra');
          }
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error('Error cargando pizarra');
        }

        const data = await response.json();
        setWhiteboard(data.whiteboard);
        setLocalVersion(data.whiteboard.version);

        // Inicializar el hash de elementos para evitar guardados innecesarios
        const initialElements = data.whiteboard.elements || [];
        lastSavedElementsRef.current = JSON.stringify(
          initialElements.map((el: any) => ({
            id: el.id,
            type: el.type,
            x: Math.round(el.x),
            y: Math.round(el.y),
            width: el.width ? Math.round(el.width) : undefined,
            height: el.height ? Math.round(el.height) : undefined,
            points: el.points,
            text: el.text,
            isDeleted: el.isDeleted
          }))
        );

        // Inicializar hash de librería
        const initialLibrary = data.whiteboard.libraryItems || [];
        lastSavedLibraryRef.current = JSON.stringify(initialLibrary);

        // Marcar como listo para guardar después de un delay
        // para evitar guardados durante la inicialización de Excalidraw
        setTimeout(() => {
          isReadyToSaveRef.current = true;
        }, 1500);
      } catch (err: any) {
        console.error('Error loading whiteboard:', err);
        setError(err.message || 'Error cargando pizarra');
      } finally {
        setLoading(false);
      }
    };

    if (whiteboardId && status === 'authenticated') {
      loadWhiteboard();
    }
  }, [whiteboardId, projectId, status]);

  // Mantener ref sincronizada con el estado
  useEffect(() => {
    localVersionRef.current = localVersion;
  }, [localVersion]);

  // Subscribe to Pusher for real-time updates
  useEffect(() => {
    if (!whiteboard || !session) return;

    const pusher = getPusherClient();
    const channelName = `presence-whiteboard-${whiteboardId}`;
    console.log('Subscribing to Pusher channel:', channelName);
    const channel = pusher.subscribe(channelName);

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('Pusher subscription error:', error);
    });

    // Handle elements update from other users
    channel.bind('elements-updated', (data: any) => {
      console.log('Received Pusher update:', data.updatedBy, 'version:', data.version);

      if (data.updatedBy === (session.user as any).id) {
        // Ignore our own updates
        return;
      }

      // Usar la ref para tener el valor actual
      if (data.version > localVersionRef.current) {
        console.log('Applying remote update, version:', data.version);
        setIsUpdatingFromRemote(true);
        setLocalVersion(data.version);

        // Update Excalidraw scene
        if (excalidrawAPIRef.current) {
          excalidrawAPIRef.current.updateScene({
            elements: data.elements,
            appState: data.appState
          });

          // Actualizar el hash de elementos para evitar re-guardado
          lastSavedElementsRef.current = JSON.stringify(
            data.elements.map((el: any) => ({
              id: el.id,
              type: el.type,
              x: Math.round(el.x),
              y: Math.round(el.y),
              width: el.width ? Math.round(el.width) : undefined,
              height: el.height ? Math.round(el.height) : undefined,
              points: el.points,
              text: el.text,
              isDeleted: el.isDeleted
            }))
          );
        }

        setTimeout(() => setIsUpdatingFromRemote(false), 100);
      }
    });

    // Handle presence
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      console.log('Successfully subscribed to:', channelName, 'Members:', members.count);
      const userNames: string[] = [];
      members.each((member: any) => {
        if (member.id !== (session.user as any).id) {
          userNames.push(member.info.name);
        }
      });
      setOnlineUsers(userNames);
    });

    channel.bind('pusher:member_added', (member: any) => {
      if (member.id !== (session.user as any).id) {
        setOnlineUsers(prev => [...prev, member.info.name]);
      }
    });

    channel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers(prev => prev.filter(name => name !== member.info.name));
    });

    return () => {
      console.log('Unsubscribing from Pusher channel:', channelName);
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [whiteboard, whiteboardId, session]); // Removido localVersion - usamos ref

  // Save elements to server with debounce
  const saveElements = useCallback(async (elements: any[], appState: any, files: any) => {
    // No guardar si no está listo o hay actualización remota en progreso
    if (!whiteboard || !isReadyToSaveRef.current || isUpdatingFromRemote) return;

    setSaveStatus('saving');

    try {
      // Filtrar y serializar files de forma segura
      const safeFiles: { [key: string]: any } = {};
      if (files && typeof files === 'object') {
        Object.keys(files).forEach(key => {
          const file = files[key];
          if (file && file.dataURL) {
            safeFiles[key] = {
              id: file.id,
              mimeType: file.mimeType,
              dataURL: file.dataURL,
              created: file.created
            };
          }
        });
      }

      const response = await fetch(
        `/api/projects/${whiteboard.projectId}/whiteboards/${whiteboardId}/elements`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elements,
            appState: {
              viewBackgroundColor: appState?.viewBackgroundColor || '#ffffff',
              currentItemFontFamily: appState?.currentItemFontFamily || 1,
              zoom: appState?.zoom || { value: 1 },
              scrollX: appState?.scrollX || 0,
              scrollY: appState?.scrollY || 0
            },
            files: safeFiles,
            version: localVersion
          })
        }
      );

      if (response.status === 409) {
        // Version conflict - need to sync
        const conflictData = await response.json();
        setLocalVersion(conflictData.currentVersion);

        if (excalidrawAPIRef.current) {
          excalidrawAPIRef.current.updateScene({
            elements: conflictData.currentElements,
            appState: conflictData.currentAppState
          });
        }

        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Save error response:', response.status, errorData);
        throw new Error(errorData.error || 'Error guardando');
      }

      const data = await response.json();
      setLocalVersion(data.version);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      console.error('Error saving whiteboard:', err);
      setSaveStatus('error');
      // Mostrar el error más tiempo para que el usuario lo vea
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  }, [whiteboard, whiteboardId, localVersion, isUpdatingFromRemote]);

  // Handle Excalidraw changes with debounce
  const handleChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    if (isUpdatingFromRemote) return;

    // Crear hash simple de los elementos para comparar
    // Solo consideramos id, type, x, y, width, height, points y texto para detectar cambios reales
    const elementsHash = JSON.stringify(
      elements.map(el => ({
        id: el.id,
        type: el.type,
        x: Math.round(el.x),
        y: Math.round(el.y),
        width: el.width ? Math.round(el.width) : undefined,
        height: el.height ? Math.round(el.height) : undefined,
        points: el.points,
        text: el.text,
        isDeleted: el.isDeleted
      }))
    );

    // Solo guardar si los elementos realmente cambiaron
    if (elementsHash === lastSavedElementsRef.current) {
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save (1 segundo para reducir guardados frecuentes)
    saveTimeoutRef.current = setTimeout(() => {
      lastSavedElementsRef.current = elementsHash;
      saveElements([...elements], appState, files);
    }, 1000);
  }, [saveElements, isUpdatingFromRemote]);

  // Guardar librería cuando cambia
  const saveLibrary = useCallback(async (libraryItems: any[]) => {
    if (!whiteboard || !isReadyToSaveRef.current) return;

    try {
      const response = await fetch(
        `/api/projects/${whiteboard.projectId}/whiteboards/${whiteboardId}/elements`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            libraryItems,
            version: localVersion
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLocalVersion(data.version);
        console.log('Library saved successfully');
      }
    } catch (err) {
      console.error('Error saving library:', err);
    }
  }, [whiteboard, whiteboardId, localVersion]);

  // Handle library changes
  const handleLibraryChange = useCallback((items: readonly any[]) => {
    if (!isReadyToSaveRef.current) return;

    const itemsArray = [...items]; // Convert readonly to mutable
    const libraryHash = JSON.stringify(itemsArray);
    if (libraryHash === lastSavedLibraryRef.current) return;

    // Clear previous timeout
    if (librarySaveTimeoutRef.current) {
      clearTimeout(librarySaveTimeoutRef.current);
    }

    // Debounce save (2 segundos para librería)
    librarySaveTimeoutRef.current = setTimeout(() => {
      lastSavedLibraryRef.current = libraryHash;
      saveLibrary(itemsArray);
    }, 2000);
  }, [saveLibrary]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (librarySaveTimeoutRef.current) {
        clearTimeout(librarySaveTimeoutRef.current);
      }
    };
  }, []);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <span className="text-gray-600 dark:text-gray-400">Cargando pizarra...</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!whiteboard) {
    return null;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Si la pestaña fue abierta desde otra página, cerrarla
              // Si no, navegar hacia atrás
              if (window.opener || window.history.length <= 1) {
                window.close();
              } else {
                router.back();
              }
            }}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Cerrar"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="font-semibold text-gray-800 dark:text-gray-100">
              {whiteboard.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Creado por {whiteboard.createdBy?.name || 'Usuario'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Online users */}
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users size={16} />
              <span>{onlineUsers.length} en línea</span>
            </div>
          )}

          {/* Save status */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                <span className="text-sm text-gray-500">Guardando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-sm text-green-600">Guardado</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-sm text-red-600">Error al guardar</span>
              </>
            )}
            {saveStatus === 'idle' && (
              <>
                <Save size={16} className="text-gray-400" />
                <span className="text-sm text-gray-400">Auto-guardado</span>
              </>
            )}
          </div>

          {/* Open in new tab */}
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink size={18} />
          </button>
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 60px)' }}>
        <Excalidraw
          excalidrawAPI={(api) => {
            excalidrawAPIRef.current = api;
            // Marcar como listo después de un pequeño delay para asegurar inicialización completa
            setTimeout(() => setExcalidrawReady(true), 100);
          }}
          initialData={{
            elements: whiteboard.elements || [],
            appState: {
              viewBackgroundColor: whiteboard.appState?.viewBackgroundColor || '#ffffff',
              currentItemFontFamily: whiteboard.appState?.currentItemFontFamily || 1,
              zoom: whiteboard.appState?.zoom || { value: 1 },
              scrollX: whiteboard.appState?.scrollX || 0,
              scrollY: whiteboard.appState?.scrollY || 0,
              collaborators: new Map()
            },
            files: whiteboard.files || {},
            libraryItems: whiteboard.libraryItems || []
          }}
          onChange={handleChange}
          onLibraryChange={handleLibraryChange}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              export: { saveFileToDisk: true }
            }
          }}
          libraryReturnUrl={typeof window !== 'undefined' ? window.location.href : ''}
          langCode="es-ES"
          theme={theme}
        />
      </div>
    </div>
  );
}

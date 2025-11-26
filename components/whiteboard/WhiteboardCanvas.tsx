'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getPusherClient } from '@/lib/pusher-client';
import {
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  Users,
  ArrowLeft,
  ExternalLink
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

  const [whiteboard, setWhiteboard] = useState<WhiteboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [localVersion, setLocalVersion] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isUpdatingFromRemote, setIsUpdatingFromRemote] = useState(false);

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

  // Subscribe to Pusher for real-time updates
  useEffect(() => {
    if (!whiteboard || !session) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`presence-whiteboard-${whiteboardId}`);

    // Handle elements update from other users
    channel.bind('elements-updated', (data: any) => {
      if (data.updatedBy === (session.user as any).id) {
        // Ignore our own updates
        return;
      }

      if (data.version > localVersion) {
        setIsUpdatingFromRemote(true);
        setLocalVersion(data.version);

        // Update Excalidraw scene
        if (excalidrawAPIRef.current) {
          excalidrawAPIRef.current.updateScene({
            elements: data.elements,
            appState: data.appState
          });
        }

        setTimeout(() => setIsUpdatingFromRemote(false), 100);
      }
    });

    // Handle presence
    channel.bind('pusher:subscription_succeeded', (members: any) => {
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
      channel.unbind_all();
      pusher.unsubscribe(`presence-whiteboard-${whiteboardId}`);
    };
  }, [whiteboard, whiteboardId, session, localVersion]);

  // Save elements to server with debounce
  const saveElements = useCallback(async (elements: any[], appState: any, files: any) => {
    if (!whiteboard || isUpdatingFromRemote) return;

    setSaveStatus('saving');

    try {
      const response = await fetch(
        `/api/projects/${whiteboard.projectId}/whiteboards/${whiteboardId}/elements`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              currentItemFontFamily: appState.currentItemFontFamily,
              zoom: appState.zoom,
              scrollX: appState.scrollX,
              scrollY: appState.scrollY
            },
            files,
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
        throw new Error('Error guardando');
      }

      const data = await response.json();
      setLocalVersion(data.version);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Error saving whiteboard:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [whiteboard, whiteboardId, localVersion, isUpdatingFromRemote]);

  // Handle Excalidraw changes with debounce
  const handleChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    if (isUpdatingFromRemote) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save (500ms)
    saveTimeoutRef.current = setTimeout(() => {
      saveElements([...elements], appState, files);
    }, 500);
  }, [saveElements, isUpdatingFromRemote]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
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
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Volver"
          >
            <ArrowLeft size={20} />
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
      <div className="flex-1 relative">
        <Excalidraw
          excalidrawAPI={(api) => {
            excalidrawAPIRef.current = api;
          }}
          initialData={{
            elements: whiteboard.elements || [],
            appState: {
              ...whiteboard.appState,
              collaborators: new Map()
            },
            files: whiteboard.files || {}
          }}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: { saveFileToDisk: true }
            }
          }}
          langCode="es-ES"
        />
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  PenTool,
  Plus,
  ExternalLink,
  Trash2,
  Loader2,
  Search,
  Users,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Whiteboard {
  _id: string;
  title: string;
  projectId: string;
  channelId: string;
  createdBy: { _id: string; name: string; email: string };
  lastModifiedBy?: { _id: string; name: string; email: string };
  collaborators: any[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface WhiteboardManagerProps {
  projectId: string;
  channelId?: string;
}

export default function WhiteboardManager({ projectId, channelId }: WhiteboardManagerProps) {
  const { data: session } = useSession();
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadWhiteboards();
  }, [projectId, channelId]);

  const loadWhiteboards = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/projects/${projectId}/whiteboards`;
      if (channelId) {
        url += `?channelId=${channelId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error cargando pizarras');
      }

      const data = await response.json();
      setWhiteboards(data.whiteboards || []);
    } catch (err: any) {
      console.error('Error loading whiteboards:', err);
      setError(err.message || 'Error cargando pizarras');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || creating) return;

    try {
      setCreating(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/whiteboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          channelId: channelId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error creando pizarra');
      }

      const data = await response.json();
      setWhiteboards(prev => [data.whiteboard, ...prev]);
      setNewTitle('');
      setShowCreateModal(false);

      // Open the new whiteboard in a new tab
      window.open(`/whiteboard/${data.whiteboard._id}`, '_blank');
    } catch (err: any) {
      console.error('Error creating whiteboard:', err);
      setError(err.message || 'Error creando pizarra');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (whiteboardId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta pizarra? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeleting(whiteboardId);

      const response = await fetch(
        `/api/projects/${projectId}/whiteboards/${whiteboardId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error eliminando pizarra');
      }

      setWhiteboards(prev => prev.filter(wb => wb._id !== whiteboardId));
    } catch (err: any) {
      console.error('Error deleting whiteboard:', err);
      alert(err.message || 'Error eliminando pizarra');
    } finally {
      setDeleting(null);
    }
  };

  const filteredWhiteboards = whiteboards.filter(wb =>
    wb.title.toLowerCase().includes(search.toLowerCase()) ||
    wb.createdBy?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const canDelete = (wb: Whiteboard) => {
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;
    return wb.createdBy?._id === userId || userRole === 'ADMIN';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-gray-500 dark:text-gray-400">Cargando pizarras...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <PenTool className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Pizarras
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {whiteboards.length} {whiteboards.length === 1 ? 'pizarra' : 'pizarras'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={18} />
          Nueva Pizarra
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pizarras..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Whiteboards grid */}
      {filteredWhiteboards.length === 0 ? (
        <div className="text-center py-12">
          <PenTool className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
            {search ? 'No se encontraron pizarras' : 'No hay pizarras aún'}
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-4">
            {search
              ? 'Intenta con otro término de búsqueda'
              : 'Crea una nueva pizarra para comenzar a colaborar'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
            >
              <Plus size={18} />
              Crear primera pizarra
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWhiteboards.map((wb) => (
            <div
              key={wb._id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow group"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-lg flex items-center justify-center">
                    <PenTool className="text-indigo-600 dark:text-indigo-400" size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {wb.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Users size={12} />
                      {wb.createdBy?.name || 'Usuario'}
                    </p>
                  </div>
                </div>

                {/* Delete button */}
                {canDelete(wb) && (
                  <button
                    onClick={() => handleDelete(wb._id)}
                    disabled={deleting === wb._id}
                    className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar"
                  >
                    {deleting === wb._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(wb.updatedAt)}
                </span>
                <span>v{wb.version}</span>
              </div>

              {/* Open button */}
              <Link
                href={`/whiteboard/${wb._id}`}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium transition"
              >
                <ExternalLink size={16} />
                Abrir
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Nueva Pizarra
            </h3>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título de la pizarra"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTitle('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || creating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                {creating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Crear
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

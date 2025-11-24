'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, File, Image, Video, Music, FileText, Archive } from 'lucide-react';

interface AttachmentCardProps {
  attachment: {
    _id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    uploadedBy: {
      _id: string;
      name: string;
      email: string;
    };
    uploadedAt: string;
  };
  projectId?: string; // Opcional para soportar attachments de comentarios de prioridades
  priorityId?: string; // Opcional para attachments de prioridades
  onDelete?: () => void;
  showDelete?: boolean;
  compact?: boolean;
  showPreview?: boolean;
}

export default function AttachmentCard({
  attachment,
  projectId,
  onDelete,
  showDelete = true,
  compact = false,
  showPreview = true
}: AttachmentCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isImage = attachment.mimeType.startsWith('image/');

  // Cargar imagen si es una imagen y showPreview está habilitado
  useEffect(() => {
    if (!isImage || !showPreview) return;

    const loadImage = async () => {
      try {
        setImageLoading(true);
        setImageError(false);

        // Usar endpoint genérico si no hay projectId
        const url = projectId
          ? `/api/projects/${projectId}/attachments/${attachment._id}`
          : `/api/attachments/${attachment._id}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error loading image');

        const data = await response.json();
        setImageUrl(data.downloadUrl);
      } catch (error) {
        console.error('Error loading image:', error);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    loadImage();
  }, [attachment._id, projectId, isImage, showPreview]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video size={20} className="text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music size={20} className="text-pink-500" />;
    if (mimeType.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return <Archive size={20} className="text-yellow-500" />;
    return <File size={20} className="text-gray-500" />;
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);

      // Obtener URL firmada - usar endpoint genérico si no hay projectId
      const url = projectId
        ? `/api/projects/${projectId}/attachments/${attachment._id}`
        : `/api/attachments/${attachment._id}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al obtener URL de descarga');

      const data = await response.json();

      // Abrir en nueva pestaña
      window.open(data.downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error al abrir el archivo');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return;

    // No permitir delete si no hay projectId (attachments de comentarios no son eliminables por ahora)
    if (!projectId) {
      alert('No se pueden eliminar archivos de comentarios');
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`/api/projects/${projectId}/attachments/${attachment._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Error al eliminar archivo');

      onDelete?.();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error al eliminar el archivo');
    } finally {
      setDeleting(false);
    }
  };

  if (compact) {
    return (
      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition group">
        {/* Preview de imagen (solo si showPreview está habilitado) */}
        {showPreview && isImage && imageUrl && !imageError && (
          <div className="mb-2 relative group/image">
            <img
              src={imageUrl}
              alt={attachment.originalName}
              className="max-w-full max-h-80 rounded cursor-pointer object-contain"
              onClick={() => window.open(imageUrl, '_blank')}
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition flex gap-1">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="p-2 bg-black/50 hover:bg-black/70 text-white rounded backdrop-blur-sm transition"
                title="Abrir en nueva pestaña"
              >
                <Download size={16} />
              </button>
              {showDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 bg-black/50 hover:bg-black/70 text-white rounded backdrop-blur-sm transition"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading state para imagen */}
        {showPreview && isImage && imageLoading && (
          <div className="mb-2 h-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando imagen...</p>
          </div>
        )}

        {/* Error state para imagen */}
        {showPreview && isImage && imageError && (
          <div className="mb-2 p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">Error al cargar imagen</p>
          </div>
        )}

        {/* Info del archivo */}
        <div className="flex items-center gap-2">
          {getFileIcon(attachment.mimeType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {attachment.originalName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
          {(!isImage || !showPreview) && (
            <>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                title="Abrir en nueva pestaña"
              >
                <Download size={16} />
              </button>
              {showDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition group">
      {/* Preview de imagen (solo si showPreview está habilitado) */}
      {showPreview && isImage && imageUrl && !imageError && (
        <div className="mb-3 relative group/image">
          <img
            src={imageUrl}
            alt={attachment.originalName}
            className="max-w-full max-h-96 rounded cursor-pointer object-contain mx-auto"
            onClick={() => window.open(imageUrl, '_blank')}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition flex gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 bg-black/60 hover:bg-black/80 text-white rounded backdrop-blur-sm transition"
              title="Abrir en nueva pestaña"
            >
              <Download size={18} />
            </button>
            {showDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded backdrop-blur-sm transition"
                title="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading state para imagen */}
      {showPreview && isImage && imageLoading && (
        <div className="mb-3 h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando imagen...</p>
        </div>
      )}

      {/* Error state para imagen */}
      {showPreview && isImage && imageError && (
        <div className="mb-3 p-8 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">Error al cargar imagen</p>
        </div>
      )}

      {/* Info del archivo */}
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {getFileIcon(attachment.mimeType)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {attachment.originalName}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatFileSize(attachment.fileSize)} • Subido por {attachment.uploadedBy.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(attachment.uploadedAt).toLocaleString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        {(!isImage || !showPreview) && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
              title="Abrir en nueva pestaña"
            >
              <Download size={18} />
            </button>
            {showDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                title="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

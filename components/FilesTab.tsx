'use client';

import { useState, useEffect } from 'react';
import { Files, Search, Filter, ChevronDown } from 'lucide-react';
import FileUpload from './FileUpload';
import AttachmentCard from './AttachmentCard';

interface FilesTabProps {
  projectId: string;
}

export default function FilesTab({ projectId }: FilesTabProps) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/attachments?page=${page}&limit=20`);
      if (!response.ok) throw new Error('Error al cargar archivos');

      const data = await response.json();
      setAttachments(data.attachments);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [projectId, page]);

  const handleUploadSuccess = () => {
    // Recargar lista
    setPage(1);
    loadAttachments();
  };

  const handleDelete = () => {
    loadAttachments();
  };

  // Filtrar archivos por búsqueda y tipo
  const filteredAttachments = attachments.filter((att) => {
    const matchesSearch = att.originalName.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'images') return matchesSearch && att.mimeType.startsWith('image/');
    if (filterType === 'documents') return matchesSearch && (att.mimeType.includes('pdf') || att.mimeType.includes('document'));
    if (filterType === 'videos') return matchesSearch && att.mimeType.startsWith('video/');
    if (filterType === 'audio') return matchesSearch && att.mimeType.startsWith('audio/');
    return matchesSearch;
  });

  const getTypeCount = (type: string) => {
    if (type === 'all') return attachments.length;
    if (type === 'images') return attachments.filter(a => a.mimeType.startsWith('image/')).length;
    if (type === 'documents') return attachments.filter(a => a.mimeType.includes('pdf') || a.mimeType.includes('document')).length;
    if (type === 'videos') return attachments.filter(a => a.mimeType.startsWith('video/')).length;
    if (type === 'audio') return attachments.filter(a => a.mimeType.startsWith('audio/')).length;
    return 0;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Files size={24} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Archivos del Proyecto
          </h2>
        </div>

        {/* Upload */}
        <FileUpload
          projectId={projectId}
          onUploadSuccess={handleUploadSuccess}
          className="mb-4"
        />

        {/* Búsqueda */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar archivos..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Filtro por tipo */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              <option value="all">Todos ({getTypeCount('all')})</option>
              <option value="images">Imágenes ({getTypeCount('images')})</option>
              <option value="documents">Documentos ({getTypeCount('documents')})</option>
              <option value="videos">Videos ({getTypeCount('videos')})</option>
              <option value="audio">Audio ({getTypeCount('audio')})</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>
        </div>
      </div>

      {/* Lista de archivos */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAttachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Files size={48} className="mb-4 opacity-50" />
            <p className="text-lg">
              {searchTerm || filterType !== 'all' ? 'No se encontraron archivos' : 'No hay archivos en este proyecto'}
            </p>
            <p className="text-sm">
              {!searchTerm && filterType === 'all' && 'Sube tu primer archivo usando el botón de arriba'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredAttachments.map((attachment) => (
              <AttachmentCard
                key={attachment._id}
                attachment={attachment}
                projectId={projectId}
                onDelete={handleDelete}
                showPreview={false}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

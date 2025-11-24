'use client';

import { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';

interface CommentFileUploadProps {
  priorityId: string;
  onUploadSuccess?: (attachment: any) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  className?: string;
}

export default function CommentFileUpload({
  priorityId,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 50,
  className = ''
}: CommentFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validar tamaño de cada archivo
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const invalidFiles = files.filter(file => file.size > maxSizeBytes);

    if (invalidFiles.length > 0) {
      setError(`Algunos archivos exceden el tamaño máximo permitido (${maxSizeMB}MB)`);
      onUploadError?.(error!);
      return;
    }

    setError(null);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const uploadedAttachments = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('priorityId', priorityId);

        const response = await fetch(`/api/comments/attachments`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al subir archivo');
        }

        const data = await response.json();
        uploadedAttachments.push(data.attachment);

        // Actualizar progreso
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      // Notificar todos los archivos subidos
      uploadedAttachments.forEach(attachment => {
        onUploadSuccess?.(attachment);
      });

      // Limpiar
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error uploading files:', err);
      setError(err.message || 'Error al subir archivos');
      onUploadError?.(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Input de archivo */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          multiple
          className="hidden"
          id={`comment-file-upload-${priorityId}`}
        />
        <label
          htmlFor={`comment-file-upload-${priorityId}`}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition text-sm ${
            uploading
              ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Upload size={16} />
          <span>Adjuntar archivos</span>
        </label>

        {selectedFiles.length > 0 && !uploading && (
          <button
            onClick={handleUploadAll}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Subir ({selectedFiles.length})
          </button>
        )}

        {selectedFiles.length > 0 && !uploading && (
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition text-sm"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Lista de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <File size={16} className="text-gray-600 dark:text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {!uploading && (
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Barra de progreso */}
      {uploading && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Subiendo archivos... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  projectId: string;
  channelId?: string;
  messageId?: string;
  onUploadSuccess?: (attachment: any) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

export default function FileUpload({
  projectId,
  channelId,
  messageId,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 50,
  accept,
  className = ''
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`);
      setSelectedFile(null);
      onUploadError?.(error!);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      if (channelId) formData.append('channelId', channelId);
      if (messageId) formData.append('messageId', messageId);

      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al subir archivo');
      }

      const data = await response.json();
      setUploadProgress(100);

      // Limpiar
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadSuccess?.(data.attachment);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Error al subir archivo');
      onUploadError?.(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
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
          accept={accept}
          disabled={uploading}
          className="hidden"
          id={`file-upload-${projectId}`}
        />
        <label
          htmlFor={`file-upload-${projectId}`}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${
            uploading
              ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Upload size={18} />
          <span className="text-sm">Adjuntar archivo</span>
        </label>

        {selectedFile && !uploading && (
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Subir
          </button>
        )}
      </div>

      {/* Vista previa del archivo seleccionado */}
      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <File size={20} className="text-gray-600 dark:text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          {!uploading && (
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Barra de progreso */}
      {uploading && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Plus, ExternalLink, Trash2, X, Check } from 'lucide-react';

export interface EvidenceLink {
  _id?: string;
  title: string;
  url: string;
  createdAt?: string;
}

interface EvidenceLinksManagerProps {
  evidenceLinks: EvidenceLink[];
  onChange: (evidenceLinks: EvidenceLink[]) => void;
  disabled?: boolean;
}

export default function EvidenceLinksManager({ evidenceLinks, onChange, disabled = false }: EvidenceLinksManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      // Validar longitud del título
      if (newLinkTitle.trim().length > 200) {
        setUrlError('El título no puede exceder 200 caracteres');
        return;
      }

      // Agregar https:// si no tiene protocolo
      let finalUrl = newLinkUrl.trim();
      if (!finalUrl.match(/^https?:\/\//i)) {
        finalUrl = 'https://' + finalUrl;
      }

      // Validar longitud de la URL
      if (finalUrl.length > 2000) {
        setUrlError('La URL no puede exceder 2000 caracteres');
        return;
      }

      const newLink: EvidenceLink = {
        title: newLinkTitle.trim(),
        url: finalUrl,
        createdAt: new Date().toISOString()
      };
      onChange([...evidenceLinks, newLink]);
      setNewLinkTitle('');
      setNewLinkUrl('');
      setUrlError('');
      setIsAdding(false);
    }
  };

  const handleDeleteLink = (index: number) => {
    const updatedLinks = evidenceLinks.filter((_, i) => i !== index);
    onChange(updatedLinks);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
          <span>🔗 Enlaces de Evidencia</span>
          {evidenceLinks.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({evidenceLinks.length})
            </span>
          )}
        </h4>
        {!disabled && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center space-x-1"
          >
            <Plus size={16} />
            <span>Agregar enlace</span>
          </button>
        )}
      </div>

      {/* Evidence links list */}
      <div className="space-y-2">
        {evidenceLinks.map((link, index) => (
          <div
            key={link._id || index}
            className="flex items-center space-x-2 p-3 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                {link.title}
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center space-x-1 truncate"
              >
                <span className="truncate">{link.url}</span>
                <ExternalLink size={12} className="flex-shrink-0" />
              </a>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleDeleteLink(index)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex-shrink-0"
                title="Eliminar enlace"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new link form */}
      {isAdding && (
        <div className="space-y-2 p-3 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div>
            <input
              type="text"
              value={newLinkTitle}
              onChange={(e) => {
                setNewLinkTitle(e.target.value);
                setUrlError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddLink();
                } else if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewLinkTitle('');
                  setNewLinkUrl('');
                  setUrlError('');
                }
              }}
              placeholder="Título del enlace (ej: Documento final, Presentación)"
              maxLength={200}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              autoFocus
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {newLinkTitle.length}/200 caracteres
            </div>
          </div>
          <div>
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => {
                setNewLinkUrl(e.target.value);
                setUrlError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddLink();
                } else if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewLinkTitle('');
                  setNewLinkUrl('');
                  setUrlError('');
                }
              }}
              placeholder="URL (ej: https://drive.google.com/... o https://sharepoint.com/...)"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {newLinkUrl.length}/2000 caracteres {newLinkUrl.length > 0 && '• Soporta enlaces largos de SharePoint'}
            </div>
          </div>
          {urlError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-700">
              {urlError}
            </div>
          )}
          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewLinkTitle('');
                setNewLinkUrl('');
                setUrlError('');
              }}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <Check size={16} />
              <span>Agregar</span>
            </button>
          </div>
        </div>
      )}

      {evidenceLinks.length === 0 && !isAdding && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          No hay enlaces de evidencia. Agrega uno para documentar entregables.
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Hash, Folder, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Save, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface Channel {
  _id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  order: number;
  icon?: string;
  isActive: boolean;
  children?: Channel[];
  createdBy?: {
    name: string;
    email: string;
  };
}

interface ChannelManagementProps {
  projectId: string;
}

export default function ChannelManagement({ projectId }: ChannelManagementProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: null as string | null,
    icon: 'Hash'
  });

  useEffect(() => {
    loadChannels();
  }, [projectId]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/channels`);
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
        // Expandir todos los canales padre por defecto
        const parentIds = new Set(
          data.channels
            .filter((ch: Channel) => ch.children && ch.children.length > 0)
            .map((ch: Channel) => ch._id)
        );
        setExpandedChannels(parentIds);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadChannels();
        setShowCreateForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear canal');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Error al crear canal');
    }
  };

  const handleUpdateChannel = async (channelId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadChannels();
        setEditingChannel(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al actualizar canal');
      }
    } catch (error) {
      console.error('Error updating channel:', error);
      alert('Error al actualizar canal');
    }
  };

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el canal "${channelName}"?`)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/channels/${channelId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadChannels();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar canal');
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      alert('Error al eliminar canal');
    }
  };

  const startEdit = (channel: Channel) => {
    setEditingChannel(channel._id);
    setFormData({
      name: channel.name,
      description: channel.description || '',
      parentId: channel.parentId || null,
      icon: channel.icon || 'Hash'
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentId: null,
      icon: 'Hash'
    });
  };

  const toggleExpand = (channelId: string) => {
    const newExpanded = new Set(expandedChannels);
    if (newExpanded.has(channelId)) {
      newExpanded.delete(channelId);
    } else {
      newExpanded.add(channelId);
    }
    setExpandedChannels(newExpanded);
  };

  const getIconComponent = (iconName: string = 'Hash') => {
    const Icon = (LucideIcons as any)[iconName] || Hash;
    return <Icon size={18} />;
  };

  const renderChannel = (channel: Channel, level: number = 0) => {
    const isExpanded = expandedChannels.has(channel._id);
    const hasChildren = channel.children && channel.children.length > 0;
    const isGeneralChannel = channel.name === 'General' && !channel.parentId;
    const isEditing = editingChannel === channel._id;

    return (
      <div key={channel._id} className="mb-1">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 ${
            level > 0 ? 'ml-8' : ''
          }`}
        >
          {/* Expand/Collapse */}
          {hasChildren && (
            <button
              onClick={() => toggleExpand(channel._id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          {/* Icon */}
          <div className="text-gray-600 dark:text-gray-400">
            {getIconComponent(channel.icon)}
          </div>

          {/* Name and Description */}
          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex-1 px-2 py-1 text-sm border rounded"
                placeholder="Nombre del canal"
                disabled={isGeneralChannel}
              />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex-1 px-2 py-1 text-sm border rounded"
                placeholder="Descripción (opcional)"
              />
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {channel.name}
                </span>
                {level > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (subcanal)
                  </span>
                )}
              </div>
              {channel.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{channel.description}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={() => handleUpdateChannel(channel._id)}
                  className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                  title="Guardar"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={() => {
                    setEditingChannel(null);
                    resetForm();
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  title="Cancelar"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startEdit(channel)}
                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                {!isGeneralChannel && (
                  <button
                    onClick={() => handleDeleteChannel(channel._id, channel.name)}
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {!hasChildren && level === 0 && (
                  <button
                    onClick={() => {
                      setShowCreateForm(true);
                      setFormData({ ...formData, parentId: channel._id });
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                    title="Agregar subcanal"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {channel.children!.map((child) => renderChannel(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-gray-500">Cargando canales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Gestión de Canales
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Organiza las conversaciones de tu proyecto
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            resetForm();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Nuevo Canal
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">
            {formData.parentId ? 'Crear Subcanal' : 'Crear Canal'}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del canal"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción (opcional)"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <select
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="Hash">Hash (#)</option>
              <option value="Folder">Carpeta</option>
              <option value="Code">Código</option>
              <option value="Database">Base de datos</option>
              <option value="Rocket">Cohete</option>
              <option value="Paintbrush">Pincel</option>
              <option value="FileText">Documento</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleCreateChannel}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channels List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        {channels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay canales. Crea el primero.
          </div>
        ) : (
          channels.map((channel) => renderChannel(channel))
        )}
      </div>

      {/* Info */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          ℹ️ Información
        </h4>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• El canal "General" no se puede eliminar ni mover</li>
          <li>• Máximo 2 niveles de jerarquía (Canal → Subcanal)</li>
          <li>• Al eliminar un canal, sus mensajes se mueven a "General"</li>
          <li>• No se pueden eliminar canales con subcanales</li>
        </ul>
      </div>
    </div>
  );
}

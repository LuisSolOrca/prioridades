'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Hash, Folder, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Save, X, Lock, Users, Search, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Channel {
  _id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  order: number;
  icon?: string;
  isActive: boolean;
  isPrivate?: boolean;
  members?: User[];
  children?: Channel[];
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface ChannelManagementProps {
  projectId: string;
}

export default function ChannelManagement({ projectId }: ChannelManagementProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const currentUserRole = (session?.user as any)?.role;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [editingChannelCreatorId, setEditingChannelCreatorId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: null as string | null,
    icon: 'Hash',
    isPrivate: false,
    members: [] as string[]
  });
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  useEffect(() => {
    loadChannels();
  }, [projectId]);

  // Search users when typing
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchingUsers(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(userSearch)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          // Filter out already selected users
          const filtered = (data.users || []).filter(
            (u: User) => !selectedUsers.some(su => su._id === u._id)
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setSearchingUsers(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearch, selectedUsers]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/channels`);
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
        // Expandir todos los canales padre por defecto
        const parentIds = new Set<string>(
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
      const payload = {
        ...formData,
        members: selectedUsers.map(u => u._id)
      };

      const response = await fetch(`/api/projects/${projectId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      // Solo enviar isPrivate y members si el usuario es el creador o admin
      const canEditMembers = editingChannelCreatorId === currentUserId || currentUserRole === 'ADMIN';
      const payload = canEditMembers
        ? { ...formData, members: selectedUsers.map(u => u._id) }
        : { name: formData.name, description: formData.description, icon: formData.icon, parentId: formData.parentId };

      const response = await fetch(`/api/projects/${projectId}/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    setEditingChannelCreatorId(channel.createdBy?._id || null);
    setFormData({
      name: channel.name,
      description: channel.description || '',
      parentId: channel.parentId || null,
      icon: channel.icon || 'Hash',
      isPrivate: channel.isPrivate || false,
      members: channel.members?.map(m => m._id) || []
    });
    // If channel is private, load selected users
    if (channel.isPrivate && channel.members) {
      setSelectedUsers(channel.members);
    } else {
      setSelectedUsers([]);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parentId: null,
      icon: 'Hash',
      isPrivate: false,
      members: []
    });
    setSelectedUsers([]);
    setUserSearch('');
    setSearchResults([]);
    setEditingChannelCreatorId(null);
  };

  const addUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchResults(searchResults.filter(u => u._id !== user._id));
    setUserSearch('');
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
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
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                placeholder="Nombre del canal"
                disabled={isGeneralChannel}
              />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                placeholder="Descripción (opcional)"
              />
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {channel.name}
                </span>
                {channel.isPrivate && (
                  <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    <Lock size={10} />
                    Privado
                  </span>
                )}
                {level > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    (subcanal)
                  </span>
                )}
              </div>
              {channel.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{channel.description}</p>
              )}
              {channel.isPrivate && channel.members && channel.members.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                  <Users size={10} />
                  {channel.members.length} miembro{channel.members.length !== 1 ? 's' : ''}
                </p>
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

        {/* Edit Private Channel Members - Solo visible para el creador o admin */}
        {isEditing && channel.isPrivate && (editingChannelCreatorId === currentUserId || currentUserRole === 'ADMIN') && (
          <div className={`${level > 0 ? 'ml-8' : ''} mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700`}>
            <label className="block text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              <Users size={14} className="inline mr-1" />
              Miembros del canal
            </label>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedUsers.map(user => (
                  <span
                    key={user._id}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm"
                  >
                    {user.name}
                    <button
                      type="button"
                      onClick={() => removeUser(user._id)}
                      className="hover:text-amber-600 dark:hover:text-amber-400"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* User Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar usuarios para agregar..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-amber-300 dark:border-amber-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto">
                {searchResults.map(user => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => addUser(user)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    <Check size={14} className="text-green-500" />
                  </button>
                ))}
              </div>
            )}

            {searchingUsers && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Buscando...</p>
            )}
          </div>
        )}

        {/* Read-only view for non-creators viewing private channels */}
        {isEditing && channel.isPrivate && editingChannelCreatorId !== currentUserId && currentUserRole !== 'ADMIN' && (
          <div className={`${level > 0 ? 'ml-8' : ''} mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700`}>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Lock size={14} />
              Solo el creador del canal puede modificar los miembros
            </p>
            {channel.members && channel.members.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {channel.members.map(user => (
                  <span
                    key={user._id}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                  >
                    {user.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

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
        <div className={`${formData.isPrivate ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'} border-2 rounded-lg p-4`}>
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-100 flex items-center gap-2">
            {formData.isPrivate ? <Lock size={18} className="text-amber-600" /> : <Hash size={18} className="text-blue-600" />}
            {formData.parentId ? 'Crear Subcanal' : 'Crear Canal'} {formData.isPrivate ? 'Privado' : ''}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del canal"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción (opcional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
            <select
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            >
              <option value="Hash">Hash (#)</option>
              <option value="Lock">Candado</option>
              <option value="Folder">Carpeta</option>
              <option value="Code">Código</option>
              <option value="Database">Base de datos</option>
              <option value="Rocket">Cohete</option>
              <option value="Paintbrush">Pincel</option>
              <option value="FileText">Documento</option>
            </select>

            {/* Private Channel Toggle */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <Lock size={18} className={formData.isPrivate ? 'text-amber-600' : 'text-gray-400'} />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">Canal Privado</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Solo los miembros seleccionados pueden ver y participar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate, icon: !formData.isPrivate ? 'Lock' : 'Hash' })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isPrivate ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isPrivate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Member Selection (only for private channels) */}
            {formData.isPrivate && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Users size={14} className="inline mr-1" />
                  Seleccionar Miembros
                </label>

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUsers.map(user => (
                      <span
                        key={user._id}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm"
                      >
                        {user.name}
                        <button
                          type="button"
                          onClick={() => removeUser(user._id)}
                          className="hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* User Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar usuarios..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                    {searchResults.map(user => (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => addUser(user)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                        <Check size={16} className="text-green-500" />
                      </button>
                    ))}
                  </div>
                )}

                {searchingUsers && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Buscando...</p>
                )}

                {userSearch.length >= 2 && searchResults.length === 0 && !searchingUsers && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No se encontraron usuarios</p>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tú serás agregado automáticamente como miembro
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCreateChannel}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${
                  formData.isPrivate
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Crear {formData.isPrivate ? 'Canal Privado' : 'Canal'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
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
          <li>• <Lock size={12} className="inline" /> Los canales privados solo son visibles para sus miembros</li>
          <li>• El creador del canal privado siempre es miembro automáticamente</li>
          <li>• Solo el creador del canal puede modificar los miembros</li>
        </ul>
      </div>
    </div>
  );
}

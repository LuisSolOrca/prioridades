'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Link as LinkIcon,
  ExternalLink,
  Edit2,
  Trash2,
  Plus,
  FileText,
  Github,
  Figma,
  Video,
  Folder,
  X,
  Check,
  Search
} from 'lucide-react';

interface Link {
  _id: string;
  url: string;
  title: string;
  description?: string;
  category: 'documentation' | 'repository' | 'design' | 'meeting' | 'resource' | 'other';
  addedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface ChannelLinksProps {
  projectId: string;
}

export default function ChannelLinks({ projectId }: ChannelLinksProps) {
  const { data: session } = useSession();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    category: 'other' as Link['category']
  });

  const categories = [
    { value: 'documentation', label: 'Documentación', icon: FileText, color: 'blue' },
    { value: 'repository', label: 'Repositorio', icon: Github, color: 'gray' },
    { value: 'design', label: 'Diseño', icon: Figma, color: 'purple' },
    { value: 'meeting', label: 'Reunión', icon: Video, color: 'green' },
    { value: 'resource', label: 'Recurso', icon: Folder, color: 'yellow' },
    { value: 'other', label: 'Otro', icon: LinkIcon, color: 'indigo' }
  ];

  useEffect(() => {
    loadLinks();
  }, [projectId, selectedCategory]);

  // Cuando cambia la búsqueda, recargar enlaces
  useEffect(() => {
    loadLinks();
  }, [searchQuery]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const categoryParam = selectedCategory ? `category=${selectedCategory}` : '';
      const searchParam = searchQuery.trim() ? `search=${encodeURIComponent(searchQuery.trim())}` : '';
      const params = [categoryParam, searchParam].filter(Boolean).join('&');
      const url = `/api/projects/${projectId}/links${params ? `?${params}` : ''}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al cargar enlaces');
      }

      const data = await response.json();
      setLinks(data.links || []);
    } catch (err) {
      console.error('Error loading links:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.url || !formData.title) {
      alert('URL y título son requeridos');
      return;
    }

    try {
      const url = editingId
        ? `/api/projects/${projectId}/links/${editingId}`
        : `/api/projects/${projectId}/links`;

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar enlace');
      }

      const link = await response.json();

      if (editingId) {
        setLinks((prev) => prev.map((l) => (l._id === editingId ? link : l)));
      } else {
        setLinks((prev) => [link, ...prev]);
      }

      resetForm();
    } catch (err: any) {
      console.error('Error saving link:', err);
      alert(err.message || 'Error al guardar enlace');
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('¿Estás seguro de eliminar este enlace?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/links/${linkId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar enlace');
      }

      setLinks((prev) => prev.filter((l) => l._id !== linkId));
    } catch (err) {
      console.error('Error deleting link:', err);
      alert('Error al eliminar enlace');
    }
  };

  const startEdit = (link: Link) => {
    setEditingId(link._id);
    setFormData({
      url: link.url,
      title: link.title,
      description: link.description || '',
      category: link.category
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      url: '',
      title: '',
      description: '',
      category: 'other'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getCategoryInfo = (category: string) => {
    return categories.find((c) => c.value === category) || categories[5];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LinkIcon className="animate-pulse mx-auto mb-3 text-gray-400" size={32} />
          <p className="text-gray-500 dark:text-gray-400">Cargando enlaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Enlaces Compartidos
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Organiza y comparte recursos importantes del proyecto
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancelar' : 'Agregar Enlace'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar enlaces... (título, descripción, URL, categoría)"
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {links.length} {links.length === 1 ? 'enlace' : 'enlaces'} encontrados
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {editingId ? 'Editar Enlace' : 'Nuevo Enlace'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://ejemplo.com/recurso"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nombre del recurso"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Breve descripción del recurso (opcional)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.value;

                  return (
                    <button
                      key={cat.value}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          category: cat.value as Link['category']
                        })
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-sm">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Check size={18} />
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
            selectedCategory === ''
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              selectedCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Links List */}
      {searchQuery && links.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto mb-3 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            No se encontraron enlaces
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Intenta con otro término de búsqueda
          </p>
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-12">
          <LinkIcon className="mx-auto mb-3 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            {selectedCategory ? 'No hay enlaces en esta categoría' : 'No hay enlaces compartidos'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Agrega enlaces a documentos, repositorios y recursos del proyecto
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((link) => {
            const categoryInfo = getCategoryInfo(link.category);
            const Icon = categoryInfo.icon;
            const isOwn = link.addedBy._id === session?.user.id;

            return (
              <div
                key={link._id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-${categoryInfo.color}-100 dark:bg-${categoryInfo.color}-900/30`}>
                      <Icon className={`text-${categoryInfo.color}-600`} size={20} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {categoryInfo.label}
                    </span>
                  </div>

                  {isOwn && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                      <button
                        onClick={() => startEdit(link)}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(link._id)}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group/link"
                >
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 flex items-center gap-2">
                    {link.title}
                    <ExternalLink size={14} className="opacity-0 group-hover/link:opacity-100" />
                  </h4>
                  {link.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {link.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                    {link.url}
                  </p>
                </a>

                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Por {link.addedBy.name}</span>
                  <span>{new Date(link.createdAt).toLocaleDateString('es-MX')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

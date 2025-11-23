'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, Plus, Edit, Trash2, Tag, X } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface UserGroup {
  _id?: string;
  name: string;
  description?: string;
  tag: string;
  members: (User | string)[];
  color?: string;
  isActive: boolean;
  createdBy?: User;
}

export default function UserGroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [formData, setFormData] = useState<UserGroup>({
    name: '',
    description: '',
    tag: '',
    members: [],
    color: '#3b82f6',
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      if ((session.user as any).role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      loadGroups();
      loadUsers();
    }
  }, [status, session, router]);

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/user-groups');
      const data = await res.json();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.filter((u: User & { isActive: boolean }) => u.isActive));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleNew = () => {
    setFormData({
      name: '',
      description: '',
      tag: '',
      members: [],
      color: '#3b82f6',
      isActive: true,
    });
    setEditingGroup(null);
    setShowForm(true);
  };

  const handleEdit = (group: UserGroup) => {
    setFormData({
      ...group,
      members: group.members.map((m) => (typeof m === 'string' ? m : m._id)),
    });
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    if (!formData.tag.trim()) {
      alert('El tag es requerido');
      return;
    }

    // Validar formato del tag
    const tagRegex = /^[a-z0-9-]+$/;
    if (!tagRegex.test(formData.tag)) {
      alert('El tag solo puede contener letras minúsculas, números y guiones');
      return;
    }

    try {
      const url = editingGroup ? `/api/user-groups/${editingGroup._id}` : '/api/user-groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar');
      }

      setShowForm(false);
      loadGroups();
    } catch (error: any) {
      alert(error.message || 'Error al guardar el grupo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este grupo?')) return;

    try {
      const res = await fetch(`/api/user-groups/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      loadGroups();
    } catch (error) {
      alert('Error al eliminar el grupo');
    }
  };

  const toggleMember = (userId: string) => {
    const members = formData.members as string[];
    if (members.includes(userId)) {
      setFormData({
        ...formData,
        members: members.filter((id) => id !== userId),
      });
    } else {
      setFormData({
        ...formData,
        members: [...members, userId],
      });
    }
  };

  const getMemberCount = (group: UserGroup) => {
    return Array.isArray(group.members) ? group.members.length : 0;
  };

  const getMemberNames = (group: UserGroup) => {
    if (!Array.isArray(group.members)) return '';
    const memberObjs = group.members.filter((m) => typeof m !== 'string') as User[];
    return memberObjs.map((m) => m.name).join(', ');
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Grupos de Usuarios
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gestiona grupos para menciones en canales
              </p>
            </div>
          </div>

          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Nuevo Grupo
          </button>
        </div>

        {/* Lista de grupos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Miembros
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No hay grupos creados. Crea tu primer grupo para empezar.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color || '#3b82f6' }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {group.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Tag size={14} className="text-gray-400" />
                        <span
                          className="text-sm font-mono px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${group.color}20`,
                            color: group.color || '#3b82f6',
                          }}
                        >
                          @{group.tag}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {getMemberCount(group)} {getMemberCount(group) === 1 ? 'usuario' : 'usuarios'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {getMemberNames(group)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {group.description || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(group)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-3"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(group._id!)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del Grupo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tag (para menciones) *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">@</span>
                    <input
                      type="text"
                      value={formData.tag}
                      onChange={(e) => setFormData({ ...formData, tag: e.target.value.toLowerCase() })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                      placeholder="developers"
                      pattern="[a-z0-9-]+"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Solo letras minúsculas, números y guiones
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-20 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{formData.color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Miembros ({(formData.members as string[]).length})
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar usuarios..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                  />
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <label
                        key={user._id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={(formData.members as string[]).includes(user._id)}
                          onChange={() => toggleMember(user._id)}
                          className="rounded text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingGroup ? 'Guardar Cambios' : 'Crear Grupo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

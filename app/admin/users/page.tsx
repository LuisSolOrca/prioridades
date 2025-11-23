'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { exportUsers } from '@/lib/exportToExcel';

interface User {
  _id?: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  area?: string;
  isAreaLeader?: boolean;
  password?: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<User>({
    name: '',
    email: '',
    role: 'USER',
    isActive: true,
    area: '',
    isAreaLeader: false,
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);

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
      loadUsers();
    }
  }, [status, session, router]);

  const loadUsers = async () => {
    try {
      // includeAll=true para mostrar todos los usuarios incluyendo Francisco Puente en admin
      const res = await fetch('/api/users?includeAll=true');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setFormData({
      name: '',
      email: '',
      role: 'USER',
      isActive: true,
      area: '',
      isAreaLeader: false,
      password: ''
    });
    setConfirmPassword('');
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setFormData({ ...user, password: '' });
    setConfirmPassword('');
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar passwords
    if (formData.password || confirmPassword) {
      if (formData.password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }
      if (formData.password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
      }
    } else if (!editingUser) {
      // Password requerida para nuevo usuario
      alert('La contraseña es requerida para nuevos usuarios');
      return;
    }

    try {
      const dataToSend = { ...formData };

      // Si no hay password o está vacía, no la enviamos en edición
      if (editingUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      if (editingUser?._id) {
        const res = await fetch(`/api/users/${editingUser._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error updating user');
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error creating user');
        }
      }

      await loadUsers();
      setShowForm(false);
      setEditingUser(null);
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.message || 'Error al guardar el usuario');
    }
  };

  const toggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, isActive: !user.isActive })
      });

      if (!res.ok) throw new Error('Error updating user');

      await loadUsers();
    } catch (error) {
      console.error('Error toggling user active:', error);
      alert('Error al cambiar el estado del usuario');
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${user.name}?`)) return;

    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error deleting user');

      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar el usuario');
    }
  };

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt(`Ingrese la nueva contraseña para ${user.name}:`);

    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, password: newPassword })
      });

      if (!res.ok) throw new Error('Error resetting password');

      alert('Contraseña actualizada exitosamente');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error al resetear la contraseña');
    }
  };

  const handleExport = () => {
    exportUsers(users as any, 'Usuarios');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!session || (session.user as any).role !== 'ADMIN') return null;

  const activeCount = users.filter(u => u.isActive).length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                👥 Gestión de Usuarios
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {activeCount} usuarios activos • {adminCount} administradores • {users.length} total
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin/auto-reschedule')}
                className="bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-md"
                title="Auto-Reprogramación"
              >
                🔄 Auto-Reprogramación
              </button>
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition shadow-md"
                title="Exportar a Excel"
              >
                📥 Exportar a Excel
              </button>
              <button
                onClick={handleNew}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
              >
                + Nuevo Usuario
              </button>
            </div>
          </div>

          {showForm ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@empresa.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Área
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={formData.area || ''}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="Ej: Tecnología, Ventas, Marketing"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rol
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'USER' })}
                    >
                      <option value="USER">Usuario</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirmar Contraseña {!editingUser && '*'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      minLength={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetir contraseña"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Estado
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formData.isActive ? 'Usuario activo' : 'Usuario inactivo'}
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAreaLeader || false}
                        onChange={(e) => setFormData({ ...formData, isAreaLeader: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Líder de área
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                    }}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
                  >
                    💾 {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">Usuario</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">Área</th>
                      <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">Rol</th>
                      <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                      <th className="text-center py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3 shadow-md">
                              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <span className="font-medium text-gray-800 dark:text-gray-100">{user.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{user.email}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            {user.area ? (
                              <>
                                <span className="text-gray-700 dark:text-gray-300">{user.area}</span>
                                {user.isAreaLeader && (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full font-semibold">
                                    Líder
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-sm">Sin área</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                          }`}>
                            {user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => toggleActive(user)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                              user.isActive
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 w-9 h-9 rounded-lg transition"
                              title="Editar usuario"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 w-9 h-9 rounded-lg transition"
                              title="Resetear contraseña"
                            >
                              🔑
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 w-9 h-9 rounded-lg transition"
                              title="Eliminar usuario"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

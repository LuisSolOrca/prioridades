'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    enabled: true,
    newComments: true,
    priorityAssigned: true,
    statusChanges: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loadingGamification, setLoadingGamification] = useState(true);

  // Load notification preferences and gamification data
  useEffect(() => {
    if (status === 'authenticated') {
      loadNotificationPreferences();
      loadGamificationData();
    }
  }, [status]);

  const loadNotificationPreferences = async () => {
    try {
      const res = await fetch('/api/users/notification-preferences');
      if (res.ok) {
        const data = await res.json();
        setNotificationPrefs(data.emailNotifications);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const loadGamificationData = async () => {
    try {
      setLoadingGamification(true);

      // Cargar badges
      const badgesRes = await fetch('/api/badges');
      const badgesData = await badgesRes.json();
      setBadges(Array.isArray(badgesData) ? badgesData : []);

      // Cargar estadísticas del usuario
      if (session?.user?.id) {
        const userRes = await fetch(`/api/users/${(session.user as any).id}`);
        const userData = await userRes.json();
        setUserStats(userData.gamification || {
          points: 0,
          currentMonthPoints: 0,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0
        });
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoadingGamification(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    setSavingPrefs(true);
    setPrefsMessage(null);

    try {
      const res = await fetch('/api/users/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications: notificationPrefs })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar preferencias');
      }

      setPrefsMessage({ type: 'success', text: 'Preferencias guardadas exitosamente' });
      setTimeout(() => setPrefsMessage(null), 3000);
    } catch (error: any) {
      setPrefsMessage({ type: 'error', text: error.message || 'Error al guardar preferencias' });
    } finally {
      setSavingPrefs(false);
    }
  };

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validaciones del frontend
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Todos los campos son obligatorios' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe ser diferente a la actual' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar la contraseña');
      }

      setMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al cambiar la contraseña' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Mi Perfil</h1>
            <p className="text-gray-600">Gestiona tu información personal y seguridad</p>
          </div>

          {/* User Info Section */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Información Personal</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Nombre</label>
                <p className="text-gray-800 font-medium">{session?.user?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-800 font-medium">{session?.user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Rol</label>
                <p className="text-gray-800 font-medium">
                  {(session?.user as any)?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                </p>
              </div>
            </div>
          </div>

          {/* Gamification Section */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">🏆 Gamificación y Logros</h2>

            {loadingGamification ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">⏳</div>
                <div>Cargando estadísticas...</div>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-2xl font-bold text-yellow-700">{userStats?.currentMonthPoints || 0}</div>
                    <div className="text-xs text-yellow-600 font-medium">Puntos del Mes</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">⭐</div>
                    <div className="text-2xl font-bold text-purple-700">{userStats?.totalPoints || 0}</div>
                    <div className="text-xs text-purple-600 font-medium">Puntos Totales</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">🔥</div>
                    <div className="text-2xl font-bold text-orange-700">{userStats?.currentStreak || 0}</div>
                    <div className="text-xs text-orange-600 font-medium">Racha Actual</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">🎖️</div>
                    <div className="text-2xl font-bold text-blue-700">{badges.length}</div>
                    <div className="text-xs text-blue-600 font-medium">Badges Obtenidos</div>
                  </div>
                </div>

                {/* Badges Display */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">🎖️</span>
                    Mis Badges {badges.length > 0 && `(${badges.length})`}
                  </h3>

                  {badges.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                      <div className="text-4xl mb-2">🎯</div>
                      <div className="text-gray-600 font-medium mb-1">¡Aún no tienes badges!</div>
                      <div className="text-sm text-gray-500">
                        Completa tareas, comenta y menciona a otros para obtener tus primeros logros
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {badges.map((badge: any) => (
                        <div
                          key={badge._id}
                          className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4"
                        >
                          <div className="flex items-start">
                            <div className="text-4xl mr-3">{badge.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-bold text-purple-900 mb-1">{badge.name}</h4>
                              <p className="text-sm text-purple-700 mb-2">{badge.description}</p>
                              <div className="text-xs text-purple-600">
                                Obtenido: {new Date(badge.earnedAt).toLocaleDateString('es-MX', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tips for earning badges */}
                <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">🎮</span>
                    <div className="text-sm text-gray-800">
                      <strong className="text-lg">Sistema de Gamificación</strong>
                      <p className="mt-2 mb-3 text-gray-700">
                        ¡Desbloquea badges usando todas las funcionalidades de la plataforma y manteniendo tus prioridades bajo control!
                      </p>

                      <div className="space-y-3">
                        <div>
                          <strong className="text-blue-800">🎯 Gestión de Prioridades:</strong>
                          <ul className="mt-1 ml-4 space-y-1 list-disc text-gray-700">
                            <li>Completa prioridades y mantén rachas</li>
                            <li>Evita y reacciona rápido a riesgos y bloqueos</li>
                            <li>Mantén semanas perfectas al 100%</li>
                          </ul>
                        </div>

                        <div>
                          <strong className="text-purple-800">🤖 Uso de la Plataforma:</strong>
                          <ul className="mt-1 ml-4 space-y-1 list-disc text-gray-700">
                            <li>Usa IA para mejorar textos y análisis</li>
                            <li>Exporta datos (Excel, PowerPoint, PDF)</li>
                            <li>Explora Analytics y tablero Kanban</li>
                            <li>Colabora con comentarios y menciones</li>
                          </ul>
                        </div>

                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-gray-600 italic">
                            💡 Hay 24 badges diferentes para desbloquear. ¡Explora todas las funcionalidades para convertirte en Power User!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Email Notifications Section */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📧 Notificaciones por Email</h2>

            {prefsMessage && (
              <div className={`mb-4 p-4 rounded-lg ${
                prefsMessage.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  <span className="text-xl mr-2">
                    {prefsMessage.type === 'success' ? '✓' : '⚠️'}
                  </span>
                  <span>{prefsMessage.text}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">Habilitar notificaciones por email</div>
                  <div className="text-sm text-gray-600">Activa o desactiva todas las notificaciones por correo</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notificationPrefs.enabled}
                    onChange={(e) => setNotificationPrefs({ ...notificationPrefs, enabled: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {notificationPrefs.enabled && (
                <>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">💬 Nuevos comentarios</div>
                      <div className="text-sm text-gray-600">Recibe un email cuando alguien comente en tus prioridades</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationPrefs.newComments}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, newComments: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">📋 Prioridad asignada</div>
                      <div className="text-sm text-gray-600">Recibe un email cuando se te asigne una nueva prioridad</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationPrefs.priorityAssigned}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, priorityAssigned: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">🔔 Cambios de estado</div>
                      <div className="text-sm text-gray-600">Recibe un email cuando cambie el estado de tus prioridades</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationPrefs.statusChanges}
                        onChange={(e) => setNotificationPrefs({ ...notificationPrefs, statusChanges: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </>
              )}

              <div className="pt-4">
                <button
                  onClick={handleSaveNotificationPreferences}
                  disabled={savingPrefs}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition ${
                    savingPrefs
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {savingPrefs ? 'Guardando...' : '💾 Guardar Preferencias'}
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Cambiar Contraseña</h2>

            {message && (
              <div className={`mb-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  <span className="text-xl mr-2">
                    {message.type === 'success' ? '✓' : '⚠️'}
                  </span>
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña Actual *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña actual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">La contraseña debe tener al menos 6 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirma la nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {loading ? 'Cambiando contraseña...' : '🔒 Cambiar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">💡</span>
            <div className="text-sm text-blue-800">
              <strong>Consejos de seguridad:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Usa una contraseña única que no utilices en otros sitios</li>
                <li>Combina letras mayúsculas, minúsculas, números y símbolos</li>
                <li>Evita usar información personal obvia</li>
                <li>Cambia tu contraseña periódicamente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

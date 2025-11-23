'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Download, FileSpreadsheet, FileText, Table, Calendar, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ExportCommandProps {
  projectId: string;
  initialFormat?: 'excel' | 'pdf' | 'csv';
  onClose: () => void;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

export default function ExportCommand({
  projectId,
  initialFormat = 'excel',
  onClose
}: ExportCommandProps) {
  const { data: session } = useSession();
  const [format, setFormat] = useState<'excel' | 'pdf' | 'csv'>(initialFormat);
  const [dataType, setDataType] = useState<'priorities' | 'messages' | 'all'>('priorities');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadUsers();
    setDefaultDates();
  }, []);

  const setDefaultDates = () => {
    // Default: últimos 30 días
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        format,
        dataType,
        projectId,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(selectedUsers.length > 0 && { users: selectedUsers.join(',') })
      });

      const response = await fetch(`/api/export/project-data?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Error al exportar datos');
      }

      // Obtener el blob y crear descarga
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Nombre del archivo basado en formato
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : format;
      a.download = `export_proyecto_${timestamp}.${extension}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al exportar datos');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-green-300 dark:border-green-700 p-6 my-2">
        <div className="text-center py-8">
          <CheckCircle className="text-green-600 dark:text-green-400 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ¡Exportación Completada!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            El archivo se ha descargado correctamente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-purple-300 dark:border-purple-700 p-6 my-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <Download className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Exportar Datos del Proyecto</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Descarga información en diferentes formatos</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          disabled={loading}
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Formato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Formato de Exportación
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFormat('excel')}
              disabled={loading}
              className={`p-3 rounded-lg border-2 transition ${
                format === 'excel'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
              }`}
            >
              <FileSpreadsheet className={`mx-auto mb-1 ${format === 'excel' ? 'text-green-600' : 'text-gray-500'}`} size={24} />
              <div className="text-xs font-medium text-gray-800 dark:text-gray-100">Excel</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">.xlsx</div>
            </button>
            <button
              onClick={() => setFormat('pdf')}
              disabled={loading}
              className={`p-3 rounded-lg border-2 transition ${
                format === 'pdf'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-red-300'
              }`}
            >
              <FileText className={`mx-auto mb-1 ${format === 'pdf' ? 'text-red-600' : 'text-gray-500'}`} size={24} />
              <div className="text-xs font-medium text-gray-800 dark:text-gray-100">PDF</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">.pdf</div>
            </button>
            <button
              onClick={() => setFormat('csv')}
              disabled={loading}
              className={`p-3 rounded-lg border-2 transition ${
                format === 'csv'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
              }`}
            >
              <Table className={`mx-auto mb-1 ${format === 'csv' ? 'text-blue-600' : 'text-gray-500'}`} size={24} />
              <div className="text-xs font-medium text-gray-800 dark:text-gray-100">CSV</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">.csv</div>
            </button>
          </div>
        </div>

        {/* Tipo de Datos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Datos a Exportar
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setDataType('priorities')}
              disabled={loading}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                dataType === 'priorities'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              Prioridades
            </button>
            <button
              onClick={() => setDataType('messages')}
              disabled={loading}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                dataType === 'messages'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              Mensajes
            </button>
            <button
              onClick={() => setDataType('all')}
              disabled={loading}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                dataType === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              Todo
            </button>
          </div>
        </div>

        {/* Rango de Fechas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar size={14} className="inline mr-1" />
            Rango de Fechas
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Filtro de Usuarios */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Users size={14} className="inline mr-1" />
            Filtrar por Usuarios (opcional)
          </label>
          <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700">
            {users.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                Cargando usuarios...
              </div>
            ) : (
              <div className="space-y-1">
                {users.map(user => (
                  <label
                    key={user._id}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => toggleUser(user._id)}
                      className="rounded text-purple-600"
                      disabled={loading}
                    />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-800 dark:text-gray-100">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedUsers.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {selectedUsers.length} {selectedUsers.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
              <XCircle size={16} />
              {error}
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Exportando...
              </>
            ) : (
              <>
                <Download size={18} />
                Exportar {format.toUpperCase()}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition"
          >
            Cancelar
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Comando ejecutado: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/export</code>
      </div>
    </div>
  );
}

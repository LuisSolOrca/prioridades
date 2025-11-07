'use client';

import { useState } from 'react';
import { Clock, Calendar, BarChart3, FileText, X } from 'lucide-react';

interface LocalHoursReportProps {
  userId: string;
  userName: string;
}

export default function LocalHoursReport({ userId, userName }: LocalHoursReportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert('Por favor selecciona un rango de fechas');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        startDate,
        endDate
      });

      const response = await fetch(`/api/reports/local-hours?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar reporte');
      }

      setReportData(data);
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    const rows = [
      ['Reporte de Horas - Prioridades Locales'],
      ['Usuario', reportData.user.name],
      ['Periodo', `${startDate} a ${endDate}`],
      [''],
      ['Prioridad', 'Semana', 'Tarea', 'Horas'],
    ];

    reportData.priorities.forEach((priority: any) => {
      priority.tasks.forEach((task: any, index: number) => {
        rows.push([
          index === 0 ? priority.title : '',
          index === 0 ? `${new Date(priority.weekStart).toLocaleDateString()} - ${new Date(priority.weekEnd).toLocaleDateString()}` : '',
          task.text,
          task.hours.toString()
        ]);
      });
      rows.push(['', '', 'Subtotal', priority.totalHours.toString()]);
      rows.push(['']);
    });

    rows.push(['', '', 'TOTAL', reportData.summary.totalHours.toString()]);

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-horas-local-${startDate}-${endDate}.csv`;
    link.click();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <BarChart3 size={20} />
        Reporte de Horas Local
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-green-600" size={24} />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Reporte de Horas Local
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Prioridades sin vínculo con Azure DevOps
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Date Range Selector */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="inline mr-2" size={16} />
                  Rango de Fechas
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateReport}
                      disabled={loading || !startDate || !endDate}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                               disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Generando...' : 'Generar Reporte'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Results */}
              {reportData && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Total Prioridades
                      </div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                        {reportData.summary.totalPriorities}
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                        Total Tareas
                      </div>
                      <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                        {reportData.summary.totalTasks}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Total Horas
                      </div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                        {reportData.summary.totalHours}h
                      </div>
                    </div>
                  </div>

                  {/* Export Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <FileText size={16} />
                      Exportar CSV
                    </button>
                  </div>

                  {/* Detailed List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Detalle por Prioridad
                    </h3>
                    {reportData.priorities.map((priority: any) => (
                      <div
                        key={priority.priorityId}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {priority.title}
                            </h4>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(priority.weekStart).toLocaleDateString()} -{' '}
                              {new Date(priority.weekEnd).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {priority.totalHours}h
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {priority.tasks.length} tarea{priority.tasks.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {priority.tasks.map((task: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {task.text}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {task.hours}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {reportData.priorities.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No se encontraron prioridades con horas registradas en este período
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

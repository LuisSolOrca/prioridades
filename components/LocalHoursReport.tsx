'use client';

import { useState, useEffect } from 'react';
import { Clock, BarChart3, FileText } from 'lucide-react';

interface LocalHoursReportProps {
  selectedUser: string;
  selectedArea: string;
  includeAdmins: boolean;
  dateFrom: string;
  dateTo: string;
}

export default function LocalHoursReport({
  selectedUser,
  selectedArea,
  includeAdmins,
  dateFrom,
  dateTo
}: LocalHoursReportProps) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Auto-generate report when filters change
  useEffect(() => {
    if (dateFrom && dateTo) {
      handleGenerateReport();
    }
  }, [selectedUser, selectedArea, includeAdmins, dateFrom, dateTo]);

  const handleGenerateReport = async () => {
    if (!dateFrom || !dateTo) {
      setReportData(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateFrom,
        endDate: dateTo
      });

      if (selectedUser !== 'all') {
        params.append('userId', selectedUser);
      }

      if (selectedArea !== 'all') {
        params.append('area', selectedArea);
      }

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
      ['Periodo', `${dateFrom} a ${dateTo}`],
      [''],
      ['Usuario', 'Prioridad', 'Semana', 'Tarea', 'Horas'],
    ];

    reportData.priorities.forEach((priority: any) => {
      priority.tasks.forEach((task: any, index: number) => {
        rows.push([
          index === 0 ? priority.userName : '',
          index === 0 ? priority.title : '',
          index === 0 ? `${new Date(priority.weekStart).toLocaleDateString()} - ${new Date(priority.weekEnd).toLocaleDateString()}` : '',
          task.text,
          task.hours.toString()
        ]);
      });
      rows.push(['', '', '', 'Subtotal', priority.totalHours.toString()]);
      rows.push(['']);
    });

    rows.push(['', '', '', 'TOTAL', reportData.summary.totalHours.toString()]);

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-horas-local-${dateFrom}-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600 dark:text-gray-400">Generando reporte...</div>
        </div>
      )}

      {/* No date range selected */}
      {!dateFrom || !dateTo ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📅</div>
          <div className="text-gray-600 dark:text-gray-400">
            Por favor selecciona un rango de fechas en los filtros para generar el reporte
          </div>
        </div>
      ) : null}

      {/* Report Results */}
      {!loading && reportData && (
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
                              <span className="font-medium">{priority.userName}</span> • {' '}
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
  );
}

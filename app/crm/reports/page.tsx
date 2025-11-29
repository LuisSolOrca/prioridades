'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { usePermissions } from '@/hooks/usePermissions';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  Loader2,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  Clock,
  Calendar,
  Building2,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CrmHelpCard from '@/components/crm/CrmHelpCard';

interface ReportData {
  summary: {
    totalDeals: number;
    openDeals: number;
    wonDeals: number;
    lostDeals: number;
    totalPipelineValue: number;
    weightedPipelineValue: number;
    wonValue: number;
    lostValue: number;
    winRate: number;
    lossRate: number;
    avgDealValue: number;
    avgWonDealValue: number;
    avgSalesCycle: number;
    totalContacts: number;
    totalActivities: number;
  };
  dealsByStage: any[];
  dealsByOwner: any[];
  dealsByClient: any[];
  monthlyTrend: any[];
  forecast: any[];
  activitiesByType: any[];
  activitiesByOwner: any[];
}

interface Client {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function CRMReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Sections collapse
  const [sections, setSections] = useState({
    summary: true,
    pipeline: true,
    trend: true,
    forecast: true,
    owners: true,
    clients: true,
    activities: true,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    // Wait for permissions to load before checking access
    if (status === 'authenticated' && !permissionsLoading) {
      if (!permissions.viewCRM) {
        router.push('/dashboard');
        return;
      }
      // Set default date range (last 90 days)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      loadInitialData();
    }
  }, [status, router, permissions.viewCRM, permissionsLoading]);

  const loadInitialData = async () => {
    try {
      const [clientsRes, usersRes] = await Promise.all([
        fetch('/api/clients?activeOnly=true'),
        fetch('/api/users'),
      ]);
      const clientsData = await clientsRes.json();
      const usersData = await usersRes.json();
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setUsers(Array.isArray(usersData) ? usersData.filter((u: any) => u.isActive) : []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedOwner) params.set('ownerId', selectedOwner);
      if (selectedClient) params.set('clientId', selectedClient);

      const res = await fetch('/api/crm/reports?' + params.toString());
      const reportData = await res.json();
      setData(reportData);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedOwner, selectedClient]);

  useEffect(() => {
    if (status === 'authenticated' && permissions.viewCRM && startDate && endDate) {
      loadReport();
    }
  }, [status, permissions.viewCRM, loadReport, startDate, endDate, selectedOwner, selectedClient]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const exportToPDF = async () => {
    if (!data) return;
    setExporting(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte CRM', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date range
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      const dateRange = `Periodo: ${new Date(startDate).toLocaleDateString('es-MX')} - ${new Date(endDate).toLocaleDateString('es-MX')}`;
      doc.text(dateRange, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Summary section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Resumen Ejecutivo', 14, yPos);
      yPos += 8;

      const summaryData = [
        ['Metrica', 'Valor'],
        ['Total Deals', data.summary.totalDeals.toString()],
        ['Deals Abiertos', data.summary.openDeals.toString()],
        ['Deals Ganados', data.summary.wonDeals.toString()],
        ['Deals Perdidos', data.summary.lostDeals.toString()],
        ['Valor Pipeline', formatCurrency(data.summary.totalPipelineValue)],
        ['Valor Ponderado', formatCurrency(data.summary.weightedPipelineValue)],
        ['Valor Ganado', formatCurrency(data.summary.wonValue)],
        ['Tasa de Conversion', `${data.summary.winRate}%`],
        ['Valor Promedio Deal', formatCurrency(data.summary.avgDealValue)],
        ['Ciclo de Venta Promedio', `${data.summary.avgSalesCycle} dias`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Pipeline by stage
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Pipeline por Etapa', 14, yPos);
      yPos += 8;

      const stageData = data.dealsByStage.map(stage => [
        stage.name,
        stage.dealsCount.toString(),
        formatCurrency(stage.totalValue),
        formatCurrency(stage.weightedValue),
        `${stage.probability}%`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Etapa', 'Deals', 'Valor Total', 'Valor Ponderado', 'Prob.']],
        body: stageData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'center' },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Forecast
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Forecast (Proximos 3 meses)', 14, yPos);
      yPos += 8;

      const forecastData = data.forecast.map(f => [
        f.month,
        f.dealsCount.toString(),
        formatCurrency(f.totalValue),
        formatCurrency(f.weightedValue),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Mes', 'Deals', 'Valor Total', 'Valor Ponderado']],
        body: forecastData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Performance by owner
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Rendimiento por Vendedor', 14, yPos);
      yPos += 8;

      const ownerData = data.dealsByOwner.map(owner => [
        owner.name,
        owner.totalDeals.toString(),
        owner.wonDeals.toString(),
        owner.lostDeals.toString(),
        formatCurrency(owner.wonValue),
        owner.totalDeals > 0 ? `${Math.round((owner.wonDeals / (owner.wonDeals + owner.lostDeals || 1)) * 100)}%` : '-',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Vendedor', 'Total', 'Ganados', 'Perdidos', 'Valor Ganado', 'Win Rate']],
        body: ownerData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'center' },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Top clients
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 10 Clientes', 14, yPos);
      yPos += 8;

      const clientData = data.dealsByClient.slice(0, 10).map(client => [
        client.name,
        client.totalDeals.toString(),
        client.wonDeals.toString(),
        formatCurrency(client.totalValue),
        formatCurrency(client.wonValue),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Cliente', 'Total Deals', 'Ganados', 'Valor Total', 'Valor Ganado']],
        body: clientData,
        theme: 'striped',
        headStyles: { fillColor: [236, 72, 153], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
      });

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Pagina ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save
      const fileName = `reporte-crm-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  if (status === 'loading' || permissionsLoading || (loading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <BarChart3 className="text-blue-500" />
              Reportes CRM
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Metricas de conversion, pipeline y forecast
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting || !data}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Help Card */}
        <CrmHelpCard
          id="crm-reports-guide"
          title="Analiza el rendimiento de tu equipo comercial"
          variant="info"
          className="mb-6"
          defaultCollapsed={true}
          tips={[
            'Filtra por fechas, vendedor y pipeline para obtener reportes específicos',
            'Exporta los reportes a PDF para compartirlos con tu equipo',
            'Revisa el pipeline chart para ver la distribución de deals por etapa',
            'Monitorea las métricas clave: deals ganados, valor total y tasas de conversión',
          ]}
        />

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4"
          >
            <span className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-100">
              <Filter size={20} />
              Filtros
            </span>
            {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showFilters && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendedor
                </label>
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todos</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliente
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todos</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>{client.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {data && (
          <>
            {/* Summary Cards */}
            <div className="mb-6">
              <button
                onClick={() => toggleSection('summary')}
                className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4"
              >
                {sections.summary ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                Resumen Ejecutivo
              </button>

              {sections.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <DollarSign size={16} />
                      Pipeline Total
                    </div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {formatCurrency(data.summary.totalPipelineValue)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Ponderado: {formatCurrency(data.summary.weightedPipelineValue)}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <TrendingUp size={16} className="text-green-500" />
                      Ganados
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(data.summary.wonValue)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {data.summary.wonDeals} deals
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <Target size={16} />
                      Win Rate
                    </div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {data.summary.winRate}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {data.summary.wonDeals} de {data.summary.wonDeals + data.summary.lostDeals} cerrados
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <DollarSign size={16} />
                      Ticket Promedio
                    </div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {formatCurrency(data.summary.avgWonDealValue)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Deals ganados
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                      <Clock size={16} />
                      Ciclo de Venta
                    </div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {data.summary.avgSalesCycle} dias
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Promedio hasta cierre
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline by Stage */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
              <button
                onClick={() => toggleSection('pipeline')}
                className="w-full flex items-center justify-between p-4"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                  <PieChartIcon size={20} className="text-blue-500" />
                  Pipeline por Etapa
                </span>
                {sections.pipeline ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {sections.pipeline && (
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <div className="h-80">
                      {data.dealsByStage.filter(s => !s.isClosed).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.dealsByStage.filter(s => !s.isClosed)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" width={100} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Bar dataKey="totalValue" name="Valor Total" fill="#3b82f6" />
                            <Bar dataKey="weightedValue" name="Valor Ponderado" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                          No hay datos de pipeline abierto para mostrar
                        </div>
                      )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b dark:border-gray-700">
                            <th className="text-left py-2 font-medium text-gray-500">Etapa</th>
                            <th className="text-center py-2 font-medium text-gray-500">Deals</th>
                            <th className="text-right py-2 font-medium text-gray-500">Valor</th>
                            <th className="text-right py-2 font-medium text-gray-500">Ponderado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.dealsByStage.map(stage => (
                            <tr key={stage._id} className="border-b dark:border-gray-700">
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                                  <span className="text-gray-800 dark:text-gray-200">{stage.name}</span>
                                </div>
                              </td>
                              <td className="text-center py-2 text-gray-600 dark:text-gray-400">{stage.dealsCount}</td>
                              <td className="text-right py-2 font-medium text-gray-800 dark:text-gray-200">
                                {formatCurrency(stage.totalValue)}
                              </td>
                              <td className="text-right py-2 text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(stage.weightedValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Monthly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
              <button
                onClick={() => toggleSection('trend')}
                className="w-full flex items-center justify-between p-4"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                  <TrendingUp size={20} className="text-green-500" />
                  Tendencia Mensual (12 meses)
                </span>
                {sections.trend ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {sections.trend && (
                <div className="p-4 pt-0">
                  <div className="h-80">
                    {data.monthlyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip formatter={(value: any, name: string) =>
                            name.includes('Value') ? formatCurrency(value) : value
                          } />
                          <Legend />
                          <Area yAxisId="left" type="monotone" dataKey="wonValue" name="Valor Ganado" fill="#10b981" stroke="#10b981" fillOpacity={0.3} />
                          <Line yAxisId="right" type="monotone" dataKey="won" name="Deals Ganados" stroke="#3b82f6" strokeWidth={2} />
                          <Line yAxisId="right" type="monotone" dataKey="created" name="Deals Creados" stroke="#f59e0b" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        No hay datos de tendencia para mostrar
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Forecast */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
              <button
                onClick={() => toggleSection('forecast')}
                className="w-full flex items-center justify-between p-4"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                  <Calendar size={20} className="text-yellow-500" />
                  Forecast (Proximos 3 meses)
                </span>
                {sections.forecast ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {sections.forecast && (
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.forecast.map((month, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-3 capitalize">
                          {month.month}
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Deals:</span>
                            <span className="font-medium">{month.dealsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Valor Total:</span>
                            <span className="font-medium">{formatCurrency(month.totalValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Ponderado:</span>
                            <span className="font-medium text-emerald-600">{formatCurrency(month.weightedValue)}</span>
                          </div>
                        </div>
                        {month.deals.length > 0 && (
                          <div className="mt-3 pt-3 border-t dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Top deals:</p>
                            {month.deals.slice(0, 3).map((deal: any) => (
                              <div key={deal._id} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {deal.title} - {formatCurrency(deal.value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Performance by Owner */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
              <button
                onClick={() => toggleSection('owners')}
                className="w-full flex items-center justify-between p-4"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                  <Users size={20} className="text-purple-500" />
                  Rendimiento por Vendedor
                </span>
                {sections.owners ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {sections.owners && (
                <div className="p-4 pt-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 font-medium text-gray-500">Vendedor</th>
                        <th className="text-center py-2 font-medium text-gray-500">Total</th>
                        <th className="text-center py-2 font-medium text-gray-500">Abiertos</th>
                        <th className="text-center py-2 font-medium text-gray-500">Ganados</th>
                        <th className="text-center py-2 font-medium text-gray-500">Perdidos</th>
                        <th className="text-right py-2 font-medium text-gray-500">Valor Ganado</th>
                        <th className="text-center py-2 font-medium text-gray-500">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dealsByOwner.map(owner => {
                        const closedDeals = owner.wonDeals + owner.lostDeals;
                        const winRate = closedDeals > 0 ? Math.round((owner.wonDeals / closedDeals) * 100) : 0;
                        return (
                          <tr key={owner._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{owner.name}</td>
                            <td className="text-center py-3">{owner.totalDeals}</td>
                            <td className="text-center py-3 text-blue-600">{owner.openDeals}</td>
                            <td className="text-center py-3 text-green-600">{owner.wonDeals}</td>
                            <td className="text-center py-3 text-red-600">{owner.lostDeals}</td>
                            <td className="text-right py-3 font-medium text-emerald-600">{formatCurrency(owner.wonValue)}</td>
                            <td className="text-center py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                winRate >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                winRate >= 30 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {winRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Clients */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
              <button
                onClick={() => toggleSection('clients')}
                className="w-full flex items-center justify-between p-4"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                  <Building2 size={20} className="text-pink-500" />
                  Top 10 Clientes por Valor
                </span>
                {sections.clients ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {sections.clients && (
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="h-80">
                      {data.dealsByClient.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.dealsByClient.slice(0, 8)}
                              dataKey="totalValue"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, percent }) => `${(name || '').substring(0, 10)}... (${((percent || 0) * 100).toFixed(0)}%)`}
                            >
                              {data.dealsByClient.slice(0, 8).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                          No hay datos de clientes para mostrar
                        </div>
                      )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b dark:border-gray-700">
                            <th className="text-left py-2 font-medium text-gray-500">Cliente</th>
                            <th className="text-center py-2 font-medium text-gray-500">Deals</th>
                            <th className="text-right py-2 font-medium text-gray-500">Valor Total</th>
                            <th className="text-right py-2 font-medium text-gray-500">Ganado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.dealsByClient.slice(0, 10).map((client, idx) => (
                            <tr key={client._id} className="border-b dark:border-gray-700">
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                  <span className="text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{client.name}</span>
                                </div>
                              </td>
                              <td className="text-center py-2 text-gray-600 dark:text-gray-400">{client.totalDeals}</td>
                              <td className="text-right py-2 font-medium text-gray-800 dark:text-gray-200">
                                {formatCurrency(client.totalValue)}
                              </td>
                              <td className="text-right py-2 text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(client.wonValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Activities Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleSection('activities')}
                className="w-full flex items-center justify-between p-4"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                  <FileText size={20} className="text-cyan-500" />
                  Resumen de Actividades
                </span>
                {sections.activities ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {sections.activities && (
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* By Type */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Por Tipo</h4>
                      <div className="space-y-2">
                        {data.activitiesByType.map(item => (
                          <div key={item.type} className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300 capitalize">{item.type}</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* By Owner */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Por Usuario</h4>
                      <div className="space-y-2">
                        {data.activitiesByOwner.slice(0, 5).map(item => (
                          <div key={item._id} className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

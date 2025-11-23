import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import Project from '@/models/Project';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const dataType = searchParams.get('dataType') || 'priorities';
    const projectId = searchParams.get('projectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const users = searchParams.get('users')?.split(',') || [];

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID requerido' }, { status: 400 });
    }

    // Obtener información del proyecto
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    let data: any[] | { priorities: any[], messages: any[] } = [];
    let headers: string[] = [];

    // Construir query para filtros
    const query: any = { projectId };

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    if (users.length > 0) {
      query.userId = { $in: users };
    }

    // Obtener datos según el tipo
    if (dataType === 'priorities' || dataType === 'all') {
      const priorities = await Priority.find(query)
        .populate('userId', 'name email')
        .populate('initiativeIds', 'name')
        .sort({ createdAt: -1 })
        .lean();

      if (dataType === 'priorities') {
        headers = ['Título', 'Estado', 'Progreso (%)', 'Usuario', 'Iniciativas', 'Fecha Inicio', 'Fecha Fin', 'Creado'];
        data = priorities.map((p: any) => ({
          'Título': p.title,
          'Estado': p.status,
          'Progreso (%)': p.completionPercentage,
          'Usuario': p.userId?.name || 'N/A',
          'Iniciativas': p.initiativeIds?.map((i: any) => i.name).join(', ') || 'N/A',
          'Fecha Inicio': p.weekStart ? new Date(p.weekStart).toLocaleDateString('es-MX') : 'N/A',
          'Fecha Fin': p.weekEnd ? new Date(p.weekEnd).toLocaleDateString('es-MX') : 'N/A',
          'Creado': new Date(p.createdAt).toLocaleDateString('es-MX')
        }));
      }
    }

    if (dataType === 'messages' || dataType === 'all') {
      // Importar ChannelMessage model
      const ChannelMessage = (await import('@/models/ChannelMessage')).default;

      const messageQuery: any = { projectId };
      if (dateFrom || dateTo) {
        messageQuery.createdAt = {};
        if (dateFrom) messageQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          messageQuery.createdAt.$lte = endDate;
        }
      }
      if (users.length > 0) {
        messageQuery.userId = { $in: users };
      }

      const messages = await ChannelMessage.find(messageQuery)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      if (dataType === 'messages') {
        headers = ['Usuario', 'Contenido', 'Tipo', 'Reacciones', 'Respuestas', 'Fecha'];
        data = messages.map((m: any) => ({
          'Usuario': m.userId?.name || 'N/A',
          'Contenido': m.content?.substring(0, 100) || 'N/A',
          'Tipo': m.commandType || 'mensaje',
          'Reacciones': m.reactions?.length || 0,
          'Respuestas': m.replyCount || 0,
          'Fecha': new Date(m.createdAt).toLocaleString('es-MX')
        }));
      }
    }

    if (dataType === 'all') {
      // Combinar ambos tipos de datos en diferentes secciones
      const priorities = await Priority.find(query)
        .populate('userId', 'name email')
        .populate('initiativeIds', 'name')
        .sort({ createdAt: -1 })
        .lean();

      const ChannelMessage = (await import('@/models/ChannelMessage')).default;
      const messageQuery: any = { projectId };
      if (dateFrom || dateTo) {
        messageQuery.createdAt = {};
        if (dateFrom) messageQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          messageQuery.createdAt.$lte = endDate;
        }
      }
      if (users.length > 0) {
        messageQuery.userId = { $in: users };
      }

      const messages = await ChannelMessage.find(messageQuery)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      // Para formato "all", creamos estructuras separadas
      data = {
        priorities: priorities.map((p: any) => ({
          'Título': p.title,
          'Estado': p.status,
          'Progreso (%)': p.completionPercentage,
          'Usuario': p.userId?.name || 'N/A',
          'Iniciativas': p.initiativeIds?.map((i: any) => i.name).join(', ') || 'N/A',
          'Fecha Inicio': p.weekStart ? new Date(p.weekStart).toLocaleDateString('es-MX') : 'N/A',
          'Fecha Fin': p.weekEnd ? new Date(p.weekEnd).toLocaleDateString('es-MX') : 'N/A',
          'Creado': new Date(p.createdAt).toLocaleDateString('es-MX')
        })),
        messages: messages.map((m: any) => ({
          'Usuario': m.userId?.name || 'N/A',
          'Contenido': m.content?.substring(0, 100) || 'N/A',
          'Tipo': m.commandType || 'mensaje',
          'Reacciones': m.reactions?.length || 0,
          'Respuestas': m.replyCount || 0,
          'Fecha': new Date(m.createdAt).toLocaleString('es-MX')
        }))
      };
    }

    // Generar archivo según el formato
    if (format === 'excel') {
      const wb = XLSX.utils.book_new();

      if (dataType === 'all' && typeof data === 'object' && !Array.isArray(data)) {
        // Crear hojas separadas para prioridades y mensajes
        const wsPriorities = XLSX.utils.json_to_sheet(data.priorities);
        const wsMessages = XLSX.utils.json_to_sheet(data.messages);
        XLSX.utils.book_append_sheet(wb, wsPriorities, 'Prioridades');
        XLSX.utils.book_append_sheet(wb, wsMessages, 'Mensajes');
      } else if (Array.isArray(data)) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, dataType === 'priorities' ? 'Prioridades' : 'Mensajes');
      }

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="export_${project.name}_${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else if (format === 'csv') {
      let csvContent = '';

      if (dataType === 'all' && typeof data === 'object' && !Array.isArray(data)) {
        // Para CSV con "all", incluir ambas secciones
        csvContent += '=== PRIORIDADES ===\n';
        const prioritiesHeaders = Object.keys(data.priorities[0] || {});
        csvContent += prioritiesHeaders.join(',') + '\n';
        data.priorities.forEach((row: any) => {
          csvContent += prioritiesHeaders.map(h => `"${row[h] || ''}"`).join(',') + '\n';
        });

        csvContent += '\n\n=== MENSAJES ===\n';
        const messagesHeaders = Object.keys(data.messages[0] || {});
        csvContent += messagesHeaders.join(',') + '\n';
        data.messages.forEach((row: any) => {
          csvContent += messagesHeaders.map(h => `"${row[h] || ''}"`).join(',') + '\n';
        });
      } else if (Array.isArray(data)) {
        const headers = Object.keys(data[0] || {});
        csvContent = headers.join(',') + '\n';
        data.forEach((row: any) => {
          csvContent += headers.map(h => `"${row[h] || ''}"`).join(',') + '\n';
        });
      }

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="export_${project.name}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'pdf') {
      const doc = new jsPDF();

      // Título
      doc.setFontSize(16);
      doc.text(`Exportación - ${project.name}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 14, 22);

      let startY = 30;

      if (dataType === 'all' && typeof data === 'object' && !Array.isArray(data)) {
        // Prioridades
        doc.setFontSize(12);
        doc.text('Prioridades', 14, startY);
        startY += 5;

        const prioritiesHeaders = Object.keys(data.priorities[0] || {});
        const prioritiesRows = data.priorities.map((p: any) =>
          prioritiesHeaders.map(h => p[h]?.toString() || 'N/A')
        );

        autoTable(doc, {
          startY,
          head: [prioritiesHeaders],
          body: prioritiesRows,
          margin: { top: 30 },
          styles: { fontSize: 8 }
        });

        startY = (doc as any).lastAutoTable.finalY + 10;

        // Mensajes
        doc.setFontSize(12);
        doc.text('Mensajes', 14, startY);
        startY += 5;

        const messagesHeaders = Object.keys(data.messages[0] || {});
        const messagesRows = data.messages.map((m: any) =>
          messagesHeaders.map(h => m[h]?.toString() || 'N/A')
        );

        autoTable(doc, {
          startY,
          head: [messagesHeaders],
          body: messagesRows,
          margin: { top: 30 },
          styles: { fontSize: 8 }
        });
      } else if (Array.isArray(data)) {
        const tableHeaders = Object.keys(data[0] || {});
        const tableRows = data.map((row: any) =>
          tableHeaders.map(h => row[h]?.toString() || 'N/A')
        );

        autoTable(doc, {
          startY,
          head: [tableHeaders],
          body: tableRows,
          margin: { top: 30 },
          styles: { fontSize: 8 }
        });
      }

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="export_${project.name}_${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 });
  } catch (error: any) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

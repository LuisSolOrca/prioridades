import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { trackFeature } from './trackFeature';

interface ReportData {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: {
    label: string;
    value: string | number;
  }[];
}

// Función para cargar el logo
const loadLogo = async (): Promise<string> => {
  try {
    const response = await fetch('/orca-logo.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
};

// Función para limpiar emojis y caracteres UTF-8 problemáticos
const cleanTextForPDF = (text: string | number): string => {
  if (typeof text === 'number') return text.toString();
  // Remover emojis y otros caracteres UTF-8 problemáticos
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Símbolos varios
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .replace(/✓/g, '[OK]') // Checkmark
    .replace(/○/g, '[ ]') // Círculo vacío
    .replace(/📋/g, '') // Clipboard
    .replace(/└─/g, '  |-') // Conectores de árbol
    .trim();
};

// Generar reporte en PDF
export const generatePDFReport = async (data: ReportData, fileName: string = 'Reporte') => {
  const doc = new jsPDF();

  // Cargar y agregar logo
  const logoBase64 = await loadLogo();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 160, 10, 35, 35);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanTextForPDF(data.title), 14, 20);

  // Subtítulo
  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanTextForPDF(data.subtitle), 14, 28);
  }

  // Fecha de generación
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${today}`, 14, data.subtitle ? 35 : 28);

  // Resumen (si existe)
  let startY = data.subtitle ? 42 : 35;
  if (data.summary && data.summary.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Resumen:', 14, startY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    data.summary.forEach((item, index) => {
      doc.text(`${cleanTextForPDF(item.label)}: ${cleanTextForPDF(item.value)}`, 20, startY + 7 + (index * 6));
    });

    startY += 7 + (data.summary.length * 6) + 5;
  }

  // Limpiar headers y rows de caracteres problemáticos
  const cleanedHeaders = data.headers.map(h => cleanTextForPDF(h));
  const cleanedRows = data.rows.map(row => row.map(cell => cleanTextForPDF(cell)));

  // Tabla
  autoTable(doc, {
    head: [cleanedHeaders],
    body: cleanedRows,
    startY: startY,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // blue-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      textColor: [31, 41, 55], // gray-800
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // gray-50
    },
    margin: { top: 10, left: 14, right: 14 },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  });

  // Pie de página
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Guardar
  doc.save(`${fileName}.pdf`);

  // Trackear la generación del reporte
  trackFeature('reportsGenerated').catch(err =>
    console.error('Error tracking report generation:', err)
  );
};

// Generar reporte en DOC
export const generateDOCReport = async (data: ReportData, fileName: string = 'Reporte') => {
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Cargar logo
  const logoBase64 = await loadLogo();

  // Crear secciones del documento
  const sections: any[] = [];

  // Logo (si existe)
  if (logoBase64) {
    try {
      // Convertir base64 a Uint8Array
      const base64Data = logoBase64.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      sections.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: bytes,
              transformation: {
                width: 100,
                height: 100
              },
              type: 'png'
            } as any)
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 }
        })
      );
    } catch (error) {
      console.error('Error adding logo to DOC:', error);
    }
  }

  // Título
  sections.push(
    new Paragraph({
      text: data.title,
      heading: 'Heading1',
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  // Subtítulo
  if (data.subtitle) {
    sections.push(
      new Paragraph({
        text: data.subtitle,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );
  }

  // Fecha
  sections.push(
    new Paragraph({
      text: `Generado: ${today}`,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 }
    })
  );

  // Resumen
  if (data.summary && data.summary.length > 0) {
    sections.push(
      new Paragraph({
        text: 'Resumen:',
        heading: 'Heading2',
        spacing: { before: 200, after: 100 }
      })
    );

    data.summary.forEach(item => {
      sections.push(
        new Paragraph({
          text: `${item.label}: ${item.value}`,
          spacing: { after: 50 }
        })
      );
    });

    sections.push(
      new Paragraph({
        text: '',
        spacing: { after: 200 }
      })
    );
  }

  // Tabla
  const tableRows = [
    // Headers
    new TableRow({
      children: data.headers.map(header =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: header, bold: true, color: 'FFFFFF' })]
          })],
          shading: { fill: '2563EB' }, // blue-600
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        })
      )
    }),
    // Rows
    ...data.rows.map((row, rowIndex) =>
      new TableRow({
        children: row.map(cell =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: String(cell) })]
            })],
            shading: rowIndex % 2 === 0 ? { fill: 'FFFFFF' } : { fill: 'F9FAFB' },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          })
        )
      })
    )
  ];

  const table = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  });

  sections.push(table);

  // Crear documento
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });

  // Generar y guardar
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);

  // Trackear la generación del reporte
  trackFeature('reportsGenerated').catch(err =>
    console.error('Error tracking report generation:', err)
  );
};

// Tipos de reportes predefinidos
export const generatePrioritiesReport = async (
  priorities: any[],
  users: any[],
  initiatives: any[],
  format: 'pdf' | 'doc',
  filters?: string
) => {
  const data: ReportData = {
    title: 'Reporte de Prioridades',
    subtitle: filters || 'Reporte completo de prioridades',
    headers: ['Título', 'Usuario', 'Iniciativa', 'Estado', '% Completado', 'Semana'],
    rows: priorities.map(p => {
      const user = users.find(u => u._id === p.userId);
      const initiative = initiatives.find(i => i._id === p.initiativeId);
      const weekStart = new Date(p.weekStart).toLocaleDateString('es-MX');

      return [
        p.title,
        user?.name || 'N/A',
        initiative?.name || 'N/A',
        p.status,
        `${p.completionPercentage}%`,
        weekStart
      ];
    }),
    summary: [
      { label: 'Total de Prioridades', value: priorities.length },
      { label: 'Completadas', value: priorities.filter(p => p.status === 'COMPLETADO').length },
      { label: 'En Tiempo', value: priorities.filter(p => p.status === 'EN_TIEMPO').length },
      { label: 'En Riesgo', value: priorities.filter(p => p.status === 'EN_RIESGO').length },
      { label: 'Bloqueadas', value: priorities.filter(p => p.status === 'BLOQUEADO').length }
    ]
  };

  const fileName = `Reporte_Prioridades_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

export const generateUserPerformanceReport = async (
  users: any[],
  priorities: any[],
  format: 'pdf' | 'doc',
  filters?: string
) => {
  const userStats = users.map(user => {
    const userPriorities = priorities.filter(p => p.userId === user._id);
    const completed = userPriorities.filter(p => p.status === 'COMPLETADO').length;
    const avgCompletion = userPriorities.length > 0
      ? userPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / userPriorities.length
      : 0;
    const completionRate = userPriorities.length > 0
      ? (completed / userPriorities.length * 100).toFixed(1)
      : '0';

    return {
      name: user.name,
      role: user.role,
      total: userPriorities.length,
      completed,
      completionRate: `${completionRate}%`,
      avgCompletion: `${avgCompletion.toFixed(1)}%`
    };
  });

  const data: ReportData = {
    title: 'Reporte de Rendimiento de Usuarios',
    subtitle: filters || 'Análisis de rendimiento por usuario',
    headers: ['Usuario', 'Rol', 'Total', 'Completadas', 'Tasa Completado', 'Promedio Avance'],
    rows: userStats.map(stat => [
      stat.name,
      stat.role === 'ADMIN' ? 'Administrador' : 'Usuario',
      stat.total,
      stat.completed,
      stat.completionRate,
      stat.avgCompletion
    ]),
    summary: [
      { label: 'Total de Usuarios', value: users.length },
      { label: 'Total de Prioridades', value: priorities.length }
    ]
  };

  const fileName = `Reporte_Rendimiento_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

export const generateInitiativesReport = async (
  initiatives: any[],
  priorities: any[],
  format: 'pdf' | 'doc',
  filters?: string
) => {
  const initiativeStats = initiatives.map(initiative => {
    const initiativePriorities = priorities.filter(p => p.initiativeId === initiative._id);
    const completed = initiativePriorities.filter(p => p.status === 'COMPLETADO').length;
    const percentage = priorities.length > 0
      ? (initiativePriorities.length / priorities.length * 100).toFixed(1)
      : '0';

    return {
      name: initiative.name,
      description: initiative.description || 'Sin descripción',
      total: initiativePriorities.length,
      completed,
      percentage: `${percentage}%`,
      active: initiative.isActive ? 'Activa' : 'Inactiva'
    };
  }).sort((a, b) => b.total - a.total);

  const data: ReportData = {
    title: 'Reporte de Iniciativas Estratégicas',
    subtitle: filters || 'Distribución de prioridades por iniciativa',
    headers: ['Iniciativa', 'Descripción', 'Total', 'Completadas', 'Porcentaje', 'Estado'],
    rows: initiativeStats.map(stat => [
      stat.name,
      stat.description,
      stat.total,
      stat.completed,
      stat.percentage,
      stat.active
    ]),
    summary: [
      { label: 'Total de Iniciativas', value: initiatives.length },
      { label: 'Iniciativas Activas', value: initiatives.filter(i => i.isActive).length },
      { label: 'Total de Prioridades', value: priorities.length }
    ]
  };

  const fileName = `Reporte_Iniciativas_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

export const generateChecklistReport = async (
  priorities: any[],
  users: any[],
  initiatives: any[],
  format: 'pdf' | 'doc',
  filters?: string
) => {
  // Filtrar solo prioridades que tienen checklist
  const prioritiesWithChecklist = priorities.filter(p => p.checklist && p.checklist.length > 0);

  const rows: (string | number)[][] = [];

  prioritiesWithChecklist.forEach(priority => {
    const user = users.find(u => u._id === priority.userId);
    const initiative = initiatives.find(i => i._id === priority.initiativeId);
    const weekStart = new Date(priority.weekStart).toLocaleDateString('es-MX');

    const totalItems = priority.checklist.length;
    const completedItems = priority.checklist.filter((item: any) => item.completed).length;
    const checklistProgress = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : '0';

    // Fila principal con la prioridad
    rows.push([
      priority.title || '',
      user?.name || 'N/A',
      initiative?.name || 'N/A',
      weekStart,
      `${completedItems}/${totalItems}`,
      `${checklistProgress}%`
    ]);

    // Filas con los items del checklist (indentadas)
    priority.checklist.forEach((item: any) => {
      rows.push([
        `  - ${item.text || ''}`,
        '',
        '',
        '',
        item.completed ? 'Completado' : 'Pendiente',
        ''
      ]);
    });

    // Fila separadora
    rows.push(['', '', '', '', '', '']);
  });

  const totalPrioritiesWithChecklist = prioritiesWithChecklist.length;
  const totalChecklistItems = prioritiesWithChecklist.reduce((sum, p) => sum + (p.checklist?.length || 0), 0);
  const totalCompletedItems = prioritiesWithChecklist.reduce(
    (sum, p) => sum + (p.checklist?.filter((item: any) => item.completed).length || 0),
    0
  );
  const overallProgress = totalChecklistItems > 0
    ? ((totalCompletedItems / totalChecklistItems) * 100).toFixed(1)
    : '0';

  const data: ReportData = {
    title: 'Reporte de Checklists de Prioridades',
    subtitle: filters || 'Avance detallado de tareas en checklists',
    headers: ['Prioridad / Tarea', 'Usuario', 'Iniciativa', 'Semana', 'Progreso', '% Checklist'],
    rows: rows,
    summary: [
      { label: 'Prioridades con Checklist', value: totalPrioritiesWithChecklist },
      { label: 'Total de Tareas', value: totalChecklistItems },
      { label: 'Tareas Completadas', value: totalCompletedItems },
      { label: 'Tareas Pendientes', value: totalChecklistItems - totalCompletedItems },
      { label: 'Avance General', value: `${overallProgress}%` }
    ]
  };

  const fileName = `Reporte_Checklists_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

export const generateAzureDevOpsReport = async (
  priorities: any[],
  users: any[],
  initiatives: any[],
  format: 'pdf' | 'doc',
  filters?: string
) => {
  // Filtrar solo prioridades sincronizadas con Azure DevOps
  const prioritiesWithAzureDevOps = priorities.filter(p => p.azureDevOps);

  const rows: (string | number)[][] = [];

  prioritiesWithAzureDevOps.forEach(priority => {
    const user = users.find(u => u._id === priority.userId);
    const initiative = initiatives.find(i => i._id === priority.initiativeId);
    const weekStart = new Date(priority.weekStart).toLocaleDateString('es-MX');

    const workItemId = priority.azureDevOps.workItemId;
    const workItemType = priority.azureDevOps.workItemType;

    // Fila principal de la prioridad
    rows.push([
      `📋 ${priority.title}`,
      user?.name || 'Desconocido',
      initiative?.name || 'Sin iniciativa',
      weekStart,
      priority.status,
      `WI #${workItemId} (${workItemType})`
    ]);

    // Agregar tareas del checklist si existen
    if (priority.checklist && priority.checklist.length > 0) {
      priority.checklist.forEach((item: any) => {
        const status = item.completed ? '✓ Completada' : '○ Pendiente';
        // Nota: Las horas reales están en Azure DevOps, aquí solo mostramos el estado
        rows.push([
          `  └─ ${item.text}`,
          '',
          '',
          '',
          status,
          'Ver en Azure DevOps'
        ]);
      });
    }
  });

  const totalPriorities = prioritiesWithAzureDevOps.length;
  const totalTasks = prioritiesWithAzureDevOps.reduce(
    (sum, p) => sum + (p.checklist?.length || 0),
    0
  );
  const completedTasks = prioritiesWithAzureDevOps.reduce(
    (sum, p) => sum + (p.checklist?.filter((item: any) => item.completed).length || 0),
    0
  );

  const data: ReportData = {
    title: 'Reporte de Prioridades Sincronizadas con Azure DevOps',
    subtitle: filters || 'Prioridades exportadas a Azure DevOps con sus tareas',
    headers: ['Prioridad / Tarea', 'Usuario', 'Iniciativa', 'Semana', 'Estado', 'Work Item'],
    rows: rows,
    summary: [
      { label: 'Prioridades Sincronizadas', value: totalPriorities },
      { label: 'Total de Tareas', value: totalTasks },
      { label: 'Tareas Completadas', value: completedTasks },
      { label: 'Tareas Pendientes', value: totalTasks - completedTasks },
      { label: 'Nota', value: 'Las horas trabajadas están registradas en Azure DevOps' }
    ]
  };

  const fileName = `Reporte_AzureDevOps_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

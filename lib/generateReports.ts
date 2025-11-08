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
  summaryTable?: {
    headers: string[];
    rows: (string | number)[][];
  };
  summaryTableTitle?: string;
  taskMetrics?: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionPercentage: number;
  };
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

// Función para dibujar gráfica de progreso circular
const drawProgressChart = (doc: jsPDF, x: number, y: number, percentage: number, label: string) => {
  const radius = 20;
  const centerX = x + radius;
  const centerY = y + radius;

  // Círculo de fondo (gris)
  doc.setFillColor(230, 230, 230);
  doc.circle(centerX, centerY, radius, 'F');

  // Círculo de progreso (verde)
  if (percentage > 0) {
    doc.setFillColor(34, 197, 94); // green-500
    const angle = (percentage / 100) * 360;
    const startAngle = -90; // Empezar desde arriba
    const endAngle = startAngle + angle;

    // Dibujar arco de progreso
    for (let i = startAngle; i < endAngle; i += 1) {
      const rad1 = (i * Math.PI) / 180;
      const rad2 = ((i + 1) * Math.PI) / 180;
      doc.triangle(
        centerX,
        centerY,
        centerX + radius * Math.cos(rad1),
        centerY + radius * Math.sin(rad1),
        centerX + radius * Math.cos(rad2),
        centerY + radius * Math.sin(rad2),
        'F'
      );
    }
  }

  // Círculo interno blanco
  doc.setFillColor(255, 255, 255);
  doc.circle(centerX, centerY, radius * 0.7, 'F');

  // Porcentaje en el centro
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  const percentText = `${percentage}%`;
  const textWidth = doc.getTextWidth(percentText);
  doc.text(percentText, centerX - textWidth / 2, centerY + 4);

  // Label debajo
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const labelWidth = doc.getTextWidth(label);
  doc.text(label, centerX - labelWidth / 2, centerY + radius + 8);
};

// Función para dibujar barra de progreso horizontal
const drawProgressBar = (doc: jsPDF, x: number, y: number, width: number, completed: number, total: number) => {
  const barHeight = 20;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  // Fondo de la barra
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(x, y, width, barHeight, 3, 3, 'F');

  // Barra de progreso
  if (percentage > 0) {
    doc.setFillColor(34, 197, 94); // green-500
    const progressWidth = (width * percentage) / 100;
    doc.roundedRect(x, y, progressWidth, barHeight, 3, 3, 'F');
  }

  // Texto en el centro
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  const text = `${completed} / ${total} (${Math.round(percentage)}%)`;
  const textWidth = doc.getTextWidth(text);
  doc.text(text, x + (width - textWidth) / 2, y + barHeight / 2 + 3);
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

  // Métricas de tareas (si existen)
  let startY = data.subtitle ? 42 : 35;
  if (data.taskMetrics) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Métricas de Completado', 14, startY);

    startY += 10;

    // Barra de progreso horizontal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Progreso General:', 14, startY);
    startY += 5;
    drawProgressBar(doc, 14, startY, 180, data.taskMetrics.completedTasks, data.taskMetrics.totalTasks);

    startY += 30;

    // Gráfica circular de porcentaje de completado
    drawProgressChart(doc, 20, startY, Math.round(data.taskMetrics.completionPercentage), 'Completado');

    // Métricas en tarjetas
    const cardX = 80;
    doc.setFillColor(240, 253, 244); // green-50
    doc.roundedRect(cardX, startY, 50, 30, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Total Tareas', cardX + 25 - doc.getTextWidth('Total Tareas') / 2, startY + 10);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74); // green-600
    doc.text(data.taskMetrics.totalTasks.toString(), cardX + 25 - doc.getTextWidth(data.taskMetrics.totalTasks.toString()) / 2, startY + 22);

    const cardX2 = cardX + 60;
    doc.setFillColor(220, 252, 231); // green-100
    doc.roundedRect(cardX2, startY, 50, 30, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Completadas', cardX2 + 25 - doc.getTextWidth('Completadas') / 2, startY + 10);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(data.taskMetrics.completedTasks.toString(), cardX2 + 25 - doc.getTextWidth(data.taskMetrics.completedTasks.toString()) / 2, startY + 22);

    // Agregar nueva página después de las métricas para evitar encimarse
    doc.addPage();
    startY = 20;
  }

  // Resumen (si existe)
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

  // Tabla de resumen por persona (si existe)
  if (data.summaryTable) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(data.summaryTableTitle || 'Resumen:', 14, startY);

    startY += 7;

    const cleanedSummaryHeaders = data.summaryTable.headers.map(h => cleanTextForPDF(h));
    const cleanedSummaryRows = data.summaryTable.rows.map(row => row.map(cell => cleanTextForPDF(cell)));

    autoTable(doc, {
      head: [cleanedSummaryHeaders],
      body: cleanedSummaryRows,
      startY: startY,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129], // green-500
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        textColor: [31, 41, 55],
        halign: 'center'
      },
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 10,
        cellPadding: 4
      }
    });

    startY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Limpiar headers y rows de caracteres problemáticos
  const cleanedHeaders = data.headers.map(h => cleanTextForPDF(h));
  const cleanedRows = data.rows.map(row => row.map(cell => cleanTextForPDF(cell)));

  // Tabla principal
  if (data.summaryTable) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Detalle de Tareas:', 14, startY);
    startY += 7;
  }

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

  // Tabla de resumen por persona (si existe)
  if (data.summaryTable) {
    sections.push(
      new Paragraph({
        text: data.summaryTableTitle || 'Resumen:',
        heading: 'Heading2',
        spacing: { before: 200, after: 100 }
      })
    );

    const summaryTableRows = [
      // Headers
      new TableRow({
        children: data.summaryTable.headers.map(header =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: header, bold: true, color: 'FFFFFF' })]
            })],
            shading: { fill: '10B981' }, // green-500
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          })
        )
      }),
      // Rows
      ...data.summaryTable.rows.map((row, rowIndex) =>
        new TableRow({
          children: row.map(cell =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: String(cell) })],
                alignment: AlignmentType.CENTER
              })],
              shading: rowIndex % 2 === 0 ? { fill: 'FFFFFF' } : { fill: 'F9FAFB' },
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            })
          )
        })
      )
    ];

    const summaryTable = new Table({
      rows: summaryTableRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    });

    sections.push(summaryTable);

    sections.push(
      new Paragraph({
        text: '',
        spacing: { after: 400 }
      })
    );

    sections.push(
      new Paragraph({
        text: 'Detalle de Tareas:',
        heading: 'Heading2',
        spacing: { before: 200, after: 100 }
      })
    );
  }

  // Tabla principal
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
    headers: ['Título', 'Usuario', 'Iniciativas', 'Estado', '% Completado', 'Semana'],
    rows: priorities.map(p => {
      const user = users.find(u => u._id === p.userId);

      // Obtener nombres de iniciativas (soporta tanto initiativeId como initiativeIds)
      let initiativeNames = 'Sin iniciativa';
      if (p.initiativeIds && Array.isArray(p.initiativeIds) && p.initiativeIds.length > 0) {
        // Caso nuevo: array de iniciativas
        const priorityInitiatives = p.initiativeIds
          .map((id: any) => initiatives.find(i => i._id === id || i._id === id?._id))
          .filter((init: any) => init !== undefined);
        initiativeNames = priorityInitiatives.map((init: any) => init.name).join(', ');
      } else if (p.initiativeId) {
        // Caso legacy: iniciativa única
        const initiative = initiatives.find(i => i._id === p.initiativeId || i._id === p.initiativeId?._id);
        initiativeNames = initiative?.name || 'Sin iniciativa';
      }

      const weekStart = new Date(p.weekStart).toLocaleDateString('es-MX');

      return [
        p.title,
        user?.name || 'N/A',
        initiativeNames,
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
    // Filtrar prioridades que incluyan esta iniciativa (soporta tanto initiativeId como initiativeIds)
    const initiativePriorities = priorities.filter(p => {
      // Caso nuevo: array de iniciativas
      if (p.initiativeIds && Array.isArray(p.initiativeIds)) {
        return p.initiativeIds.some((id: any) => id === initiative._id || id?._id === initiative._id);
      }
      // Caso legacy: iniciativa única
      if (p.initiativeId) {
        return p.initiativeId === initiative._id || p.initiativeId?._id === initiative._id;
      }
      return false;
    });

    const completed = initiativePriorities.filter(p => p.status === 'COMPLETADO').length;
    const inProgress = initiativePriorities.filter(p => p.status === 'EN_TIEMPO').length;
    const atRisk = initiativePriorities.filter(p => p.status === 'EN_RIESGO').length;
    const blocked = initiativePriorities.filter(p => p.status === 'BLOQUEADO').length;

    // Porcentaje de completado dentro de esta iniciativa
    const completionRate = initiativePriorities.length > 0
      ? (completed / initiativePriorities.length * 100).toFixed(1)
      : '0';

    return {
      name: initiative.name,
      description: initiative.description || 'Sin descripción',
      total: initiativePriorities.length,
      completed,
      inProgress,
      atRisk,
      blocked,
      completionRate: `${completionRate}%`,
      active: initiative.isActive ? 'Activa' : 'Inactiva'
    };
  }).sort((a, b) => b.total - a.total);

  const data: ReportData = {
    title: 'Reporte de Iniciativas Estratégicas',
    subtitle: filters || 'Distribución de prioridades por iniciativa',
    headers: ['Iniciativa', 'Descripción', 'Total', 'Completadas', 'En Tiempo', 'En Riesgo', 'Bloqueadas', '% Completado', 'Estado'],
    rows: initiativeStats.map(stat => [
      stat.name,
      stat.description,
      stat.total,
      stat.completed,
      stat.inProgress,
      stat.atRisk,
      stat.blocked,
      stat.completionRate,
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
  console.log('🔍 [Azure DevOps Report] Total priorities received:', priorities.length);
  console.log('🔍 [Azure DevOps Report] Unique users in priorities:', [...new Set(priorities.map(p => p.userId))]);

  // Filtrar solo prioridades sincronizadas con Azure DevOps
  const prioritiesWithAzureDevOps = priorities.filter(p => p.azureDevOps);

  console.log('🔍 [Azure DevOps Report] Priorities with Azure DevOps:', prioritiesWithAzureDevOps.length);
  console.log('🔍 [Azure DevOps Report] Users with Azure DevOps priorities:', [...new Set(prioritiesWithAzureDevOps.map(p => p.userId))]);

  if (prioritiesWithAzureDevOps.length === 0) {
    throw new Error('No hay prioridades sincronizadas con Azure DevOps');
  }

  // Obtener clientes
  let clients: any[] = [];
  try {
    const clientsResponse = await fetch('/api/clients');
    if (clientsResponse.ok) {
      clients = await clientsResponse.json();
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
  }

  // Obtener datos enriquecidos con horas desde el API
  const priorityIds = prioritiesWithAzureDevOps.map(p => p._id).join(',');
  let enrichedDataMap = new Map();

  try {
    const response = await fetch(`/api/azure-devops/report-data?priorityIds=${priorityIds}`);
    if (response.ok) {
      const result = await response.json();
      // Crear un mapa para acceso rápido por priorityId
      enrichedDataMap = new Map(
        result.data.map((item: any) => [item.priorityId, item])
      );
    }
  } catch (error) {
    console.error('Error fetching enriched data:', error);
  }

  const rows: (string | number)[][] = [];
  let totalHours = 0;
  const hoursByUser = new Map<string, number>(); // Acumulador de horas por usuario

  prioritiesWithAzureDevOps.forEach(priority => {
    const user = users.find(u => u._id === priority.userId);
    const weekStart = new Date(priority.weekStart).toLocaleDateString('es-MX');

    const workItemId = priority.azureDevOps.workItemId;
    const workItemType = priority.azureDevOps.workItemType;

    // Obtener iniciativas (puede ser un array o un ID único)
    let initiativeNames = 'Sin iniciativa';
    if (priority.initiativeIds && Array.isArray(priority.initiativeIds) && priority.initiativeIds.length > 0) {
      // Caso nuevo: array de iniciativas
      const priorityInitiatives = priority.initiativeIds
        .map((id: any) => initiatives.find(i => i._id === id))
        .filter((init: any) => init !== undefined);
      initiativeNames = priorityInitiatives.map((init: any) => init.name).join(', ');
    } else if (priority.initiativeId) {
      // Caso legacy: iniciativa única
      const initiative = initiatives.find(i => i._id === priority.initiativeId);
      initiativeNames = initiative?.name || 'Sin iniciativa';
    }

    // Obtener cliente
    const client = clients.find(c => c._id === priority.clientId);
    const clientName = client?.name || 'No especificado';

    // Obtener datos enriquecidos de esta prioridad
    const enrichedData = enrichedDataMap.get(priority._id);

    // Si tiene checklist, agregar cada tarea como una fila
    if (priority.checklist && priority.checklist.length > 0) {
      priority.checklist.forEach((item: any) => {
        const status = item.completed ? '✓ Completada' : '○ Pendiente';

        // Buscar las horas en los datos enriquecidos
        let hours = 0;
        if (enrichedData && enrichedData.tasks) {
          const taskData = enrichedData.tasks.find((t: any) => t.title === item.text);
          if (taskData) {
            hours = taskData.completedWork;
            totalHours += hours;

            // Acumular horas por usuario
            const userName = user?.name || 'Desconocido';
            hoursByUser.set(userName, (hoursByUser.get(userName) || 0) + hours);
          }
        }

        rows.push([
          `📋 ${priority.title}`,
          item.text,
          user?.name || 'Desconocido',
          clientName,
          initiativeNames,
          weekStart,
          status,
          hours > 0 ? `${hours} horas` : '0 horas',
          `WI #${workItemId}`
        ]);
      });
    } else {
      // Si no tiene checklist, agregar solo la fila de la prioridad
      rows.push([
        `📋 ${priority.title}`,
        'Sin tareas',
        user?.name || 'Desconocido',
        clientName,
        initiativeNames,
        weekStart,
        priority.status,
        '0 horas',
        `WI #${workItemId}`
      ]);
    }
  });

  // Crear tabla de resumen por persona
  const summaryTableRows: (string | number)[][] = [];
  hoursByUser.forEach((hours, userName) => {
    summaryTableRows.push([userName, `${hours} horas`]);
  });

  // Ordenar por horas descendente
  summaryTableRows.sort((a, b) => {
    const hoursA = parseFloat(String(a[1]).replace(' horas', ''));
    const hoursB = parseFloat(String(b[1]).replace(' horas', ''));
    return hoursB - hoursA;
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

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const data: ReportData = {
    title: 'Reporte de Prioridades Sincronizadas con Azure DevOps',
    subtitle: filters || 'Prioridades exportadas a Azure DevOps con sus tareas y horas',
    headers: ['Prioridad', 'Tarea', 'Usuario', 'Cliente', 'Iniciativa', 'Semana', 'Estado', 'Horas', 'Work Item'],
    rows: rows,
    summary: [
      { label: 'Prioridades Sincronizadas', value: totalPriorities },
      { label: 'Total de Tareas', value: totalTasks },
      { label: 'Tareas Completadas', value: completedTasks },
      { label: 'Tareas Pendientes', value: totalTasks - completedTasks },
      { label: 'Total de Horas Trabajadas', value: `${totalHours} horas` }
    ],
    summaryTable: {
      headers: ['Usuario', 'Total de Horas'],
      rows: summaryTableRows
    },
    summaryTableTitle: 'Resumen de Horas por Persona:',
    taskMetrics: {
      totalTasks: totalTasks,
      completedTasks: completedTasks,
      pendingTasks: totalTasks - completedTasks,
      completionPercentage: completionPercentage
    }
  };

  const fileName = `Reporte_AzureDevOps_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

export const generateLocalHoursReport = async (
  selectedUser: string,
  selectedArea: string,
  selectedClient: string,
  dateFrom: string,
  dateTo: string,
  format: 'pdf' | 'doc',
  filters?: string
) => {
  // Construir los parámetros de la consulta
  const params = new URLSearchParams();

  if (dateFrom && dateTo) {
    params.append('startDate', dateFrom);
    params.append('endDate', dateTo);
  }

  if (selectedUser !== 'all') {
    params.append('userId', selectedUser);
  }

  if (selectedArea !== 'all') {
    params.append('area', selectedArea);
  }

  if (selectedClient !== 'all') {
    params.append('clientId', selectedClient);
  }

  // Obtener datos del API
  const response = await fetch(`/api/reports/local-hours?${params}`);
  if (!response.ok) {
    throw new Error('Error al obtener datos del reporte de horas locales');
  }

  const reportData = await response.json();

  if (!reportData.priorities || reportData.priorities.length === 0) {
    throw new Error('No se encontraron prioridades con horas registradas en el período seleccionado');
  }

  const rows: (string | number)[][] = [];
  let totalHours = 0;
  const hoursByUser = new Map<string, number>();

  reportData.priorities.forEach((priority: any) => {
    const weekStart = new Date(priority.weekStart).toLocaleDateString('es-MX');
    const weekEnd = new Date(priority.weekEnd).toLocaleDateString('es-MX');
    const clientName = priority.client?.name || 'No especificado';

    priority.tasks.forEach((task: any) => {
      rows.push([
        `📋 ${priority.title}`,
        task.text,
        priority.userName,
        clientName,
        `${weekStart} - ${weekEnd}`,
        `${task.hours} horas`
      ]);

      totalHours += task.hours;
      hoursByUser.set(priority.userName, (hoursByUser.get(priority.userName) || 0) + task.hours);
    });
  });

  // Crear tabla resumen de horas por usuario
  const summaryTableRows: (string | number)[][] = [];
  hoursByUser.forEach((hours, userName) => {
    summaryTableRows.push([userName, `${hours} horas`]);
  });

  const subtitle = filters || (dateFrom && dateTo
    ? `Período: ${new Date(dateFrom).toLocaleDateString('es-MX')} - ${new Date(dateTo).toLocaleDateString('es-MX')}`
    : 'Todas las prioridades');

  // Las tareas en el reporte local ya están completadas (solo incluimos completed tasks)
  const totalTasks = reportData.summary.totalTasks;
  const completedTasks = totalTasks; // Todas las tareas del reporte están completadas
  const completionPercentage = 100; // 100% porque solo mostramos completadas

  const data: ReportData = {
    title: 'Reporte de Horas - Prioridades Locales',
    subtitle: subtitle,
    headers: ['Prioridad', 'Tarea', 'Usuario', 'Cliente', 'Semana', 'Horas'],
    rows: rows,
    summary: [
      { label: 'Total de Prioridades', value: reportData.summary.totalPriorities },
      { label: 'Total de Tareas', value: totalTasks },
      { label: 'Total de Horas Trabajadas', value: `${reportData.summary.totalHours} horas` }
    ],
    summaryTable: {
      headers: ['Usuario', 'Total de Horas'],
      rows: summaryTableRows
    },
    summaryTableTitle: 'Resumen de Horas por Persona:',
    taskMetrics: {
      totalTasks: totalTasks,
      completedTasks: completedTasks,
      pendingTasks: 0,
      completionPercentage: completionPercentage
    }
  };

  const fileName = `Reporte_HorasLocales_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

export const generateClientBreakdownReport = async (
  priorities: any[],
  users: any[],
  clients: any[],
  initiatives: any[],
  format: 'pdf' | 'doc',
  filters?: string
) => {
  // Trackear generación de reporte
  await trackFeature('reportsGenerated');

  // Agrupar prioridades por cliente
  const prioritiesByClient = new Map<string, any[]>();
  const clientHours = new Map<string, number>();

  priorities.forEach(priority => {
    // Solo usar 'sin-cliente' si clientId es undefined, null o vacío
    const clientId = (priority.clientId && priority.clientId.trim() !== '') ? priority.clientId : 'sin-cliente';
    if (!prioritiesByClient.has(clientId)) {
      prioritiesByClient.set(clientId, []);
    }
    prioritiesByClient.get(clientId)!.push(priority);

    // Calcular horas trabajadas de las tareas completadas
    if (priority.checklist && priority.checklist.length > 0) {
      const completedHours = priority.checklist
        .filter((task: any) => task.completed && task.completedHours)
        .reduce((sum: number, task: any) => sum + (task.completedHours || 0), 0);

      clientHours.set(clientId, (clientHours.get(clientId) || 0) + completedHours);
    }
  });

  // Crear filas del reporte
  const rows: (string | number)[][] = [];
  let totalHours = 0;
  let totalPriorities = 0;

  // Ordenar clientes por horas trabajadas (de mayor a menor)
  const sortedClients = Array.from(prioritiesByClient.entries()).sort((a, b) => {
    const hoursA = clientHours.get(a[0]) || 0;
    const hoursB = clientHours.get(b[0]) || 0;
    return hoursB - hoursA;
  });

  sortedClients.forEach(([clientId, clientPriorities]) => {
    const client = clientId !== 'sin-cliente' ? clients.find(c => c._id === clientId) : null;
    const clientName = client ? client.name : 'Cliente no definido';
    const hours = clientHours.get(clientId) || 0;

    clientPriorities.forEach(priority => {
      const user = users.find(u => u._id === priority.userId);
      const weekStart = new Date(priority.weekStart).toLocaleDateString('es-MX');
      const weekEnd = new Date(priority.weekEnd).toLocaleDateString('es-MX');

      // Calcular horas de esta prioridad específica
      const priorityHours = priority.checklist && priority.checklist.length > 0
        ? priority.checklist
            .filter((task: any) => task.completed && task.completedHours)
            .reduce((sum: number, task: any) => sum + (task.completedHours || 0), 0)
        : 0;

      const statusText = priority.status === 'COMPLETADO' ? 'Completado' :
                        priority.status === 'EN_TIEMPO' ? 'En Tiempo' :
                        priority.status === 'EN_RIESGO' ? 'En Riesgo' :
                        priority.status === 'BLOQUEADO' ? 'Bloqueado' :
                        priority.status === 'REPROGRAMADO' ? 'Reprogramado' : priority.status;

      rows.push([
        clientName,
        `📋 ${priority.title}`,
        user?.name || 'Desconocido',
        `${weekStart} - ${weekEnd}`,
        statusText,
        `${priority.completionPercentage}%`,
        `${priorityHours.toFixed(2)} hrs`
      ]);

      totalPriorities++;
    });

    totalHours += hours;
  });

  // Crear tabla resumen por cliente
  const summaryTableRows: (string | number)[][] = [];
  sortedClients.forEach(([clientId, clientPriorities]) => {
    const client = clientId !== 'sin-cliente' ? clients.find(c => c._id === clientId) : null;
    const clientName = client ? client.name : 'Cliente no definido';
    const hours = clientHours.get(clientId) || 0;
    const priorityCount = clientPriorities.length;

    summaryTableRows.push([
      clientName,
      priorityCount,
      `${hours.toFixed(2)} hrs`
    ]);
  });

  const data: ReportData = {
    title: 'Reporte de Breakdown por Cliente',
    subtitle: filters || 'Todas las prioridades',
    headers: ['Cliente', 'Prioridad', 'Usuario', 'Semana', 'Estado', 'Avance', 'Horas'],
    rows: rows,
    summary: [
      { label: 'Total de Clientes', value: prioritiesByClient.size },
      { label: 'Total de Prioridades', value: totalPriorities },
      { label: 'Total de Horas Trabajadas', value: `${totalHours.toFixed(2)} horas` }
    ],
    summaryTable: {
      headers: ['Cliente', 'Prioridades', 'Total Horas'],
      rows: summaryTableRows
    },
    summaryTableTitle: 'Resumen de Horas por Cliente:'
  };

  const fileName = `Reporte_BreakdownClientes_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

export const generateProjectBreakdownReport = async (
  priorities: any[],
  users: any[],
  projects: any[],
  initiatives: any[],
  format: 'pdf' | 'doc',
  filters?: string
) => {
  // Trackear generación de reporte
  await trackFeature('reportsGenerated');

  // Agrupar prioridades por proyecto
  const prioritiesByProject = new Map<string, any[]>();
  const projectHours = new Map<string, number>();

  priorities.forEach(priority => {
    // Solo usar 'sin-proyecto' si projectId es undefined, null o vacío
    const projectId = (priority.projectId && priority.projectId.trim() !== '') ? priority.projectId : 'sin-proyecto';
    if (!prioritiesByProject.has(projectId)) {
      prioritiesByProject.set(projectId, []);
    }
    prioritiesByProject.get(projectId)!.push(priority);

    // Calcular horas trabajadas de las tareas completadas
    if (priority.checklist && priority.checklist.length > 0) {
      const completedHours = priority.checklist
        .filter((task: any) => task.completed && task.completedHours)
        .reduce((sum: number, task: any) => sum + (task.completedHours || 0), 0);

      projectHours.set(projectId, (projectHours.get(projectId) || 0) + completedHours);
    }
  });

  // Crear filas del reporte
  const rows: (string | number)[][] = [];
  let totalHours = 0;
  let totalPriorities = 0;

  // Ordenar proyectos por horas trabajadas (de mayor a menor)
  const sortedProjects = Array.from(prioritiesByProject.entries()).sort((a, b) => {
    const hoursA = projectHours.get(a[0]) || 0;
    const hoursB = projectHours.get(b[0]) || 0;
    return hoursB - hoursA;
  });

  sortedProjects.forEach(([projectId, projectPriorities]) => {
    const project = projectId !== 'sin-proyecto' ? projects.find(p => p._id === projectId) : null;
    const projectName = project ? project.name : 'Sin proyecto';
    const hours = projectHours.get(projectId) || 0;

    projectPriorities.forEach(priority => {
      const user = users.find(u => u._id === priority.userId);
      const weekStart = new Date(priority.weekStart).toLocaleDateString('es-MX');
      const weekEnd = new Date(priority.weekEnd).toLocaleDateString('es-MX');

      // Calcular horas de esta prioridad específica
      const priorityHours = priority.checklist && priority.checklist.length > 0
        ? priority.checklist
            .filter((task: any) => task.completed && task.completedHours)
            .reduce((sum: number, task: any) => sum + (task.completedHours || 0), 0)
        : 0;

      const statusText = priority.status === 'COMPLETADO' ? 'Completado' :
                        priority.status === 'EN_TIEMPO' ? 'En Tiempo' :
                        priority.status === 'EN_RIESGO' ? 'En Riesgo' :
                        priority.status === 'BLOQUEADO' ? 'Bloqueado' :
                        priority.status === 'REPROGRAMADO' ? 'Reprogramado' : priority.status;

      rows.push([
        projectName,
        `📋 ${priority.title}`,
        user?.name || 'Desconocido',
        `${weekStart} - ${weekEnd}`,
        statusText,
        `${priority.completionPercentage}%`,
        `${priorityHours.toFixed(2)} hrs`
      ]);

      totalPriorities++;
    });

    totalHours += hours;
  });

  // Crear tabla resumen por proyecto
  const summaryTableRows: (string | number)[][] = [];
  sortedProjects.forEach(([projectId, projectPriorities]) => {
    const project = projectId !== 'sin-proyecto' ? projects.find(p => p._id === projectId) : null;
    const projectName = project ? project.name : 'Sin proyecto';
    const hours = projectHours.get(projectId) || 0;
    const priorityCount = projectPriorities.length;

    summaryTableRows.push([
      projectName,
      priorityCount,
      `${hours.toFixed(2)} hrs`
    ]);
  });

  const data: ReportData = {
    title: 'Reporte de Breakdown por Proyecto',
    subtitle: filters || 'Todas las prioridades',
    headers: ['Proyecto', 'Prioridad', 'Usuario', 'Semana', 'Estado', 'Avance', 'Horas'],
    rows: rows,
    summary: [
      { label: 'Total de Proyectos', value: prioritiesByProject.size },
      { label: 'Total de Prioridades', value: totalPriorities },
      { label: 'Total de Horas Trabajadas', value: `${totalHours.toFixed(2)} horas` }
    ],
    summaryTable: {
      headers: ['Proyecto', 'Prioridades', 'Total Horas'],
      rows: summaryTableRows
    },
    summaryTableTitle: 'Resumen de Horas por Proyecto:'
  };

  const fileName = `Reporte_BreakdownProyectos_${new Date().getTime()}`;

  if (format === 'pdf') {
    await generatePDFReport(data, fileName);
  } else {
    await generateDOCReport(data, fileName);
  }
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun } from 'docx';
import { saveAs } from 'file-saver';

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

// Generar reporte en PDF
export const generatePDFReport = (data: ReportData, fileName: string = 'Reporte') => {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, 14, 20);

  // Subtítulo
  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.subtitle, 14, 28);
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
      doc.text(`${item.label}: ${item.value}`, 20, startY + 7 + (index * 6));
    });

    startY += 7 + (data.summary.length * 6) + 5;
  }

  // Tabla
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
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
};

// Generar reporte en DOC
export const generateDOCReport = async (data: ReportData, fileName: string = 'Reporte') => {
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Crear secciones del documento
  const sections: any[] = [
    // Título
    new Paragraph({
      text: data.title,
      heading: 'Heading1',
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  ];

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
};

// Tipos de reportes predefinidos
export const generatePrioritiesReport = (
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
    generatePDFReport(data, fileName);
  } else {
    generateDOCReport(data, fileName);
  }
};

export const generateUserPerformanceReport = (
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
    generatePDFReport(data, fileName);
  } else {
    generateDOCReport(data, fileName);
  }
};

export const generateInitiativesReport = (
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
    generatePDFReport(data, fileName);
  } else {
    generateDOCReport(data, fileName);
  }
};

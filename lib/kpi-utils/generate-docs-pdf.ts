import jsPDF from 'jspdf';

const SYSTEM_DATA_DOCS = `
# Funciones del Sistema para KPIs

## Descripción General
Las Funciones del Sistema permiten acceder a datos reales de la aplicación directamente en las fórmulas de KPIs.

## Funciones Disponibles

### 1. COUNT_PRIORITIES
Cuenta el número de prioridades que cumplen ciertos criterios.

Sintaxis: COUNT_PRIORITIES() o COUNT_PRIORITIES(filtros)

Filtros disponibles:
• status: Estado de la prioridad
• type: Tipo de prioridad
• userId: ID del usuario
• initiativeId: ID de la iniciativa
• projectId: ID del proyecto

Ejemplos:
  COUNT_PRIORITIES()
  COUNT_PRIORITIES({status: "COMPLETADO"})
  COUNT_PRIORITIES({userId: "123", status: "EN_RIESGO"})

### 2. SUM_PRIORITIES
Suma un campo numérico de las prioridades.

Sintaxis: SUM_PRIORITIES(campo, filtros)

Ejemplos:
  SUM_PRIORITIES("completionPercentage")
  SUM_PRIORITIES("completionPercentage", {status: "COMPLETADO"})

### 3. AVG_PRIORITIES
Calcula el promedio de un campo numérico.

Sintaxis: AVG_PRIORITIES(campo, filtros)

Ejemplos:
  AVG_PRIORITIES("completionPercentage")
  AVG_PRIORITIES("completionPercentage", {status: "COMPLETADO"})

### 4. COUNT_MILESTONES
Cuenta hitos que cumplen ciertos criterios.

Sintaxis: COUNT_MILESTONES() o COUNT_MILESTONES(filtros)

Filtros: userId, projectId, isCompleted, dueDateStart, dueDateEnd

Ejemplos:
  COUNT_MILESTONES({isCompleted: true})
  COUNT_MILESTONES({projectId: "123"})

### 5. COUNT_PROJECTS
Cuenta proyectos activos.

Sintaxis: COUNT_PROJECTS() o COUNT_PROJECTS(filtros)

Filtros: isActive, projectManagerId

Ejemplos:
  COUNT_PROJECTS({isActive: true})

### 6. COUNT_USERS
Cuenta usuarios del sistema.

Sintaxis: COUNT_USERS() o COUNT_USERS(filtros)

Filtros: role, area, isActive, isAreaLeader

Ejemplos:
  COUNT_USERS({area: "Tecnologia"})
  COUNT_USERS({role: "ADMIN"})

### 7. COMPLETION_RATE
Calcula la tasa de cumplimiento de prioridades.

Sintaxis: COMPLETION_RATE() o COMPLETION_RATE(filtros)

Ejemplos:
  COMPLETION_RATE()
  COMPLETION_RATE({userId: "123"})

### 8. PERCENTAGE
Función auxiliar para calcular porcentajes.

Sintaxis: PERCENTAGE(parte, total)

Ejemplo:
  PERCENTAGE(25, 100)  // = 25

## Casos de Uso Reales

1. Tasa de Cumplimiento por Area
   COMPLETION_RATE({userId: "ID_USER"})

2. Productividad por Proyecto
   AVG_PRIORITIES("completionPercentage", {projectId: "ID"})

3. Indice de Riesgo
   PERCENTAGE(COUNT_PRIORITIES({status: "EN_RIESGO"}), COUNT_PRIORITIES())

4. Eficiencia de Hitos
   PERCENTAGE(COUNT_MILESTONES({isCompleted: true}), COUNT_MILESTONES())

5. Velocidad de Equipo
   COUNT_PRIORITIES({status: "COMPLETADO"}) / COUNT_USERS({area: "Tech"})

## Notas Importantes

1. Las funciones del sistema consultan la base de datos en tiempo real
2. Las fechas deben estar en formato ISO 8601 (YYYY-MM-DD)
3. Los IDs requieren el ObjectId completo de MongoDB
4. Los nombres de funciones deben estar en MAYUSCULAS
5. Los strings van entre comillas dobles en los filtros
`;

export function generateSystemDataDocsPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Título principal
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text('Funciones del Sistema para KPIs', margin, yPos);
  yPos += 10;

  // Subtítulo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99); // gray-600
  doc.text('Documentacion Completa', margin, yPos);
  yPos += 15;

  // Procesar el contenido
  const lines = SYSTEM_DATA_DOCS.trim().split('\n');

  for (const line of lines) {
    // Verificar si necesitamos nueva página
    if (yPos > pageHeight - margin - 10) {
      doc.addPage();
      yPos = margin;
    }

    if (line.startsWith('###')) {
      // Título nivel 3
      yPos += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(line.substring(4), margin, yPos);
      yPos += 7;
    } else if (line.startsWith('##')) {
      // Título nivel 2
      yPos += 8;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(line.substring(3), margin, yPos);
      yPos += 8;
    } else if (line.startsWith('#')) {
      // Título nivel 1
      yPos += 10;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(line.substring(2), margin, yPos);
      yPos += 8;
    } else if (line.startsWith('  ')) {
      // Código con indentación
      doc.setFontSize(9);
      doc.setFont('courier', 'normal');
      doc.setTextColor(0, 0, 0);
      const codeLines = doc.splitTextToSize(line.trim(), contentWidth - 10);
      doc.text(codeLines, margin + 5, yPos);
      yPos += codeLines.length * 4;
    } else if (line.startsWith('•') || line.startsWith('-')) {
      // Lista con viñetas
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const bulletText = line.substring(2);
      const textLines = doc.splitTextToSize(bulletText, contentWidth - 10);
      doc.text('•', margin + 2, yPos);
      doc.text(textLines, margin + 7, yPos);
      yPos += textLines.length * 5;
    } else if (line.trim()) {
      // Texto normal
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const textLines = doc.splitTextToSize(line, contentWidth);
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * 5;
    } else {
      // Línea vacía
      yPos += 3;
    }
  }

  // Pie de página en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text(
      `Pagina ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Generado: ${new Date().toLocaleDateString('es-MX')}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Guardar el PDF
  doc.save('Funciones-Sistema-KPIs.pdf');
}

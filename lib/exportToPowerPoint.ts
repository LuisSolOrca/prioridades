'use client';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Initiative {
  _id: string;
  name: string;
  color: string;
}

interface Priority {
  _id: string;
  title: string;
  description?: string;
  completionPercentage: number;
  status: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO';
  userId: string;
  initiativeId?: string;
  initiativeIds?: string[];
}

export async function exportToPowerPoint(
  priorities: Priority[],
  users: User[],
  initiatives: Initiative[],
  weekLabel: string
) {
  // Dynamic import to avoid SSR issues
  const pptxgen = (await import('pptxgenjs')).default;
  const pptx = new pptxgen();

  // Configuración de tamaño y tema
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Sistema de Prioridades';
  pptx.title = `Reporte de Prioridades - ${weekLabel}`;
  pptx.subject = 'Dashboard de Prioridades Semanales';

  // Colores del tema
  const colors = {
    primary: '667eea',
    secondary: '764ba2',
    success: '10b981',
    warning: 'f59e0b',
    danger: 'ef4444',
    info: '3b82f6',
    dark: '1f2937',
    light: 'f9fafb',
    white: 'ffffff',
  };

  // ==========================================
  // SLIDE 1: Portada
  // ==========================================
  const slide1 = pptx.addSlide();

  // Fondo degradado
  slide1.background = { fill: `FFFFFF` };

  // Rectángulo decorativo superior con degradado
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: 2.5,
    fill: { type: 'solid', color: colors.primary, transparency: 10 },
  });

  // Título principal
  slide1.addText('REPORTE DE PRIORIDADES', {
    x: 1,
    y: 1.2,
    w: 11,
    h: 1,
    fontSize: 48,
    bold: true,
    color: colors.dark,
    align: 'center',
  });

  // Subtítulo con semana
  slide1.addText(weekLabel, {
    x: 1,
    y: 2.3,
    w: 11,
    h: 0.6,
    fontSize: 32,
    color: colors.primary,
    align: 'center',
  });

  // Fecha de generación
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  slide1.addText(`Generado: ${today}`, {
    x: 1,
    y: 4.8,
    w: 11,
    h: 0.4,
    fontSize: 14,
    color: '6b7280',
    align: 'center',
  });

  // Estadísticas rápidas en la portada
  const total = priorities.length;
  const completed = priorities.filter(p => p.status === 'COMPLETADO').length;
  const avgCompletion = total > 0
    ? (priorities.reduce((sum, p) => sum + p.completionPercentage, 0) / total).toFixed(0)
    : 0;

  const statsY = 3.5;
  const statsData = [
    { label: 'Total', value: total.toString(), color: colors.info },
    { label: 'Completadas', value: completed.toString(), color: colors.success },
    { label: 'Avance Prom.', value: `${avgCompletion}%`, color: colors.primary },
  ];

  statsData.forEach((stat, idx) => {
    const x = 2.5 + (idx * 2.5);

    slide1.addShape(pptx.ShapeType.roundRect, {
      x,
      y: statsY,
      w: 2,
      h: 1,
      fill: { color: stat.color, transparency: 10 },
      line: { color: stat.color, width: 2 },
    });

    slide1.addText(stat.value, {
      x,
      y: statsY + 0.15,
      w: 2,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: stat.color,
      align: 'center',
    });

    slide1.addText(stat.label, {
      x,
      y: statsY + 0.65,
      w: 2,
      h: 0.3,
      fontSize: 14,
      color: colors.dark,
      align: 'center',
    });
  });

  // ==========================================
  // SLIDE 2: Resumen Ejecutivo con Gráficas
  // ==========================================
  const slide2 = pptx.addSlide();
  slide2.background = { fill: colors.light };

  // Título del slide
  slide2.addText('RESUMEN EJECUTIVO', {
    x: 0.5,
    y: 0.3,
    w: 12,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: colors.dark,
  });

  // Gráfica de dona: Distribución por estado
  const statusCounts = {
    EN_TIEMPO: priorities.filter(p => p.status === 'EN_TIEMPO').length,
    EN_RIESGO: priorities.filter(p => p.status === 'EN_RIESGO').length,
    BLOQUEADO: priorities.filter(p => p.status === 'BLOQUEADO').length,
    COMPLETADO: priorities.filter(p => p.status === 'COMPLETADO').length,
  };

  const statusChartData = [
    {
      name: 'En Tiempo',
      labels: ['En Tiempo'],
      values: [statusCounts.EN_TIEMPO],
    },
    {
      name: 'En Riesgo',
      labels: ['En Riesgo'],
      values: [statusCounts.EN_RIESGO],
    },
    {
      name: 'Bloqueado',
      labels: ['Bloqueado'],
      values: [statusCounts.BLOQUEADO],
    },
    {
      name: 'Completado',
      labels: ['Completado'],
      values: [statusCounts.COMPLETADO],
    },
  ];

  slide2.addChart(pptx.ChartType.doughnut, statusChartData, {
    x: 0.5,
    y: 1.2,
    w: 5.5,
    h: 4,
    title: 'Distribución por Estado',
    titleFontSize: 16,
    titleColor: colors.dark,
    showLegend: true,
    legendPos: 'b',
    chartColors: [colors.success, colors.warning, colors.danger, colors.info],
    holeSize: 50,
  });

  // Gráfica de barras: Prioridades por usuario
  const userPriorityCounts = users.map(user => ({
    name: user.name,
    count: priorities.filter(p => p.userId === user._id).length,
  }));

  const userChartData = [
    {
      name: 'Prioridades',
      labels: userPriorityCounts.map(u => u.name),
      values: userPriorityCounts.map(u => u.count),
    },
  ];

  slide2.addChart(pptx.ChartType.bar, userChartData, {
    x: 6.5,
    y: 1.2,
    w: 6,
    h: 4,
    title: 'Prioridades por Usuario',
    titleFontSize: 16,
    titleColor: colors.dark,
    showValue: true,
    chartColors: [colors.primary],
    barDir: 'bar',
    catAxisLabelFontSize: 10,
    valAxisMaxVal: Math.max(...userPriorityCounts.map(u => u.count)) + 2,
  });

  // ==========================================
  // SLIDE 3: Análisis por Iniciativas
  // ==========================================
  const slide3 = pptx.addSlide();
  slide3.background = { fill: colors.light };

  slide3.addText('ANÁLISIS POR INICIATIVAS ESTRATÉGICAS', {
    x: 0.5,
    y: 0.3,
    w: 12,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: colors.dark,
  });

  // Contar prioridades por iniciativa
  const initiativeCounts = initiatives.map(initiative => {
    const count = priorities.filter(p => {
      const pInitIds = p.initiativeIds || (p.initiativeId ? [p.initiativeId] : []);
      return pInitIds.includes(initiative._id);
    }).length;
    return { name: initiative.name, count, color: initiative.color };
  });

  // Gráfica de barras horizontales por iniciativa
  const initiativeChartData = [
    {
      name: 'Prioridades',
      labels: initiativeCounts.map(i => i.name),
      values: initiativeCounts.map(i => i.count),
    },
  ];

  slide3.addChart(pptx.ChartType.bar, initiativeChartData, {
    x: 0.5,
    y: 1.2,
    w: 12,
    h: 4.2,
    title: 'Distribución por Iniciativa Estratégica',
    titleFontSize: 16,
    titleColor: colors.dark,
    showValue: true,
    chartColors: initiativeCounts.map(i => i.color.replace('#', '')),
    barDir: 'bar',
    catAxisLabelFontSize: 12,
  });

  // ==========================================
  // SLIDE 4+: Detalle por Usuario
  // ==========================================
  users.forEach(user => {
    const userPriorities = priorities.filter(p => p.userId === user._id);

    if (userPriorities.length === 0) return; // Skip users without priorities

    const slide = pptx.addSlide();
    slide.background = { fill: colors.white };

    // Encabezado del usuario
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: 1,
      fill: { color: colors.primary, transparency: 10 },
    });

    slide.addText(user.name, {
      x: 0.5,
      y: 0.25,
      w: 8,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: colors.dark,
    });

    // Estadísticas del usuario
    const userCompleted = userPriorities.filter(p => p.status === 'COMPLETADO').length;
    const userAvg = userPriorities.length > 0
      ? (userPriorities.reduce((sum, p) => sum + p.completionPercentage, 0) / userPriorities.length).toFixed(0)
      : 0;

    slide.addText(`${userPriorities.length} Prioridades | ${userCompleted} Completadas | ${userAvg}% Avance Promedio`, {
      x: 0.5,
      y: 0.65,
      w: 8,
      h: 0.3,
      fontSize: 14,
      color: '6b7280',
    });

    // Tabla de prioridades
    const tableData: any[][] = [];

    // Header
    tableData.push([
      { text: 'Prioridad', options: { bold: true, fill: colors.primary, color: colors.white } },
      { text: 'Estado', options: { bold: true, fill: colors.primary, color: colors.white } },
      { text: 'Avance', options: { bold: true, fill: colors.primary, color: colors.white } },
      { text: 'Iniciativa', options: { bold: true, fill: colors.primary, color: colors.white } },
    ]);

    // Rows
    userPriorities.forEach(priority => {
      const statusColors = {
        EN_TIEMPO: colors.success,
        EN_RIESGO: colors.warning,
        BLOQUEADO: colors.danger,
        COMPLETADO: colors.info,
      };

      const statusLabels = {
        EN_TIEMPO: 'En Tiempo',
        EN_RIESGO: 'En Riesgo',
        BLOQUEADO: 'Bloqueado',
        COMPLETADO: 'Completado',
      };

      const pInitIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
      const pInitiatives = pInitIds
        .map(id => initiatives.find(i => i._id === id))
        .filter(i => i !== undefined);
      const initiativeNames = pInitiatives.map(i => i!.name).join(', ');

      tableData.push([
        { text: priority.title.substring(0, 50) + (priority.title.length > 50 ? '...' : ''), options: { fontSize: 11 } },
        { text: statusLabels[priority.status], options: { fontSize: 11, fill: statusColors[priority.status], color: colors.white, bold: true } },
        { text: `${priority.completionPercentage}%`, options: { fontSize: 11, align: 'center' } },
        { text: initiativeNames.substring(0, 30), options: { fontSize: 10 } },
      ]);
    });

    slide.addTable(tableData, {
      x: 0.5,
      y: 1.3,
      w: 12,
      h: 4,
      fontSize: 11,
      border: { type: 'solid', color: 'e5e7eb', pt: 1 },
      autoPage: false,
      colW: [5.5, 2, 1.5, 3],
    });
  });

  // ==========================================
  // SLIDE FINAL: Conclusiones
  // ==========================================
  const slideFinal = pptx.addSlide();
  slideFinal.background = { fill: colors.light };

  slideFinal.addText('CONCLUSIONES Y PRÓXIMOS PASOS', {
    x: 0.5,
    y: 0.5,
    w: 12,
    h: 0.8,
    fontSize: 32,
    bold: true,
    color: colors.dark,
    align: 'center',
  });

  // Métricas clave
  const blocked = priorities.filter(p => p.status === 'BLOQUEADO').length;
  const atRisk = priorities.filter(p => p.status === 'EN_RIESGO').length;
  const onTrack = priorities.filter(p => p.status === 'EN_TIEMPO').length;

  const conclusions = [
    `✅ ${completed} de ${total} prioridades completadas (${((completed / total) * 100).toFixed(0)}%)`,
    `📊 Avance promedio general: ${avgCompletion}%`,
    `⚡ ${onTrack} prioridades en tiempo`,
    atRisk > 0 ? `⚠️ ${atRisk} prioridades en riesgo requieren atención` : '✅ No hay prioridades en riesgo',
    blocked > 0 ? `🚫 ${blocked} prioridades bloqueadas requieren acción inmediata` : '✅ No hay prioridades bloqueadas',
  ];

  conclusions.forEach((conclusion, idx) => {
    slideFinal.addText(conclusion, {
      x: 1.5,
      y: 2 + (idx * 0.6),
      w: 10,
      h: 0.5,
      fontSize: 18,
      color: colors.dark,
      bullet: true,
    });
  });

  // Generar y descargar
  const fileName = `Reporte_Prioridades_${weekLabel.replace(/\s/g, '_')}.pptx`;
  pptx.writeFile({ fileName });
}

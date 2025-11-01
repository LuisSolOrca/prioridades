import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import User from '@/models/User';
import StrategicInitiative from '@/models/StrategicInitiative';
import pptxgen from 'pptxgenjs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { weekStart, weekEnd, weekLabel } = body;

    // Fetch data
    const [users, initiatives, priorities] = await Promise.all([
      User.find({ isActive: true }).lean(),
      StrategicInitiative.find({ isActive: true }).lean(),
      Priority.find({
        weekStart: { $gte: new Date(weekStart) },
        weekEnd: { $lte: new Date(weekEnd) },
      }).lean(),
    ]);

    // Create PowerPoint
    const pptx = new pptxgen();

    // Configuration
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Sistema de Prioridades';
    pptx.title = `Reporte de Prioridades - ${weekLabel}`;
    pptx.subject = 'Dashboard de Prioridades Semanales';

    // Colors
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
    // SLIDE 1: Cover
    // ==========================================
    const slide1 = pptx.addSlide();
    slide1.background = { fill: 'FFFFFF' };

    slide1.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: 2.5,
      fill: { color: colors.primary, transparency: 10 },
    });

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

    slide1.addText(weekLabel, {
      x: 1,
      y: 2.3,
      w: 11,
      h: 0.6,
      fontSize: 32,
      color: colors.primary,
      align: 'center',
    });

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

    // Stats on cover
    const total = priorities.length;
    const completed = priorities.filter((p: any) => p.status === 'COMPLETADO').length;
    const avgCompletion = total > 0
      ? (priorities.reduce((sum: number, p: any) => sum + p.completionPercentage, 0) / total).toFixed(0)
      : 0;

    const statsY = 3.5;
    const statsData = [
      { label: 'Total', value: total.toString(), color: colors.info },
      { label: 'Completadas', value: completed.toString(), color: colors.success },
      { label: 'Avance Prom.', value: `${avgCompletion}%`, color: colors.primary },
    ];

    statsData.forEach((stat, idx) => {
      const x = 2.5 + (idx * 2.5);

      slide1.addShape('roundRect', {
        x,
        y: statsY,
        w: 2,
        h: 1,
        fill: { color: stat.color, transparency: 10 },
        line: { color: stat.color, pt: 2 },
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
    // SLIDE 2: Executive Summary
    // ==========================================
    const slide2 = pptx.addSlide();
    slide2.background = { fill: colors.light };

    slide2.addText('RESUMEN EJECUTIVO', {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: colors.dark,
    });

    // Status distribution chart
    const statusCounts = {
      EN_TIEMPO: priorities.filter((p: any) => p.status === 'EN_TIEMPO').length,
      EN_RIESGO: priorities.filter((p: any) => p.status === 'EN_RIESGO').length,
      BLOQUEADO: priorities.filter((p: any) => p.status === 'BLOQUEADO').length,
      COMPLETADO: priorities.filter((p: any) => p.status === 'COMPLETADO').length,
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

    slide2.addChart('doughnut' as any, statusChartData, {
      x: 0.5,
      y: 1.3,
      w: 5,
      h: 3.8,
      title: 'Distribución por Estado',
      titleFontSize: 14,
      chartColors: [colors.success, colors.warning, colors.danger, colors.info],
      holeSize: 50,
      showLegend: true,
      legendPos: 'b',
      legendFontSize: 10,
    });

    // User priorities chart
    const userPriorityCounts = users.map((user: any) => ({
      name: user.name,
      count: priorities.filter((p: any) => p.userId.toString() === user._id.toString()).length,
    }));

    const userChartData = [
      {
        name: 'Prioridades',
        labels: userPriorityCounts.map((u: any) => u.name),
        values: userPriorityCounts.map((u: any) => u.count),
      },
    ];

    slide2.addChart('bar' as any, userChartData, {
      x: 6,
      y: 1.3,
      w: 6.5,
      h: 3.8,
      title: 'Prioridades por Usuario',
      titleFontSize: 14,
      chartColors: [colors.primary],
      barDir: 'bar',
      showValue: true,
      valAxisMaxVal: Math.max(...userPriorityCounts.map((u: any) => u.count)) + 2,
      catAxisLabelFontSize: 10,
      showValAxisTitle: false,
      showCatAxisTitle: false,
    });

    // ==========================================
    // SLIDE 3: Initiatives Analysis
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

    const initiativeCounts = initiatives.map((initiative: any) => {
      const count = priorities.filter((p: any) => {
        const pInitIds = p.initiativeIds || (p.initiativeId ? [p.initiativeId] : []);
        return pInitIds.some((id: any) => id.toString() === initiative._id.toString());
      }).length;
      return { name: initiative.name, count, color: initiative.color };
    });

    const initiativeChartData = [
      {
        name: 'Prioridades',
        labels: initiativeCounts.map((i: any) => i.name),
        values: initiativeCounts.map((i: any) => i.count),
      },
    ];

    slide3.addChart('bar' as any, initiativeChartData, {
      x: 1,
      y: 1.3,
      w: 11,
      h: 3.8,
      title: 'Distribución por Iniciativa Estratégica',
      titleFontSize: 14,
      chartColors: initiativeCounts.map((i: any) => i.color.replace('#', '')),
      barDir: 'bar',
      showValue: true,
      valAxisMaxVal: Math.max(...initiativeCounts.map((i: any) => i.count)) + 2,
      catAxisLabelFontSize: 11,
      showValAxisTitle: false,
      showCatAxisTitle: false,
    });

    // ==========================================
    // User Detail Slides
    // ==========================================
    for (const user of users) {
      const userPriorities = priorities.filter((p: any) => p.userId.toString() === (user as any)._id.toString());

      if (userPriorities.length === 0) continue;

      const slide = pptx.addSlide();
      slide.background = { fill: colors.white };

      slide.addShape('rect', {
        x: 0,
        y: 0,
        w: '100%',
        h: 1,
        fill: { color: colors.primary, transparency: 10 },
      });

      slide.addText((user as any).name, {
        x: 0.5,
        y: 0.25,
        w: 8,
        h: 0.5,
        fontSize: 28,
        bold: true,
        color: colors.dark,
      });

      const userCompleted = userPriorities.filter((p: any) => p.status === 'COMPLETADO').length;
      const userAvg = userPriorities.length > 0
        ? (userPriorities.reduce((sum: number, p: any) => sum + p.completionPercentage, 0) / userPriorities.length).toFixed(0)
        : 0;

      slide.addText(`${userPriorities.length} Prioridades | ${userCompleted} Completadas | ${userAvg}% Avance Promedio`, {
        x: 0.5,
        y: 0.65,
        w: 8,
        h: 0.3,
        fontSize: 14,
        color: '6b7280',
      });

      const tableData: any[][] = [];
      tableData.push([
        { text: 'Prioridad', options: { bold: true, fill: colors.primary, color: colors.white, fontSize: 12 } },
        { text: 'Estado', options: { bold: true, fill: colors.primary, color: colors.white, fontSize: 12 } },
        { text: 'Avance', options: { bold: true, fill: colors.primary, color: colors.white, fontSize: 12 } },
        { text: 'Iniciativa', options: { bold: true, fill: colors.primary, color: colors.white, fontSize: 12 } },
      ]);

      userPriorities.forEach((priority: any) => {
        const statusColors: any = {
          EN_TIEMPO: colors.success,
          EN_RIESGO: colors.warning,
          BLOQUEADO: colors.danger,
          COMPLETADO: colors.info,
        };

        const statusLabels: any = {
          EN_TIEMPO: 'En Tiempo',
          EN_RIESGO: 'En Riesgo',
          BLOQUEADO: 'Bloqueado',
          COMPLETADO: 'Completado',
        };

        const pInitIds = priority.initiativeIds || (priority.initiativeId ? [priority.initiativeId] : []);
        const pInitiatives = pInitIds
          .map((id: any) => initiatives.find((i: any) => i._id.toString() === id.toString()))
          .filter((i: any) => i !== undefined);
        const initiativeNames = pInitiatives.map((i: any) => i.name).join(', ');

        tableData.push([
          { text: priority.title.substring(0, 50) + (priority.title.length > 50 ? '...' : ''), options: { fontSize: 10 } },
          { text: statusLabels[priority.status], options: { fontSize: 10, fill: statusColors[priority.status], color: colors.white, bold: true } },
          { text: `${priority.completionPercentage}%`, options: { fontSize: 10, align: 'center' } },
          { text: initiativeNames.substring(0, 30), options: { fontSize: 9 } },
        ]);
      });

      slide.addTable(tableData, {
        x: 0.5,
        y: 1.3,
        w: 12,
        h: 3.8,
        colW: [5.5, 2, 1.5, 3],
        border: { type: 'solid', color: 'e5e7eb', pt: 1 },
        autoPage: false,
        fontSize: 10,
      });
    }

    // ==========================================
    // Final Slide: Conclusions
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

    const blocked = priorities.filter((p: any) => p.status === 'BLOQUEADO').length;
    const atRisk = priorities.filter((p: any) => p.status === 'EN_RIESGO').length;
    const onTrack = priorities.filter((p: any) => p.status === 'EN_TIEMPO').length;

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

    // Generate file as base64
    const pptxData = await pptx.write({ outputType: 'base64' });

    // Return as downloadable response
    const buffer = Buffer.from(pptxData as string, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="Reporte_Prioridades_${weekLabel.replace(/\s/g, '_')}.pptx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PowerPoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

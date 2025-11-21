import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { generateAllUsersReports } from '@/lib/reportStats';
import { sendEmail, emailTemplates } from '@/lib/email';
import SystemSettings from '@/models/SystemSettings';

/**
 * POST /api/reports/send
 * Genera y envía reportes a todos los usuarios
 * Body: { reportType: 'SEMANAL' | 'MENSUAL', testMode?: boolean, testEmail?: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Solo admins pueden enviar reportes manualmente
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { reportType, testMode = false, testEmail } = body;

    if (!reportType || !['SEMANAL', 'MENSUAL'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Tipo de reporte inválido. Debe ser SEMANAL o MENSUAL' },
        { status: 400 }
      );
    }

    if (testMode && !testEmail) {
      return NextResponse.json(
        { error: 'En modo de prueba, debe proporcionar testEmail' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let reports;

    // En modo de prueba, buscar el usuario por email y generar solo su reporte
    if (testMode) {
      const User = (await import('@/models/User')).default;
      const user = await User.findOne({ email: testEmail, isActive: true }).lean();

      if (!user) {
        return NextResponse.json(
          { error: `No se encontró usuario activo con el email ${testEmail}` },
          { status: 404 }
        );
      }

      // Generar reporte solo para este usuario
      const { generateUserReport } = await import('@/lib/reportStats');
      const report = await generateUserReport(
        user._id,
        user.email,
        user.name,
        reportType
      );
      reports = [report];
    } else {
      // Generar reportes para todos los usuarios
      reports = await generateAllUsersReports(reportType);
    }

    const results = {
      total: reports.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Enviar correos
    for (const report of reports) {
      try {
        const emailData = emailTemplates.performanceReport({
          userName: report.userName,
          periodLabel: report.period.label,
          reportType: report.period.type,
          currentStats: {
            totalPriorities: report.currentStats.totalPriorities,
            completedPriorities: report.currentStats.completedPriorities,
            delayedPriorities: report.currentStats.delayedPriorities,
            totalTasks: report.currentStats.totalTasks,
            completedTasks: report.currentStats.completedTasks,
            totalHoursReported: report.currentStats.totalHoursReported,
            averageCompletionPercentage: report.currentStats.averageCompletionPercentage,
          },
          comparison: report.comparison,
          topPriorities: report.topPriorities,
          dashboardUrl: `${baseUrl}/dashboard`,
          aiAnalysis: report.aiAnalysis,
        });

        const result = await sendEmail({
          to: report.userEmail,
          subject: emailData.subject,
          html: emailData.html,
        });

        if (result.success) {
          results.sent++;
          console.log(`✅ Reporte enviado exitosamente a ${report.userEmail}`);
        } else {
          results.failed++;
          const errorMsg = `${report.userName} (${report.userEmail}): ${result.error ? JSON.stringify(result.error) : 'Error desconocido'}`;
          results.errors.push(errorMsg);
          console.error(`❌ Error enviando reporte a ${report.userEmail}:`, result.error);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${report.userName} (${report.userEmail}): ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    // Actualizar fecha del último reporte enviado
    if (!testMode && results.sent > 0) {
      const settings = await SystemSettings.findOne();
      if (settings) {
        if (reportType === 'SEMANAL') {
          settings.lastWeeklyReportSent = new Date();
        } else {
          settings.lastMonthlyReportSent = new Date();
        }
        await settings.save();
      }
    }

    return NextResponse.json({
      message: testMode
        ? 'Reporte de prueba enviado exitosamente'
        : 'Reportes enviados exitosamente',
      results,
    });
  } catch (error) {
    console.error('Error enviando reportes:', error);
    return NextResponse.json(
      { error: 'Error enviando reportes', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/send
 * Obtiene información sobre el último envío de reportes
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const settings = await SystemSettings.findOne();

    return NextResponse.json({
      lastWeeklyReportSent: settings?.lastWeeklyReportSent || null,
      lastMonthlyReportSent: settings?.lastMonthlyReportSent || null,
      reportFrequency: settings?.reportFrequency || 'NINGUNO',
      isActive: settings?.isActive ?? true,
    });
  } catch (error) {
    console.error('Error obteniendo información de reportes:', error);
    return NextResponse.json(
      { error: 'Error obteniendo información de reportes' },
      { status: 500 }
    );
  }
}

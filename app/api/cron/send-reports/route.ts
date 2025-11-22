import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { generateAllUsersReports } from '@/lib/reportStats';
import { sendEmail, emailTemplates } from '@/lib/email';
import SystemSettings from '@/models/SystemSettings';

/**
 * GET /api/cron/send-reports
 * Endpoint para ser llamado por un servicio cron externo (ej: cron-job.org)
 * Determina automáticamente si debe enviar reportes semanales o mensuales
 * basándose en la fecha actual y la configuración
 */

// Configurar para no cachear
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await connectDB();

    // Obtener configuración
    const settings = await SystemSettings.findOne();

    if (!settings || !settings.isActive || settings.reportFrequency === 'NINGUNO') {
      return NextResponse.json({
        message: 'Reportes desactivados o no configurados',
        sent: false,
        debug: {
          settingsExists: !!settings,
          isActive: settings?.isActive || false,
          reportFrequency: settings?.reportFrequency || 'N/A',
          hint: !settings
            ? 'No existe configuración en la base de datos. Configúrala en /admin/report-settings'
            : !settings.isActive
            ? 'El sistema está desactivado. Actívalo en /admin/report-settings'
            : 'La frecuencia está en NINGUNO. Cámbiala en /admin/report-settings'
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (0 = Domingo)
    const currentDate = now.getDate(); // 1-31
    const currentHour = now.getUTCHours(); // 0-23 (UTC)

    let shouldSendWeekly = false;
    let shouldSendMonthly = false;

    // Verificar si debe enviar reporte semanal
    if (
      (settings.reportFrequency === 'SEMANAL' || settings.reportFrequency === 'AMBOS') &&
      currentDay === settings.weeklyReportDay &&
      currentHour === settings.weeklyReportHour
    ) {
      // Protección contra duplicados: no enviar si ya se envió en las últimas 23 horas
      if (settings.lastWeeklyReportSent) {
        const hoursSinceLastSent = (now.getTime() - settings.lastWeeklyReportSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSent < 23) {
          console.log(`Reporte semanal ya enviado hace ${hoursSinceLastSent.toFixed(1)} horas`);
          shouldSendWeekly = false;
        } else {
          shouldSendWeekly = true;
        }
      } else {
        shouldSendWeekly = true;
      }
    }

    // Verificar si debe enviar reporte mensual
    if (
      (settings.reportFrequency === 'MENSUAL' || settings.reportFrequency === 'AMBOS') &&
      currentDate === settings.monthlyReportDay &&
      currentHour === settings.monthlyReportHour
    ) {
      // Protección contra duplicados: no enviar si ya se envió en los últimos 27 días
      if (settings.lastMonthlyReportSent) {
        const daysSinceLastSent = (now.getTime() - settings.lastMonthlyReportSent.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSent < 27) {
          console.log(`Reporte mensual ya enviado hace ${daysSinceLastSent.toFixed(1)} días`);
          shouldSendMonthly = false;
        } else {
          shouldSendMonthly = true;
        }
      } else {
        shouldSendMonthly = true;
      }
    }

    if (!shouldSendWeekly && !shouldSendMonthly) {
      return NextResponse.json({
        message: 'No es momento de enviar reportes',
        currentDay,
        currentDate,
        currentHour,
        currentTime: now.toISOString(),
        settings: {
          weeklyReportDay: settings.weeklyReportDay,
          weeklyReportHour: settings.weeklyReportHour,
          monthlyReportDay: settings.monthlyReportDay,
          monthlyReportHour: settings.monthlyReportHour,
          reportFrequency: settings.reportFrequency,
          lastWeeklyReportSent: settings.lastWeeklyReportSent?.toISOString(),
          lastMonthlyReportSent: settings.lastMonthlyReportSent?.toISOString(),
        },
        sent: false,
        note: 'Las horas están configuradas en UTC. El servidor usa getUTCHours() para validar.'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
    }

    const results = {
      weekly: { sent: false, total: 0, success: 0, failed: 0, errors: [] as string[] },
      monthly: { sent: false, total: 0, success: 0, failed: 0, errors: [] as string[] },
    };

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Enviar reporte semanal si corresponde
    if (shouldSendWeekly) {
      const reports = await generateAllUsersReports('SEMANAL');
      results.weekly.sent = true;
      results.weekly.total = reports.length;

      for (const report of reports) {
        try {
          const emailData = emailTemplates.performanceReport({
            userName: report.userName,
            periodLabel: report.period.label,
            reportType: 'SEMANAL',
            currentStats: {
              totalPriorities: report.currentStats.totalPriorities,
              completedPriorities: report.currentStats.completedPriorities,
              delayedPriorities: report.currentStats.delayedPriorities,
              pendingPriorities: report.currentStats.pendingPriorities,
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
            results.weekly.success++;
          } else {
            results.weekly.failed++;
            results.weekly.errors.push(`${report.userName}: Error al enviar`);
          }
        } catch (error) {
          results.weekly.failed++;
          results.weekly.errors.push(
            `${report.userName}: ${error instanceof Error ? error.message : 'Error desconocido'}`
          );
        }
      }

      // Actualizar fecha del último envío
      settings.lastWeeklyReportSent = now;
      await settings.save();
    }

    // Enviar reporte mensual si corresponde
    if (shouldSendMonthly) {
      const reports = await generateAllUsersReports('MENSUAL');
      results.monthly.sent = true;
      results.monthly.total = reports.length;

      for (const report of reports) {
        try {
          const emailData = emailTemplates.performanceReport({
            userName: report.userName,
            periodLabel: report.period.label,
            reportType: 'MENSUAL',
            currentStats: {
              totalPriorities: report.currentStats.totalPriorities,
              completedPriorities: report.currentStats.completedPriorities,
              delayedPriorities: report.currentStats.delayedPriorities,
              pendingPriorities: report.currentStats.pendingPriorities,
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
            results.monthly.success++;
          } else {
            results.monthly.failed++;
            results.monthly.errors.push(`${report.userName}: Error al enviar`);
          }
        } catch (error) {
          results.monthly.failed++;
          results.monthly.errors.push(
            `${report.userName}: ${error instanceof Error ? error.message : 'Error desconocido'}`
          );
        }
      }

      // Actualizar fecha del último envío
      settings.lastMonthlyReportSent = now;
      await settings.save();
    }

    return NextResponse.json({
      message: 'Reportes enviados exitosamente',
      timestamp: now.toISOString(),
      results,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error en cron de envío de reportes:', error);
    return NextResponse.json(
      {
        error: 'Error en cron de envío de reportes',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
}

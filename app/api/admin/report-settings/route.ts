import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';

/**
 * GET /api/admin/report-settings
 * Obtiene la configuración actual de reportes
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    // Buscar o crear configuración por defecto
    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({
        reportFrequency: 'NINGUNO',
        weeklyReportDay: 1, // Lunes
        weeklyReportHour: 9,
        monthlyReportDay: 1,
        monthlyReportHour: 9,
        emailSubjectPrefix: '📊 Reporte de Rendimiento',
        isActive: true,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración de reportes:', error);
    return NextResponse.json(
      { error: 'Error obteniendo configuración de reportes' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/report-settings
 * Actualiza la configuración de reportes
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const {
      reportFrequency,
      weeklyReportDay,
      weeklyReportHour,
      monthlyReportDay,
      monthlyReportHour,
      emailSubjectPrefix,
      isActive,
    } = body;

    // Validaciones
    if (reportFrequency && !['SEMANAL', 'MENSUAL', 'AMBOS', 'NINGUNO'].includes(reportFrequency)) {
      return NextResponse.json(
        { error: 'Frecuencia de reporte inválida' },
        { status: 400 }
      );
    }

    if (weeklyReportDay !== undefined && (weeklyReportDay < 0 || weeklyReportDay > 6)) {
      return NextResponse.json(
        { error: 'Día de reporte semanal inválido (0-6)' },
        { status: 400 }
      );
    }

    if (weeklyReportHour !== undefined && (weeklyReportHour < 0 || weeklyReportHour > 23)) {
      return NextResponse.json(
        { error: 'Hora de reporte semanal inválida (0-23)' },
        { status: 400 }
      );
    }

    if (monthlyReportDay !== undefined && (monthlyReportDay < 1 || monthlyReportDay > 28)) {
      return NextResponse.json(
        { error: 'Día de reporte mensual inválido (1-28)' },
        { status: 400 }
      );
    }

    if (monthlyReportHour !== undefined && (monthlyReportHour < 0 || monthlyReportHour > 23)) {
      return NextResponse.json(
        { error: 'Hora de reporte mensual inválida (0-23)' },
        { status: 400 }
      );
    }

    // Buscar o crear configuración
    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = new SystemSettings({
        reportFrequency: reportFrequency || 'NINGUNO',
        weeklyReportDay: weeklyReportDay ?? 1,
        weeklyReportHour: weeklyReportHour ?? 9,
        monthlyReportDay: monthlyReportDay ?? 1,
        monthlyReportHour: monthlyReportHour ?? 9,
        emailSubjectPrefix: emailSubjectPrefix || '📊 Reporte de Rendimiento',
        isActive: isActive ?? true,
      });
    } else {
      // Actualizar solo los campos proporcionados
      if (reportFrequency !== undefined) settings.reportFrequency = reportFrequency;
      if (weeklyReportDay !== undefined) settings.weeklyReportDay = weeklyReportDay;
      if (weeklyReportHour !== undefined) settings.weeklyReportHour = weeklyReportHour;
      if (monthlyReportDay !== undefined) settings.monthlyReportDay = monthlyReportDay;
      if (monthlyReportHour !== undefined) settings.monthlyReportHour = monthlyReportHour;
      if (emailSubjectPrefix !== undefined) settings.emailSubjectPrefix = emailSubjectPrefix;
      if (isActive !== undefined) settings.isActive = isActive;
    }

    await settings.save();

    return NextResponse.json({
      message: 'Configuración actualizada exitosamente',
      settings,
    });
  } catch (error) {
    console.error('Error actualizando configuración de reportes:', error);
    return NextResponse.json(
      { error: 'Error actualizando configuración de reportes' },
      { status: 500 }
    );
  }
}

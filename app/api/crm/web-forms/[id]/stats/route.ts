import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WebForm from '@/models/WebForm';
import WebFormSubmission from '@/models/WebFormSubmission';
import mongoose from 'mongoose';

/**
 * GET /api/crm/web-forms/[id]/stats
 * Obtiene estadísticas de conversión del formulario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // días
    const periodDays = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const formId = new mongoose.Types.ObjectId(params.id);

    // Obtener el formulario
    const form = await WebForm.findById(params.id).lean();
    if (!form) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    // Estadísticas generales
    const [
      totalSubmissions,
      periodSubmissions,
      statusBreakdown,
      utmBreakdown,
      dailySubmissions,
      contactsCreated,
      dealsCreated,
    ] = await Promise.all([
      // Total de submissions
      WebFormSubmission.countDocuments({ formId }),

      // Submissions en el período
      WebFormSubmission.countDocuments({
        formId,
        submittedAt: { $gte: startDate },
      }),

      // Breakdown por status
      WebFormSubmission.aggregate([
        { $match: { formId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Breakdown por UTM source (top 10)
      WebFormSubmission.aggregate([
        { $match: { formId, utmSource: { $exists: true, $ne: null } } },
        { $group: { _id: '$utmSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Submissions por día en el período
      WebFormSubmission.aggregate([
        {
          $match: {
            formId,
            submittedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Contactos creados
      WebFormSubmission.countDocuments({
        formId,
        contactId: { $exists: true, $ne: null },
      }),

      // Deals creados
      WebFormSubmission.countDocuments({
        formId,
        dealId: { $exists: true, $ne: null },
      }),
    ]);

    // Calcular tasa de conversión (submissions a contactos)
    const conversionRate = totalSubmissions > 0
      ? ((contactsCreated / totalSubmissions) * 100).toFixed(1)
      : '0';

    // Calcular promedio diario
    const avgDailySubmissions = periodSubmissions > 0
      ? (periodSubmissions / periodDays).toFixed(1)
      : '0';

    // Formatear status breakdown
    const statusCounts = statusBreakdown.reduce((acc: any, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Formatear UTM breakdown
    const utmSources = utmBreakdown.map(item => ({
      source: item._id,
      count: item.count,
    }));

    // Llenar días faltantes en el gráfico
    const dailyData: { date: string; count: number }[] = [];
    const existingDates = new Map(
      dailySubmissions.map((d: any) => [d._id, d.count])
    );

    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData.push({
        date: dateStr,
        count: existingDates.get(dateStr) || 0,
      });
    }

    return NextResponse.json({
      form: {
        name: form.name,
        isPublished: form.isPublished,
        isActive: form.isActive,
        createdAt: form.createdAt,
      },
      stats: {
        totalSubmissions,
        periodSubmissions,
        avgDailySubmissions: parseFloat(avgDailySubmissions),
        contactsCreated,
        dealsCreated,
        conversionRate: parseFloat(conversionRate),
        lastSubmissionAt: form.lastSubmissionAt,
      },
      statusBreakdown: {
        pending: statusCounts.pending || 0,
        processed: statusCounts.processed || 0,
        failed: statusCounts.failed || 0,
      },
      utmSources,
      dailyData,
    });
  } catch (error: any) {
    console.error('Error fetching form stats:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo estadísticas' },
      { status: 500 }
    );
  }
}

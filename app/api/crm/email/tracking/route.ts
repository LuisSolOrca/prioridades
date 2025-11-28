import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailTracking from '@/models/EmailTracking';
import { hasPermission } from '@/lib/permissions';
import { getTrackingStats, getUnopenedEmails } from '@/lib/emailTracking';

export const dynamic = 'force-dynamic';

// GET - Obtener lista de emails con tracking
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso para ver CRM' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const contactId = searchParams.get('contactId');
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const unopened = searchParams.get('unopened') === 'true';
    const stats = searchParams.get('stats') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const user = session.user as any;
    const userId = user.id;

    // Si solo quieren stats
    if (stats) {
      const dateFrom = searchParams.get('dateFrom')
        ? new Date(searchParams.get('dateFrom')!)
        : undefined;
      const dateTo = searchParams.get('dateTo')
        ? new Date(searchParams.get('dateTo')!)
        : undefined;

      const trackingStats = await getTrackingStats(userId, dateFrom, dateTo);
      return NextResponse.json(trackingStats);
    }

    // Si quieren emails sin abrir
    if (unopened) {
      const daysSinceSent = parseInt(searchParams.get('days') || '3');
      const emails = await getUnopenedEmails(userId, daysSinceSent, limit);
      return NextResponse.json(emails);
    }

    // Construir filtro
    const filter: any = {};

    // Admin puede ver todos, usuarios solo los suyos
    if (user.role !== 'ADMIN') {
      filter.userId = userId;
    }

    if (dealId) filter.dealId = dealId;
    if (contactId) filter.contactId = contactId;
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;

    // Obtener emails con paginación
    const [emails, total] = await Promise.all([
      EmailTracking.find(filter)
        .populate('dealId', 'title')
        .populate('contactId', 'firstName lastName')
        .populate('clientId', 'name')
        .populate('userId', 'name')
        .sort({ sentAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmailTracking.countDocuments(filter),
    ]);

    // Calcular métricas generales del resultado
    const statusCounts = await EmailTracking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap = statusCounts.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        total,
        sent: statusMap.sent || 0,
        delivered: statusMap.delivered || 0,
        opened: statusMap.opened || 0,
        clicked: statusMap.clicked || 0,
        replied: statusMap.replied || 0,
        bounced: statusMap.bounced || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching email tracking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

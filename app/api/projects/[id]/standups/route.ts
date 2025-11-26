import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Standup from '@/models/Standup';
import User from '@/models/User';
import Project from '@/models/Project';
import Notification from '@/models/Notification';
import { sendEmail, emailTemplates } from '@/lib/email';

/**
 * GET /api/projects/[id]/standups
 * Obtiene los standups del proyecto (por defecto del día actual)
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

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Si no se proporciona fecha, usar hoy
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const standups = await Standup.find({
      projectId: params.id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ standups });
  } catch (error) {
    console.error('Error getting standups:', error);
    return NextResponse.json(
      { error: 'Error obteniendo standups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/standups
 * Crea un nuevo standup
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { yesterday, today, blockers, risks } = body;

    if (!yesterday || !today) {
      return NextResponse.json(
        { error: 'Los campos "yesterday" y "today" son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un standup del usuario para hoy
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingStandup = await Standup.findOne({
      projectId: params.id,
      userId: (session.user as any).id,
      date: {
        $gte: todayStart,
        $lte: todayEnd
      }
    });

    if (existingStandup) {
      return NextResponse.json(
        { error: 'Ya existe un standup para hoy. Usa PUT para actualizarlo.' },
        { status: 400 }
      );
    }

    const standup = await Standup.create({
      projectId: params.id,
      userId: (session.user as any).id,
      yesterday,
      today,
      blockers: blockers || '',
      risks: risks || '',
      date: new Date()
    });

    // Populate user data
    const populatedStandup = await Standup.findById(standup._id)
      .populate('userId', 'name email')
      .lean();

    // Notificar al equipo en segundo plano
    notifyStandupCreated({
      projectId: params.id,
      standupId: standup._id.toString(),
      userId: (session.user as any).id,
      userName: (session.user as any).name || 'Usuario',
      yesterday,
      today,
      blockers: blockers || '',
      risks: risks || ''
    }).catch(err => console.error('Error notifying standup:', err));

    return NextResponse.json(populatedStandup, { status: 201 });
  } catch (error) {
    console.error('Error creating standup:', error);
    return NextResponse.json(
      { error: 'Error creando standup' },
      { status: 500 }
    );
  }
}

/**
 * Notifica al equipo cuando alguien crea un standup
 */
async function notifyStandupCreated(params: {
  projectId: string;
  standupId: string;
  userId: string;
  userName: string;
  yesterday: string;
  today: string;
  blockers: string;
  risks: string;
}) {
  try {
    const { projectId, standupId, userId, userName, yesterday, today, blockers, risks } = params;

    // Obtener proyecto y sus miembros
    const project = await Project.findById(projectId)
      .select('name members owner')
      .lean() as any;

    if (!project) return;

    // Obtener todos los miembros del proyecto (excluyendo al que creó el standup)
    const memberIds = [
      project.owner?.toString(),
      ...(project.members?.map((m: any) => m.user?.toString() || m.toString()) || [])
    ].filter((id: string) => id && id !== userId);

    const uniqueMemberIds = [...new Set(memberIds)];

    if (uniqueMemberIds.length === 0) return;

    // Obtener usuarios activos
    const users = await User.find({
      _id: { $in: uniqueMemberIds },
      isActive: true
    }).select('_id email name emailNotifications').lean();

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const standupUrl = `${baseUrl}/projects/${projectId}?tab=standups`;
    const today_date = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Crear notificaciones internas
    const title = `📋 ${userName} registró su standup`;
    const message = `Ayer: ${yesterday.substring(0, 100)}${yesterday.length > 100 ? '...' : ''}\nHoy: ${today.substring(0, 100)}${today.length > 100 ? '...' : ''}`;

    const notificationPromises = users.map(async (user: any) => {
      try {
        await Notification.create({
          userId: user._id,
          type: 'CHANNEL_MENTION',
          title,
          message,
          projectId,
          actionUrl: `/projects/${projectId}?tab=standups`
        });
      } catch (err) {
        console.error(`Error creating standup notification for user ${user._id}:`, err);
      }
    });

    await Promise.all(notificationPromises);

    // Obtener emails de usuarios que no han deshabilitado notificaciones
    const emailRecipients = users
      .filter((user: any) => user.emailNotifications?.enabled !== false && user.email)
      .map((user: any) => user.email);

    // Enviar un solo email con BCC
    if (emailRecipients.length > 0) {
      const emailContent = emailTemplates.standupCreated({
        userName,
        projectName: project.name,
        yesterday,
        today,
        blockers: blockers || undefined,
        risks: risks || undefined,
        standupUrl,
        date: today_date
      });

      await sendEmail({
        to: process.env.EMAIL_USERNAME || 'orcaevolution@orcagrc.com',
        bcc: emailRecipients,
        subject: emailContent.subject,
        html: emailContent.html
      });

      console.log(`[STANDUP_NOTIFICATION] Email sent to ${emailRecipients.length} team members`);
    }

    console.log(`[STANDUP_NOTIFICATION] Notified ${users.length} team members about ${userName}'s standup`);
  } catch (error) {
    console.error('[STANDUP_NOTIFICATION] Error:', error);
  }
}

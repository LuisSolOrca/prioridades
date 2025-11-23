import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Priority from '@/models/Priority';
import ChannelMessage from '@/models/ChannelMessage';
import User from '@/models/User';
import StrategicInitiative from '@/models/StrategicInitiative';

/**
 * GET /api/search
 * Búsqueda avanzada en prioridades, mensajes y links
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const term = searchParams.get('term');
    const type = searchParams.get('type') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const userId = searchParams.get('userId');
    const initiativeId = searchParams.get('initiativeId');

    if (!term || !projectId) {
      return NextResponse.json(
        { error: 'Término de búsqueda y projectId son requeridos' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    const searchRegex = new RegExp(term, 'i');

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
    }

    // Search Priorities
    if (type === 'all' || type === 'priorities') {
      const priorityQuery: any = {
        projectId,
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      };

      if (userId) {
        priorityQuery.userId = userId;
      }

      if (initiativeId) {
        priorityQuery.initiativeIds = initiativeId;
      }

      if (dateFrom || dateTo) {
        priorityQuery.createdAt = dateFilter;
      }

      const priorities = await Priority.find(priorityQuery)
        .populate('userId', 'name email')
        .populate('initiativeIds', 'name color')
        .limit(20)
        .lean();

      priorities.forEach((priority: any) => {
        results.push({
          _id: priority._id,
          type: 'priority',
          title: priority.title,
          content: priority.description,
          status: priority.status,
          completionPercentage: priority.completionPercentage,
          user: priority.userId,
          createdAt: priority.createdAt
        });
      });
    }

    // Search Messages
    if (type === 'all' || type === 'messages') {
      const messageQuery: any = {
        projectId,
        content: searchRegex,
        isDeleted: false
      };

      if (userId) {
        messageQuery.userId = userId;
      }

      if (dateFrom || dateTo) {
        messageQuery.createdAt = dateFilter;
      }

      const messages = await ChannelMessage.find(messageQuery)
        .populate('userId', 'name email')
        .limit(20)
        .lean();

      messages.forEach((message: any) => {
        results.push({
          _id: message._id,
          type: 'message',
          title: 'Mensaje en canal',
          content: message.content,
          user: message.userId,
          createdAt: message.createdAt
        });
      });
    }

    // Search Links (messages with URLs)
    if (type === 'all' || type === 'links') {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const linkQuery: any = {
        projectId,
        content: urlRegex,
        isDeleted: false
      };

      if (userId) {
        linkQuery.userId = userId;
      }

      if (dateFrom || dateTo) {
        linkQuery.createdAt = dateFilter;
      }

      const linkMessages = await ChannelMessage.find(linkQuery)
        .populate('userId', 'name email')
        .limit(20)
        .lean();

      linkMessages.forEach((message: any) => {
        const urls = message.content.match(urlRegex) || [];
        if (urls.length > 0 && message.content.toLowerCase().includes(term.toLowerCase())) {
          results.push({
            _id: message._id,
            type: 'link',
            title: `Link compartido: ${urls[0].substring(0, 50)}...`,
            content: message.content,
            user: message.userId,
            createdAt: message.createdAt
          });
        }
      });
    }

    // Sort by date (most recent first)
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json(
      { error: 'Error en la búsqueda' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import { triggerPusherEvent } from '@/lib/pusher-server';

/**
 * POST /api/projects/[id]/messages/[messageId]/user-story-mapping
 * Agregar actividad, historia o release
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, title, activityId, text, releaseId, color } = body;

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'user-story-mapping') {
      return NextResponse.json({ error: 'No es un User Story Mapping' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Story Map cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    if (action === 'addActivity') {
      if (!title?.trim()) {
        return NextResponse.json({ error: 'Título requerido' }, { status: 400 });
      }

      const newActivity = {
        id: Date.now().toString(),
        title: title.trim(),
        userId,
        userName,
        stories: []
      };
      message.commandData.activities.push(newActivity);
    } else if (action === 'addStory') {
      if (!activityId || !text?.trim() || !releaseId) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
      }

      const activity = message.commandData.activities.find((a: any) => a.id === activityId);
      if (!activity) {
        return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 400 });
      }

      const newStory = {
        id: Date.now().toString(),
        text: text.trim(),
        userId,
        userName,
        releaseId
      };
      activity.stories.push(newStory);
    } else if (action === 'addRelease') {
      if (!title?.trim()) {
        return NextResponse.json({ error: 'Título requerido' }, { status: 400 });
      }

      const newRelease = {
        id: Date.now().toString(),
        title: title.trim(),
        color: color || '#3b82f6'
      };
      message.commandData.releases.push(newRelease);
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .lean();

        await triggerPusherEvent(
          `presence-channel-${message.channelId}`,
          'message-updated',
          populatedMessage
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error in user-story-mapping POST:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/messages/[messageId]/user-story-mapping
 * Eliminar actividad o historia
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { action, activityId, storyId } = await request.json();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'user-story-mapping') {
      return NextResponse.json({ error: 'No es un User Story Mapping' }, { status: 400 });
    }

    if (message.commandData.closed) {
      return NextResponse.json({ error: 'Story Map cerrado' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    if (action === 'deleteActivity') {
      const actIndex = message.commandData.activities.findIndex((a: any) => a.id === activityId);
      if (actIndex === -1) {
        return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 400 });
      }

      const activity = message.commandData.activities[actIndex];
      if (activity.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      message.commandData.activities.splice(actIndex, 1);
    } else if (action === 'deleteStory') {
      const activity = message.commandData.activities.find((a: any) => a.id === activityId);
      if (!activity) {
        return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 400 });
      }

      const storyIndex = activity.stories.findIndex((s: any) => s.id === storyId);
      if (storyIndex === -1) {
        return NextResponse.json({ error: 'Historia no encontrada' }, { status: 400 });
      }

      const story = activity.stories[storyIndex];
      if (story.userId !== userId && (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      activity.stories.splice(storyIndex, 1);
    }

    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .lean();

        await triggerPusherEvent(
          `presence-channel-${message.channelId}`,
          'message-updated',
          populatedMessage
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error in user-story-mapping PATCH:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/messages/[messageId]/user-story-mapping
 * Cerrar (solo creador)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const message = await ChannelMessage.findById(params.messageId);
    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (message.commandType !== 'user-story-mapping') {
      return NextResponse.json({ error: 'No es un User Story Mapping' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    if (message.commandData.createdBy !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    message.commandData.closed = true;
    message.markModified('commandData');
    await message.save();

    const savedMessage = message.toObject();

    (async () => {
      try {
        const populatedMessage = await ChannelMessage.findById(message._id)
          .populate('userId', 'name email')
          .lean();

        await triggerPusherEvent(
          `presence-channel-${message.channelId}`,
          'message-updated',
          populatedMessage
        );
      } catch (pusherError) {
        console.error('Error triggering Pusher event:', pusherError);
      }
    })();

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error closing user-story-mapping:', error);
    return NextResponse.json({ error: 'Error al cerrar' }, { status: 500 });
  }
}

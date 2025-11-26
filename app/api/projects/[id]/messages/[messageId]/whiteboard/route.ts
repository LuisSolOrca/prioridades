import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';
import Whiteboard from '@/models/Whiteboard';
import { triggerPusherEvent } from '@/lib/pusher-server';
import mongoose from 'mongoose';

/**
 * POST /api/projects/[id]/messages/[messageId]/whiteboard
 * Crea una pizarra desde un slash command y actualiza el mensaje
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { title } = body;

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Usuario';

    // Obtener el mensaje
    const message = await ChannelMessage.findOne({
      _id: new mongoose.Types.ObjectId(params.messageId),
      projectId: new mongoose.Types.ObjectId(params.id),
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que es un comando de whiteboard
    if (message.commandType !== 'whiteboard') {
      return NextResponse.json(
        { error: 'El mensaje no es un comando de pizarra' },
        { status: 400 }
      );
    }

    // Verificar que no existe ya una pizarra para este mensaje
    if (message.commandData?.whiteboardId) {
      return NextResponse.json(
        { error: 'Ya existe una pizarra para este mensaje' },
        { status: 400 }
      );
    }

    // Crear la pizarra
    const whiteboard = await Whiteboard.create({
      projectId: new mongoose.Types.ObjectId(params.id),
      channelId: message.channelId,
      messageId: message._id,
      title: title || message.commandData?.title || 'Pizarra sin título',
      elements: [],
      appState: {
        viewBackgroundColor: '#ffffff',
        currentItemFontFamily: 1
      },
      files: {},
      createdBy: new mongoose.Types.ObjectId(userId),
      collaborators: [new mongoose.Types.ObjectId(userId)],
      isActive: true,
      version: 1
    });

    // Actualizar commandData del mensaje con el ID de la pizarra
    message.commandData = {
      ...message.commandData,
      whiteboardId: whiteboard._id.toString(),
      createdByName: userName
    };
    message.markModified('commandData');
    await message.save();

    // Poblar el mensaje para Pusher
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .lean();

    // Broadcast via Pusher para actualizar el mensaje
    try {
      await triggerPusherEvent(
        `presence-channel-${message.channelId}`,
        'message-updated',
        {
          ...populatedMessage,
          _id: (populatedMessage as any)._id.toString(),
          userId: (populatedMessage as any).userId ? {
            ...(populatedMessage as any).userId,
            _id: (populatedMessage as any).userId._id.toString()
          } : null
        }
      );
    } catch (pusherError) {
      console.error('Error triggering Pusher event:', pusherError);
    }

    // Poblar la pizarra para la respuesta
    const populatedWhiteboard = await Whiteboard.findById(whiteboard._id)
      .populate('createdBy', 'name email')
      .lean();

    const serialized = {
      ...populatedWhiteboard,
      _id: (populatedWhiteboard as any)._id.toString(),
      projectId: (populatedWhiteboard as any).projectId.toString(),
      channelId: (populatedWhiteboard as any).channelId.toString(),
      messageId: (populatedWhiteboard as any).messageId?.toString() || null,
      createdBy: (populatedWhiteboard as any).createdBy ? {
        ...(populatedWhiteboard as any).createdBy,
        _id: (populatedWhiteboard as any).createdBy._id.toString()
      } : null,
      collaborators: ((populatedWhiteboard as any).collaborators || []).map((c: any) => c.toString())
    };

    return NextResponse.json({ whiteboard: serialized }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating whiteboard from message:', error);
    return NextResponse.json(
      { error: error.message || 'Error creando pizarra' },
      { status: 500 }
    );
  }
}

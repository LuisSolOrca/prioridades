import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelReadMarker from '@/models/ChannelReadMarker';
import ChannelMessage from '@/models/ChannelMessage';
import mongoose from 'mongoose';

/**
 * GET /api/projects/[id]/channels/[channelId]/read-marker
 * Obtiene el marcador de lectura del usuario actual para este canal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const channelObjectId = new mongoose.Types.ObjectId(params.channelId);

    const marker = await ChannelReadMarker.findOne({
      channelId: channelObjectId,
      userId: userObjectId
    }).lean();

    if (!marker) {
      return NextResponse.json({ marker: null });
    }

    // Contar mensajes no leídos
    const unreadCount = await ChannelMessage.countDocuments({
      channelId: channelObjectId,
      isDeleted: false,
      createdAt: { $gt: marker.lastReadAt }
    });

    return NextResponse.json({
      marker: {
        lastReadMessageId: marker.lastReadMessageId,
        lastReadAt: marker.lastReadAt
      },
      unreadCount
    });
  } catch (error: any) {
    console.error('Error fetching read marker:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo marcador de lectura' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/channels/[channelId]/read-marker
 * Actualiza el marcador de lectura del usuario actual
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const channelObjectId = new mongoose.Types.ObjectId(params.channelId);

    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId es requerido' },
        { status: 400 }
      );
    }

    const messageObjectId = new mongoose.Types.ObjectId(messageId);

    // Verificar que el mensaje existe
    const message = await ChannelMessage.findOne({
      _id: messageObjectId,
      channelId: channelObjectId,
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    // Usar upsert para crear o actualizar
    const marker = await ChannelReadMarker.findOneAndUpdate(
      {
        channelId: channelObjectId,
        userId: userObjectId
      },
      {
        lastReadMessageId: messageObjectId,
        lastReadAt: message.createdAt
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return NextResponse.json({
      marker: {
        lastReadMessageId: marker.lastReadMessageId,
        lastReadAt: marker.lastReadAt
      }
    });
  } catch (error: any) {
    console.error('Error updating read marker:', error);
    return NextResponse.json(
      { error: error.message || 'Error actualizando marcador de lectura' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/channels/[channelId]/read-marker
 * Marca todos los mensajes como leídos (hasta el último mensaje)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const channelObjectId = new mongoose.Types.ObjectId(params.channelId);

    // Obtener el último mensaje del canal
    const lastMessage = await ChannelMessage.findOne({
      channelId: channelObjectId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    if (!lastMessage) {
      return NextResponse.json({
        marker: null,
        message: 'No hay mensajes en el canal'
      });
    }

    // Usar upsert para crear o actualizar
    const marker = await ChannelReadMarker.findOneAndUpdate(
      {
        channelId: channelObjectId,
        userId: userObjectId
      },
      {
        lastReadMessageId: lastMessage._id,
        lastReadAt: lastMessage.createdAt
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return NextResponse.json({
      marker: {
        lastReadMessageId: marker.lastReadMessageId,
        lastReadAt: marker.lastReadAt
      },
      unreadCount: 0
    });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: error.message || 'Error marcando como leído' },
      { status: 500 }
    );
  }
}

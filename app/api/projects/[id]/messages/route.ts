import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ChannelMessage from '@/models/ChannelMessage';

/**
 * GET /api/projects/[id]/messages
 * Obtiene los mensajes del chat del proyecto
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const parentMessageId = searchParams.get('parentMessageId');

    // Construir query
    const query: any = {
      projectId: params.id,
      isDeleted: false
    };

    // Si se especifica parentMessageId, obtener respuestas del hilo
    if (parentMessageId) {
      query.parentMessageId = parentMessageId;
    } else {
      // Solo mensajes principales (no respuestas)
      query.parentMessageId = null;
    }

    // Obtener mensajes
    const messages = await ChannelMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .populate('reactions.userId', 'name')
      .lean();

    // Contar total
    const total = await ChannelMessage.countDocuments(query);

    return NextResponse.json({
      messages,
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error getting project messages:', error);
    return NextResponse.json(
      { error: 'Error obteniendo mensajes del proyecto' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/messages
 * Envía un nuevo mensaje en el chat del proyecto
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { content, mentions = [], parentMessageId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'El contenido del mensaje es requerido' },
        { status: 400 }
      );
    }

    // Crear mensaje
    const message = await ChannelMessage.create({
      projectId: params.id,
      userId: session.user.id,
      content: content.trim(),
      mentions,
      parentMessageId: parentMessageId || null,
      reactions: [],
      replyCount: 0,
      isEdited: false,
      isDeleted: false
    });

    // Si es una respuesta, incrementar contador en el mensaje padre
    if (parentMessageId) {
      await ChannelMessage.findByIdAndUpdate(parentMessageId, {
        $inc: { replyCount: 1 }
      });
    }

    // Poblar el mensaje creado
    const populatedMessage = await ChannelMessage.findById(message._id)
      .populate('userId', 'name email')
      .populate('mentions', 'name email')
      .lean();

    return NextResponse.json(populatedMessage, { status: 201 });
  } catch (error) {
    console.error('Error creating project message:', error);
    return NextResponse.json(
      { error: 'Error creando mensaje' },
      { status: 500 }
    );
  }
}

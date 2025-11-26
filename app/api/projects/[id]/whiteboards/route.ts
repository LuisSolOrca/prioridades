import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Whiteboard from '@/models/Whiteboard';
import mongoose from 'mongoose';

/**
 * GET /api/projects/[id]/whiteboards
 * Lista todas las pizarras del proyecto
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
    const channelId = searchParams.get('channelId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {
      projectId: new mongoose.Types.ObjectId(params.id),
      isActive: true
    };

    if (channelId) {
      query.channelId = new mongoose.Types.ObjectId(channelId);
    }

    const whiteboards = await Whiteboard.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .lean();

    // Convertir ObjectIds a strings
    const serialized = whiteboards.map((wb: any) => ({
      ...wb,
      _id: wb._id.toString(),
      projectId: wb.projectId.toString(),
      channelId: wb.channelId.toString(),
      messageId: wb.messageId?.toString() || null,
      createdBy: wb.createdBy ? {
        ...wb.createdBy,
        _id: wb.createdBy._id.toString()
      } : null,
      lastModifiedBy: wb.lastModifiedBy ? {
        ...wb.lastModifiedBy,
        _id: wb.lastModifiedBy._id.toString()
      } : null,
      collaborators: wb.collaborators?.map((c: any) => c.toString()) || []
    }));

    return NextResponse.json({ whiteboards: serialized });
  } catch (error: any) {
    console.error('Error fetching whiteboards:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo pizarras' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/whiteboards
 * Crea una nueva pizarra
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
    const { title, channelId, messageId } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    // Si no se proporciona channelId, usar el projectId como canal principal
    const effectiveChannelId = channelId || params.id;

    const userId = (session.user as any).id;

    const whiteboard = await Whiteboard.create({
      projectId: new mongoose.Types.ObjectId(params.id),
      channelId: new mongoose.Types.ObjectId(effectiveChannelId),
      messageId: messageId ? new mongoose.Types.ObjectId(messageId) : null,
      title: title.trim(),
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

    const populated = await Whiteboard.findById(whiteboard._id)
      .populate('createdBy', 'name email')
      .lean();

    const serialized = {
      ...populated,
      _id: (populated as any)._id.toString(),
      projectId: (populated as any).projectId.toString(),
      channelId: (populated as any).channelId.toString(),
      messageId: (populated as any).messageId?.toString() || null,
      createdBy: (populated as any).createdBy ? {
        ...(populated as any).createdBy,
        _id: (populated as any).createdBy._id.toString()
      } : null,
      collaborators: (populated as any).collaborators?.map((c: any) => c.toString()) || []
    };

    return NextResponse.json({ whiteboard: serialized }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating whiteboard:', error);
    return NextResponse.json(
      { error: error.message || 'Error creando pizarra' },
      { status: 500 }
    );
  }
}

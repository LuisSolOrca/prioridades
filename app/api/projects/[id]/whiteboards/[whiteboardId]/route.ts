import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Whiteboard from '@/models/Whiteboard';
import mongoose from 'mongoose';

/**
 * GET /api/projects/[id]/whiteboards/[whiteboardId]
 * Obtiene una pizarra específica con todos sus elementos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; whiteboardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const whiteboard = await Whiteboard.findOne({
      _id: new mongoose.Types.ObjectId(params.whiteboardId),
      projectId: new mongoose.Types.ObjectId(params.id),
      isActive: true
    })
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('collaborators', 'name email')
      .lean();

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Pizarra no encontrada' },
        { status: 404 }
      );
    }

    const serialized = {
      ...whiteboard,
      _id: (whiteboard as any)._id.toString(),
      projectId: (whiteboard as any).projectId.toString(),
      channelId: (whiteboard as any).channelId.toString(),
      messageId: (whiteboard as any).messageId?.toString() || null,
      createdBy: (whiteboard as any).createdBy ? {
        ...(whiteboard as any).createdBy,
        _id: (whiteboard as any).createdBy._id.toString()
      } : null,
      lastModifiedBy: (whiteboard as any).lastModifiedBy ? {
        ...(whiteboard as any).lastModifiedBy,
        _id: (whiteboard as any).lastModifiedBy._id.toString()
      } : null,
      collaborators: ((whiteboard as any).collaborators || []).map((c: any) => ({
        ...c,
        _id: c._id.toString()
      }))
    };

    return NextResponse.json({ whiteboard: serialized });
  } catch (error: any) {
    console.error('Error fetching whiteboard:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo pizarra' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/whiteboards/[whiteboardId]
 * Actualiza metadatos de la pizarra (título)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; whiteboardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { title } = body;

    const whiteboard = await Whiteboard.findOne({
      _id: new mongoose.Types.ObjectId(params.whiteboardId),
      projectId: new mongoose.Types.ObjectId(params.id),
      isActive: true
    });

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Pizarra no encontrada' },
        { status: 404 }
      );
    }

    if (title && title.trim().length > 0) {
      whiteboard.title = title.trim();
    }

    whiteboard.lastModifiedBy = new mongoose.Types.ObjectId((session.user as any).id);
    await whiteboard.save();

    return NextResponse.json({ success: true, whiteboard });
  } catch (error: any) {
    console.error('Error updating whiteboard:', error);
    return NextResponse.json(
      { error: error.message || 'Error actualizando pizarra' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/whiteboards/[whiteboardId]
 * Soft delete de la pizarra (solo creador o admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; whiteboardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const whiteboard = await Whiteboard.findOne({
      _id: new mongoose.Types.ObjectId(params.whiteboardId),
      projectId: new mongoose.Types.ObjectId(params.id),
      isActive: true
    });

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Pizarra no encontrada' },
        { status: 404 }
      );
    }

    // Solo el creador o admin puede eliminar
    if (whiteboard.createdBy.toString() !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar esta pizarra' },
        { status: 403 }
      );
    }

    whiteboard.isActive = false;
    await whiteboard.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting whiteboard:', error);
    return NextResponse.json(
      { error: error.message || 'Error eliminando pizarra' },
      { status: 500 }
    );
  }
}

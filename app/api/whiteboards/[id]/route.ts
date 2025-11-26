import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Whiteboard from '@/models/Whiteboard';
import mongoose from 'mongoose';

/**
 * GET /api/whiteboards/[id]
 * Obtiene una pizarra por ID (sin necesidad de projectId)
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

    const whiteboard = await Whiteboard.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
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

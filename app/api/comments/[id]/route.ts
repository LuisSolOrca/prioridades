import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const comment = await Comment.findById(params.id);

    if (!comment) {
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
    }

    // Solo el autor del comentario o un admin pueden eliminarlo
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (comment.userId.toString() !== userId && userRole !== 'ADMIN') {
      return NextResponse.json({
        error: 'No tienes permiso para eliminar este comentario'
      }, { status: 403 });
    }

    await Comment.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Comentario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const comment = await Comment.findById(params.id);

    if (!comment) {
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
    }

    // Solo el autor del comentario puede editarlo
    const userId = (session.user as any).id;

    if (comment.userId.toString() !== userId) {
      return NextResponse.json({
        error: 'No tienes permiso para editar este comentario'
      }, { status: 403 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        error: 'El comentario no puede estar vacío'
      }, { status: 400 });
    }

    comment.text = text.trim();
    await comment.save();

    const updatedComment = await Comment.findById(comment._id)
      .populate('userId', 'name email')
      .lean();

    return NextResponse.json(updatedComment);
  } catch (error: any) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

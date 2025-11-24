import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Attachment from '@/models/Attachment';
import { deleteFileFromR2 } from '@/lib/r2-client';

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

    // Eliminar attachments asociados al comentario
    if (comment.attachments && comment.attachments.length > 0) {
      try {
        // Obtener los attachments de la base de datos
        const attachments = await Attachment.find({
          _id: { $in: comment.attachments },
          isDeleted: false
        });

        // Eliminar cada archivo de R2 y marcar como eliminado en DB
        for (const attachment of attachments) {
          try {
            // Eliminar de R2
            await deleteFileFromR2(attachment.r2Key);
            console.log(`[DELETE COMMENT] Deleted file from R2: ${attachment.r2Key}`);
          } catch (r2Error) {
            console.error(`[DELETE COMMENT] Error deleting file from R2: ${attachment.r2Key}`, r2Error);
            // Continuar aunque falle R2
          }

          // Soft delete en base de datos
          attachment.isDeleted = true;
          attachment.deletedAt = new Date();
          attachment.deletedBy = userId as any;
          await attachment.save();
        }

        console.log(`[DELETE COMMENT] Deleted ${attachments.length} attachment(s) for comment ${params.id}`);
      } catch (attachmentError) {
        console.error('[DELETE COMMENT] Error deleting attachments:', attachmentError);
        // Continuar con la eliminación del comentario aunque falle la eliminación de attachments
      }
    }

    // Eliminar el comentario
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

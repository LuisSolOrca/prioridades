import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Attachment from '@/models/Attachment';
import { getDownloadUrl, deleteFileFromR2 } from '@/lib/r2-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/attachments/[attachmentId]
 * Obtiene URL de descarga firmada para un archivo
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Buscar archivo
    const attachment = await Attachment.findOne({
      _id: params.attachmentId,
      projectId: params.id,
      isDeleted: false
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Generar URL firmada (válida por 1 hora)
    const downloadUrl = await getDownloadUrl({
      key: attachment.r2Key,
      expiresIn: 3600
    });

    return NextResponse.json({
      downloadUrl,
      attachment: {
        _id: attachment._id,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        uploadedAt: attachment.uploadedAt
      }
    });
  } catch (error) {
    console.error('Error getting download URL:', error);
    return NextResponse.json(
      { error: 'Error al obtener URL de descarga' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/attachments/[attachmentId]
 * Elimina un archivo (soft delete en DB, elimina de R2)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Buscar archivo
    const attachment = await Attachment.findOne({
      _id: params.attachmentId,
      projectId: params.id,
      isDeleted: false
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos: solo el que subió o admin puede eliminar
    if (
      attachment.uploadedBy.toString() !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar este archivo' },
        { status: 403 }
      );
    }

    // Eliminar de R2
    try {
      await deleteFileFromR2(attachment.r2Key);
    } catch (r2Error) {
      console.error('Error deleting from R2:', r2Error);
      // Continuar aunque falle R2, al menos marcar como eliminado
    }

    // Soft delete en base de datos
    attachment.isDeleted = true;
    attachment.deletedAt = new Date();
    attachment.deletedBy = session.user.id as any;
    await attachment.save();

    return NextResponse.json({
      success: true,
      message: 'Archivo eliminado correctamente'
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Error al eliminar archivo' },
      { status: 500 }
    );
  }
}

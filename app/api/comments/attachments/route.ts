import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Attachment from '@/models/Attachment';
import { uploadFileToR2, generateR2Key, validateFileSize, isR2Configured, sanitizeMetadata } from '@/lib/r2-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/comments/attachments
 * Sube un archivo para un comentario de prioridad
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar configuración de R2
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'El almacenamiento de archivos no está configurado' },
        { status: 503 }
      );
    }

    await connectDB();

    // Obtener el archivo del form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const priorityId = formData.get('priorityId') as string | null;
    const commentId = formData.get('commentId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    if (!priorityId) {
      return NextResponse.json(
        { error: 'Se requiere priorityId' },
        { status: 400 }
      );
    }

    // Validar tamaño (50MB máximo)
    if (!validateFileSize(file.size, 50)) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido (50MB)' },
        { status: 400 }
      );
    }

    // Convertir archivo a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar key único para R2 (usar priorityId como prefijo)
    const r2Key = generateR2Key(`priority-${priorityId}`, file.name);

    // Preparar metadata
    const metadata: Record<string, string> = {
      priorityId,
      uploadedBy: (session.user as any).id,
      originalName: sanitizeMetadata(file.name)
    };

    // Solo agregar commentId si existe
    if (commentId) {
      metadata.commentId = commentId;
    }

    // Subir a R2
    await uploadFileToR2({
      key: r2Key,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
      metadata
    });

    // Guardar en base de datos
    const attachment = await Attachment.create({
      priorityId,
      commentId: commentId || null,
      fileName: file.name,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      r2Key,
      uploadedBy: (session.user as any).id,
      isPublic: false,
      isDeleted: false
    });

    // Poblar información del usuario
    const populatedAttachment = await Attachment.findById(attachment._id)
      .populate('uploadedBy', 'name email')
      .lean();

    return NextResponse.json({
      success: true,
      attachment: populatedAttachment
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}

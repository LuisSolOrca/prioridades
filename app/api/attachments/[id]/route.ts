import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Attachment from '@/models/Attachment';
import { getDownloadUrl } from '@/lib/r2-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/attachments/[id]
 * Obtiene URL de descarga firmada para cualquier attachment (proyecto o prioridad)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const attachment = await Attachment.findById(id).lean() as any;

    if (!attachment) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    if (attachment.isDeleted) {
      return NextResponse.json({ error: 'Archivo eliminado' }, { status: 410 });
    }

    // Generar URL firmada temporal (válida por 1 hora)
    const downloadUrl = await getDownloadUrl({
      key: attachment.r2Key,
      expiresIn: 3600
    });

    return NextResponse.json({
      downloadUrl,
      fileName: attachment.originalName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType
    });
  } catch (error) {
    console.error('Error getting attachment:', error);
    return NextResponse.json(
      { error: 'Error al obtener el archivo' },
      { status: 500 }
    );
  }
}

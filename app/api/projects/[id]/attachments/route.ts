import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Attachment from '@/models/Attachment';
import { uploadFileToR2, generateR2Key, validateFileSize, validateFileType, isR2Configured } from '@/lib/r2-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/attachments
 * Sube un archivo al proyecto
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
    const channelId = formData.get('channelId') as string | null;
    const messageId = formData.get('messageId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
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

    // Generar key único para R2
    const r2Key = generateR2Key(params.id, file.name);

    // Subir a R2
    await uploadFileToR2({
      key: r2Key,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
      metadata: {
        projectId: params.id,
        uploadedBy: session.user.id,
        originalName: file.name
      }
    });

    // Guardar en base de datos
    const attachment = await Attachment.create({
      projectId: params.id,
      channelId: channelId || null,
      messageId: messageId || null,
      fileName: file.name,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      r2Key,
      uploadedBy: session.user.id,
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
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/attachments
 * Lista archivos del proyecto con paginación
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
    const channelId = searchParams.get('channelId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters: any = {
      projectId: params.id,
      isDeleted: false
    };

    if (channelId) {
      filters.channelId = channelId;
    }

    // Obtener archivos
    const attachments = await Attachment.find(filters)
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total
    const total = await Attachment.countDocuments(filters);

    return NextResponse.json({
      attachments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing attachments:', error);
    return NextResponse.json(
      { error: 'Error al listar archivos' },
      { status: 500 }
    );
  }
}

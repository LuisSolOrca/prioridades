import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadFileToR2, isR2Configured, getDownloadUrl } from '@/lib/r2-client';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/voice-upload
 * Sube un mensaje de voz a R2
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

    const body = await request.json();
    const { audioData, mimeType, duration, waveform } = body;

    if (!audioData) {
      return NextResponse.json(
        { error: 'No se proporcionó audio' },
        { status: 400 }
      );
    }

    // Convertir base64 a Buffer
    const buffer = Buffer.from(audioData, 'base64');

    // Validar tamaño (10MB máximo para audio)
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El audio excede el tamaño máximo permitido (10MB)' },
        { status: 400 }
      );
    }

    // Determinar extensión del archivo
    const extension = mimeType?.includes('mp4') ? 'mp4' : 'webm';

    // Generar key único para R2
    const timestamp = Date.now();
    const uniqueId = uuidv4().slice(0, 8);
    const r2Key = `voice/${params.id}/${timestamp}-${uniqueId}.${extension}`;

    // Subir a R2
    await uploadFileToR2({
      key: r2Key,
      body: buffer,
      contentType: mimeType || 'audio/webm',
      metadata: {
        projectId: params.id,
        uploadedBy: session.user.id,
        duration: String(duration || 0)
      }
    });

    return NextResponse.json({
      success: true,
      r2Key,
      duration,
      mimeType: mimeType || 'audio/webm',
      waveform: waveform || []
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading voice message:', error);
    return NextResponse.json(
      { error: 'Error al subir el mensaje de voz' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/voice-upload?r2Key=xxx
 * Obtiene URL firmada para reproducir audio
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

    const { searchParams } = new URL(request.url);
    const r2Key = searchParams.get('r2Key');

    if (!r2Key) {
      return NextResponse.json(
        { error: 'r2Key es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el key pertenece al proyecto
    if (!r2Key.includes(params.id)) {
      return NextResponse.json(
        { error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    // Generar URL firmada (válida por 1 hora)
    const url = await getDownloadUrl({
      key: r2Key,
      expiresIn: 3600
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting voice URL:', error);
    return NextResponse.json(
      { error: 'Error al obtener URL del audio' },
      { status: 500 }
    );
  }
}

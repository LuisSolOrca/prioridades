import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  uploadFileToR2,
  getDownloadUrl,
  isR2Configured,
  validateFileSize,
  validateFileType,
} from '@/lib/r2-client';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_MB = 5;

// POST - Upload an image
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'El almacenamiento de archivos no está configurado' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validate file type
    if (!validateFileType(file.type, ALLOWED_TYPES)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Tipos permitidos: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(file.size, MAX_SIZE_MB)) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // Generate unique key
    const userId = (session.user as any).id;
    const extension = file.name.split('.').pop() || 'jpg';
    const key = `email-images/${userId}/${uuidv4()}.${extension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    await uploadFileToR2({
      key,
      body: buffer,
      contentType: file.type,
      metadata: {
        uploadedBy: userId,
        originalName: file.name.substring(0, 100), // Limit metadata length
      },
    });

    // Generate signed URL with maximum allowed expiration (7 days for S3 signature v4)
    // Note: For permanent email images, consider using R2 public bucket
    const url = await getDownloadUrl({
      key,
      expiresIn: 7 * 24 * 60 * 60, // 7 days (max allowed)
    });

    return NextResponse.json({
      success: true,
      url,
      key,
      contentType: file.type,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}

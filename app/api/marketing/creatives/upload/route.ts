import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  uploadFileToR2,
  getPublicUrl,
  getDownloadUrl,
  isR2Configured,
  validateFileSize,
  validateFileType,
} from '@/lib/r2-client';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 100;

// POST - Upload creative asset
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'El almacenamiento de archivos no está configurado' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo imágenes y videos.' },
        { status: 400 }
      );
    }

    // Validate type
    const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
    if (!validateFileType(mimeType, allowedTypes)) {
      return NextResponse.json(
        { error: `Formato no permitido. Permitidos: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate size
    const maxSize = isImage ? MAX_IMAGE_SIZE_MB : MAX_VIDEO_SIZE_MB;
    if (!validateFileSize(file.size, maxSize)) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de ${maxSize}MB` },
        { status: 400 }
      );
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `marketing/creatives/${timestamp}-${randomString}-${sanitizedName}`;

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    await uploadFileToR2({
      key: r2Key,
      body: buffer,
      contentType: mimeType,
      metadata: {
        originalName: sanitizedName,
        uploadedBy: (session.user as any).id,
      },
    });

    // Get URL
    let url = getPublicUrl(r2Key);
    if (!url) {
      // Fallback to signed URL if no public URL
      url = await getDownloadUrl({ key: r2Key, expiresIn: 86400 * 7 }); // 7 days
    }

    // Get dimensions for images (basic approach - in production you'd use sharp or similar)
    let width, height, duration;

    const response = {
      success: true,
      asset: {
        type: isImage ? 'image' : 'video',
        url,
        r2Key,
        mimeType,
        fileSize: file.size,
        width,
        height,
        duration,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading creative asset:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir archivo' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// POST - Generate preview token for landing page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, sections, globalStyles, title } = body;

    // Create a preview token (valid for 1 hour)
    const previewData = {
      pageId: pageId || 'preview',
      sections,
      globalStyles,
      title,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
    };

    // Encode preview data as base64 (for small previews)
    // For larger pages, you might want to store in Redis/DB
    const token = Buffer.from(JSON.stringify(previewData)).toString('base64url');

    return NextResponse.json({
      previewUrl: `/lp/preview?token=${token}`,
      token,
      expiresAt: previewData.expiresAt,
    });
  } catch (error: any) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar preview' },
      { status: 500 }
    );
  }
}

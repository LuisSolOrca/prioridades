import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

const TIKTOK_APP_ID = process.env.TIKTOK_APP_ID;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/tiktok/callback`;

// TikTok for Business scopes
const SCOPES = [
  'user.info.basic',
  'video.list',
  'video.insights',
].join(',');

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!TIKTOK_APP_ID) {
      return NextResponse.json(
        { error: 'TIKTOK_APP_ID no configurado' },
        { status: 500 }
      );
    }

    // Generate CSRF state
    const csrfState = crypto.randomBytes(16).toString('hex');

    // Generate state parameter
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      csrfState,
      timestamp: Date.now(),
    })).toString('base64');

    // Build TikTok OAuth URL
    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.set('client_key', TIKTOK_APP_ID);
    authUrl.searchParams.set('redirect_uri', TIKTOK_REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    console.error('Error generating TikTok auth URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de autenticación' },
      { status: 500 }
    );
  }
}

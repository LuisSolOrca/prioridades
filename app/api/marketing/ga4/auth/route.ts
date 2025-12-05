import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GA4_REDIRECT_URI = process.env.GA4_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/ga4/callback`;

// GA4 specific scopes
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'GOOGLE_CLIENT_ID no configurado' },
        { status: 500 }
      );
    }

    // Generate state parameter
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      platform: 'GA4',
      timestamp: Date.now(),
    })).toString('base64');

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GA4_REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    console.error('Error generating GA4 auth URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de autenticación' },
      { status: 500 }
    );
  }
}

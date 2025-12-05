import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const META_APP_ID = process.env.META_APP_ID;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/meta/callback`;

// Meta OAuth scopes for marketing
const SCOPES = [
  'ads_read',
  'ads_management',
  'business_management',
  'pages_read_engagement',
  'pages_show_list',
  'instagram_basic',
  'instagram_manage_insights',
].join(',');

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!META_APP_ID) {
      return NextResponse.json(
        { error: 'META_APP_ID no configurado' },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString('base64');

    // Build Meta OAuth URL
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', META_REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    console.error('Error generating Meta auth URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de autenticación' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/linkedin/callback`;

// LinkedIn OAuth scopes for marketing
const SCOPES = [
  'r_ads',
  'r_ads_reporting',
  'w_organization_social',
  'r_organization_social',
  'r_basicprofile',
].join(' ');

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!LINKEDIN_CLIENT_ID) {
      return NextResponse.json(
        { error: 'LINKEDIN_CLIENT_ID no configurado' },
        { status: 500 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString('base64');

    // Build LinkedIn OAuth URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', LINKEDIN_REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    console.error('Error generating LinkedIn auth URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de autenticación' },
      { status: 500 }
    );
  }
}

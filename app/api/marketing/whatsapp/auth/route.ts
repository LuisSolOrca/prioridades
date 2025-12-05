import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const META_APP_ID = process.env.META_APP_ID;
const WHATSAPP_REDIRECT_URI = process.env.WHATSAPP_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/marketing/whatsapp/callback`;

// WhatsApp Business specific scopes (through Meta)
const SCOPES = [
  'whatsapp_business_management',
  'whatsapp_business_messaging',
  'business_management',
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

    // Generate state parameter
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      platform: 'WHATSAPP',
      timestamp: Date.now(),
    })).toString('base64');

    // Build Meta OAuth URL for WhatsApp
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', WHATSAPP_REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    console.error('Error generating WhatsApp auth URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de autenticación' },
      { status: 500 }
    );
  }
}

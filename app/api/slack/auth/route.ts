import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/slack/auth
 * Inicia el flujo OAuth de Slack
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/slack/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: 'SLACK_CLIENT_ID no configurado' },
        { status: 500 }
      );
    }

    // Scopes necesarios para la integración
    const scopes = [
      'channels:read',      // Leer lista de canales
      'chat:write',         // Enviar mensajes
      'users:read',         // Leer información del usuario
    ].join(',');

    // Generar URL de autorización de Slack
    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', session.user.id); // Usar user ID como state para seguridad

    return NextResponse.json({
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('Error en /api/slack/auth:', error);
    return NextResponse.json(
      { error: 'Error iniciando autenticación con Slack' },
      { status: 500 }
    );
  }
}

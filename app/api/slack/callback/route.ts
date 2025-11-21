import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import SlackIntegration from '@/models/SlackIntegration';
import mongoose from 'mongoose';

/**
 * GET /api/slack/callback
 * Callback de OAuth de Slack
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    if (error) {
      console.error('Error en OAuth de Slack:', error);
      return NextResponse.redirect(
        new URL('/settings/integrations?slack_error=' + error, process.env.NEXTAUTH_URL || 'http://localhost:3000')
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?slack_error=missing_params', process.env.NEXTAUTH_URL || 'http://localhost:3000')
      );
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/slack/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/settings/integrations?slack_error=config_missing', process.env.NEXTAUTH_URL || 'http://localhost:3000')
      );
    }

    // Intercambiar código por token de acceso
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error('Error obteniendo token de Slack:', tokenData.error);
      return NextResponse.redirect(
        new URL('/settings/integrations?slack_error=' + tokenData.error, process.env.NEXTAUTH_URL || 'http://localhost:3000')
      );
    }

    // Guardar integración en la base de datos
    await connectDB();

    const userId = new mongoose.Types.ObjectId(state);

    await SlackIntegration.findOneAndUpdate(
      { userId },
      {
        userId,
        slackUserId: tokenData.authed_user.id,
        slackTeamId: tokenData.team.id,
        slackTeamName: tokenData.team.name,
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Slack integrado exitosamente para usuario ${state}`);

    // Redirigir a la página de configuración con éxito
    return NextResponse.redirect(
      new URL('/settings/integrations?slack_success=true', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
  } catch (error) {
    console.error('Error en /api/slack/callback:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?slack_error=server_error', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
  }
}

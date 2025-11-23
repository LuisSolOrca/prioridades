import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pusherServer from '@/lib/pusher-server';

/**
 * POST /api/pusher/auth
 * Autentica usuarios para canales privados y de presencia de Pusher
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.text();
    const params = new URLSearchParams(body);
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: 'Socket ID y nombre de canal requeridos' },
        { status: 400 }
      );
    }

    // Datos del usuario para canales de presencia
    const presenceData = {
      user_id: session.user.id,
      user_info: {
        name: session.user.name,
        email: session.user.email
      }
    };

    // Autenticar para canal de presencia
    if (channelName.startsWith('presence-')) {
      const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(authResponse);
    }

    // Autenticar para canal privado
    if (channelName.startsWith('private-')) {
      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    return NextResponse.json(
      { error: 'Tipo de canal no soportado' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error autenticando Pusher:', error);
    return NextResponse.json(
      { error: error.message || 'Error de autenticación' },
      { status: 500 }
    );
  }
}

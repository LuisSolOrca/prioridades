import Pusher from 'pusher-js';

let pusherClient: Pusher | null = null;

export function getPusherClient() {
  if (!pusherClient) {
    pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      authEndpoint: '/api/pusher/auth',
    });

    // Log de conexión en desarrollo
    if (process.env.NODE_ENV === 'development') {
      pusherClient.connection.bind('connected', () => {
        console.log('✅ Pusher connected');
      });

      pusherClient.connection.bind('error', (err: any) => {
        console.error('❌ Pusher connection error:', err);
      });
    }
  }

  return pusherClient;
}

// Limpiar conexión al desmontar
export function disconnectPusher() {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
  }
}

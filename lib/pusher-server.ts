import Pusher from 'pusher';

// Configuración del servidor Pusher
const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  useTLS: true
});

export default pusherServer;

// Helper para triggerar eventos
export async function triggerPusherEvent(
  channel: string,
  event: string,
  data: any
) {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (error) {
    console.error('Error triggering Pusher event:', error);
    throw error;
  }
}

// Helper para triggerar eventos a múltiples canales
export async function triggerPusherBatch(
  channels: string[],
  event: string,
  data: any
) {
  try {
    await pusherServer.triggerBatch(
      channels.map(channel => ({
        channel,
        name: event,
        data
      }))
    );
  } catch (error) {
    console.error('Error triggering Pusher batch event:', error);
    throw error;
  }
}

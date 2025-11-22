import SlackIntegration from '@/models/SlackIntegration';
import Project, { IProject } from '@/models/Project';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

/**
 * Envía un mensaje a un canal de Slack
 */
export async function sendSlackMessage(params: {
  channelId: string;
  text: string;
  blocks?: any[];
  accessToken: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        channel: params.channelId,
        text: params.text,
        blocks: params.blocks,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Error enviando mensaje a Slack:', data.error);
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error en sendSlackMessage:', error);
    return { success: false, error };
  }
}

/**
 * Obtiene la lista de canales públicos del workspace
 */
export async function getSlackChannels(accessToken: string): Promise<{
  success: boolean;
  channels?: Array<{ id: string; name: string; is_private: boolean }>;
  error?: any;
}> {
  try {
    const response = await fetch('https://slack.com/api/conversations.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Error obteniendo canales de Slack:', data.error);
      return { success: false, error: data.error };
    }

    return {
      success: true,
      channels: data.channels.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private,
      })),
    };
  } catch (error) {
    console.error('Error en getSlackChannels:', error);
    return { success: false, error };
  }
}

/**
 * Envía notificación de prioridad a Slack basado en el proyecto
 */
export async function sendPriorityNotificationToSlack(params: {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventType: 'comment' | 'status_change' | 'mention' | 'completion';
  priorityTitle: string;
  message: string;
  priorityUrl?: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    await connectDB();

    // Obtener el proyecto para ver si tiene canal de Slack configurado
    const project = await Project.findById(params.projectId).lean() as IProject | null;
    if (!project || !project.slackChannelId) {
      console.log('Proyecto no tiene canal de Slack configurado');
      return { success: false, error: 'No Slack channel configured' };
    }

    // Obtener la integración organizacional de Slack (única para toda la organización)
    const slackIntegration = await SlackIntegration.findOne({
      isActive: true,
    }).lean();

    if (!slackIntegration) {
      console.log('No hay integración de Slack configurada para la organización');
      return { success: false, error: 'No organizational Slack integration configured' };
    }

    // Emojis por tipo de evento
    const eventEmojis: Record<string, string> = {
      comment: '💬',
      status_change: '🔄',
      mention: '📢',
      completion: '✅',
    };

    const emoji = eventEmojis[params.eventType] || '📝';

    // Crear bloques de mensaje enriquecido
    const blocks: any[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${params.priorityTitle}*`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: params.message,
        },
      },
    ];

    if (params.priorityUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Ver Prioridad',
            },
            url: params.priorityUrl,
          },
        ],
      });
    }

    // Enviar mensaje
    return await sendSlackMessage({
      channelId: project.slackChannelId,
      text: `${emoji} ${params.priorityTitle}: ${params.message}`,
      blocks,
      accessToken: slackIntegration.accessToken,
    });
  } catch (error) {
    console.error('Error en sendPriorityNotificationToSlack:', error);
    return { success: false, error };
  }
}

/**
 * Verifica el token de acceso de Slack
 */
export async function verifySlackToken(accessToken: string): Promise<{
  success: boolean;
  data?: any;
  error?: any;
}> {
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error verificando token de Slack:', error);
    return { success: false, error };
  }
}

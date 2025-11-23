import Webhook from '@/models/Webhook';
import crypto from 'crypto';

/**
 * Dispara webhooks salientes para un evento específico
 */
export async function triggerOutgoingWebhooks(
  projectId: string,
  channelId: string,
  event: string,
  payload: any
) {
  try {
    // Buscar webhooks salientes activos para este proyecto y evento
    const webhooks = await Webhook.find({
      projectId,
      type: 'OUTGOING',
      isActive: true,
      events: event,
      $or: [
        { channelId: null }, // Webhooks para todos los canales
        { channelId }, // Webhooks para este canal específico
      ],
    }).lean();

    if (webhooks.length === 0) {
      return;
    }

    // Disparar cada webhook en paralelo
    const promises = webhooks.map(async (webhook) => {
      try {
        // Crear firma HMAC para seguridad
        const timestamp = Date.now().toString();
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(timestamp + JSON.stringify(payload))
          .digest('hex');

        const response = await fetch(webhook.url!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Event': event,
            'X-Webhook-Id': webhook._id.toString(),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000), // Timeout de 10 segundos
        });

        if (!response.ok) {
          console.error(`Webhook ${webhook._id} failed with status ${response.status}`);
        }

        // Actualizar lastTriggered
        await Webhook.findByIdAndUpdate(webhook._id, {
          lastTriggered: new Date(),
        });
      } catch (error) {
        console.error(`Error triggering webhook ${webhook._id}:`, error);
        // No fallar toda la operación si un webhook falla
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error in triggerOutgoingWebhooks:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Valida la firma de un webhook entrante
 */
export function validateWebhookSignature(
  secret: string,
  timestamp: string,
  signature: string,
  body: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + body)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
}

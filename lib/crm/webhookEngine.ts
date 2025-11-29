import crypto from 'crypto';
import CrmWebhook, { ICrmWebhook, WebhookEvent, IWebhookFilters } from '@/models/CrmWebhook';
import CrmWebhookLog, { ICrmWebhookLog } from '@/models/CrmWebhookLog';
import connectDB from '@/lib/mongodb';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  webhookId: string;
  data: {
    current: Record<string, any>;
    previous?: Record<string, any>;
    changes?: string[];
  };
  meta: {
    triggeredBy?: {
      userId: string;
      userName: string;
    };
    source: 'web' | 'api' | 'workflow' | 'import';
  };
}

export interface TriggerContext {
  entityType: 'deal' | 'contact' | 'client' | 'activity' | 'quote';
  entityId: string;
  entityName?: string;
  current: Record<string, any>;
  previous?: Record<string, any>;
  changes?: string[];
  userId?: string;
  userName?: string;
  source?: 'web' | 'api' | 'workflow' | 'import';
}

/**
 * Genera firma HMAC-SHA256 para el payload
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verifica si un webhook pasa los filtros configurados
 */
function passesFilters(webhook: ICrmWebhook, context: TriggerContext): boolean {
  const filters = webhook.filters;
  if (!filters) return true;

  const data = context.current;

  // Filtro por pipeline
  if (filters.pipelineId && data.pipelineId?.toString() !== filters.pipelineId.toString()) {
    return false;
  }

  // Filtro por etapa
  if (filters.stageId && data.stageId?.toString() !== filters.stageId.toString()) {
    return false;
  }

  // Filtro por propietario
  if (filters.ownerId && data.ownerId?.toString() !== filters.ownerId.toString()) {
    return false;
  }

  // Filtro por valor mínimo
  if (filters.minValue !== undefined && (data.value || 0) < filters.minValue) {
    return false;
  }

  // Filtro por valor máximo
  if (filters.maxValue !== undefined && (data.value || 0) > filters.maxValue) {
    return false;
  }

  return true;
}

/**
 * Ejecuta un webhook individual
 */
async function executeWebhook(
  webhook: ICrmWebhook,
  payload: WebhookPayload,
  context: TriggerContext
): Promise<{ success: boolean; log: ICrmWebhookLog }> {
  const startTime = Date.now();
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Headers estándar + personalizados
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Id': webhook._id.toString(),
    'X-Webhook-Event': payload.event,
    'X-Webhook-Timestamp': timestamp,
    'X-Webhook-Signature': signature,
    'User-Agent': 'PrioridadesApp-Webhook/1.0',
  };

  // Agregar headers personalizados
  if (webhook.headers) {
    const customHeaders = webhook.headers instanceof Map
      ? Object.fromEntries(webhook.headers)
      : webhook.headers;
    Object.assign(headers, customHeaders);
  }

  // Crear log inicial
  const log = new CrmWebhookLog({
    webhookId: webhook._id,
    webhookName: webhook.name,
    event: payload.event,
    payload,
    requestUrl: webhook.url,
    requestHeaders: headers,
    requestBody: payloadString,
    status: 'pending',
    attempts: 1,
    entityType: context.entityType,
    entityId: context.entityId,
    entityName: context.entityName,
    triggeredBy: context.userId,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeoutMs || 10000);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    let responseBody = '';

    try {
      responseBody = await response.text();
      // Limitar tamaño de respuesta almacenada
      if (responseBody.length > 10000) {
        responseBody = responseBody.substring(0, 10000) + '... (truncated)';
      }
    } catch {
      responseBody = '[Unable to read response body]';
    }

    log.responseStatus = response.status;
    log.responseBody = responseBody;
    log.responseTime = responseTime;

    if (response.ok) {
      log.status = 'success';

      // Actualizar estadísticas del webhook
      await CrmWebhook.findByIdAndUpdate(webhook._id, {
        lastTriggeredAt: new Date(),
        lastSuccessAt: new Date(),
        $inc: { totalSent: 1 },
        consecutiveFailures: 0,
      });

      await log.save();
      return { success: true, log };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    log.responseTime = responseTime;
    log.error = error.message || 'Unknown error';

    // Determinar si debe reintentar
    const shouldRetry = log.attempts < webhook.maxRetries;

    if (shouldRetry) {
      // Backoff exponencial: 1min, 5min, 15min
      const delayMinutes = Math.pow(3, log.attempts);
      log.status = 'retrying';
      log.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    } else {
      log.status = 'failed';
    }

    // Actualizar estadísticas del webhook
    await CrmWebhook.findByIdAndUpdate(webhook._id, {
      lastTriggeredAt: new Date(),
      lastErrorAt: new Date(),
      lastError: log.error,
      $inc: {
        totalFailed: shouldRetry ? 0 : 1,
        consecutiveFailures: 1,
      },
    });

    await log.save();
    return { success: false, log };
  }
}

/**
 * Dispara webhooks para un evento CRM
 */
export async function triggerWebhooks(
  event: WebhookEvent,
  context: TriggerContext
): Promise<void> {
  try {
    await connectDB();

    // Buscar webhooks activos para este evento
    const webhooks = await CrmWebhook.findActiveByEvent(event);

    if (webhooks.length === 0) return;

    // Ejecutar webhooks en paralelo (no bloqueante)
    const promises = webhooks.map(async (webhook) => {
      try {
        // Verificar filtros
        if (!passesFilters(webhook, context)) {
          return;
        }

        // Construir payload
        const payload: WebhookPayload = {
          event,
          timestamp: new Date().toISOString(),
          webhookId: webhook._id.toString(),
          data: {
            current: context.current,
            previous: context.previous,
            changes: context.changes,
          },
          meta: {
            triggeredBy: context.userId && context.userName ? {
              userId: context.userId,
              userName: context.userName,
            } : undefined,
            source: context.source || 'web',
          },
        };

        await executeWebhook(webhook, payload, context);
      } catch (error) {
        console.error(`Error executing webhook ${webhook._id}:`, error);
      }
    });

    // No esperamos a que terminen para no bloquear
    Promise.all(promises).catch(console.error);
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

/**
 * Versión async que no bloquea (para usar en API routes)
 */
export function triggerWebhooksAsync(
  event: WebhookEvent,
  context: TriggerContext
): void {
  setImmediate(() => {
    triggerWebhooks(event, context).catch(console.error);
  });
}

/**
 * Reintenta webhooks fallidos
 */
export async function retryFailedWebhooks(): Promise<number> {
  await connectDB();

  const pendingRetries = await CrmWebhookLog.find({
    status: 'retrying',
    nextRetryAt: { $lte: new Date() },
  }).populate('webhookId');

  let retried = 0;

  for (const log of pendingRetries) {
    const webhook = log.webhookId as unknown as ICrmWebhook;
    if (!webhook || !webhook.isActive) {
      log.status = 'failed';
      log.error = 'Webhook disabled or deleted';
      await log.save();
      continue;
    }

    // Incrementar intentos
    log.attempts += 1;

    const payload = log.payload as WebhookPayload;
    const context: TriggerContext = {
      entityType: log.entityType,
      entityId: log.entityId.toString(),
      entityName: log.entityName,
      current: payload.data.current,
      previous: payload.data.previous,
      changes: payload.data.changes,
    };

    await executeWebhook(webhook, payload, context);
    retried++;
  }

  return retried;
}

/**
 * Envía un webhook de prueba
 */
export async function sendTestWebhook(
  webhookId: string
): Promise<{ success: boolean; log?: ICrmWebhookLog; error?: string }> {
  await connectDB();

  const webhook = await CrmWebhook.findById(webhookId);
  if (!webhook) {
    return { success: false, error: 'Webhook no encontrado' };
  }

  const testPayload: WebhookPayload = {
    event: webhook.events[0] || 'deal.created',
    timestamp: new Date().toISOString(),
    webhookId: webhook._id.toString(),
    data: {
      current: {
        _id: '000000000000000000000000',
        title: 'Deal de Prueba',
        value: 50000,
        status: 'open',
        createdAt: new Date().toISOString(),
      },
    },
    meta: {
      triggeredBy: {
        userId: 'test',
        userName: 'Usuario de Prueba',
      },
      source: 'web',
    },
  };

  const context: TriggerContext = {
    entityType: 'deal',
    entityId: '000000000000000000000000',
    entityName: 'Deal de Prueba',
    current: testPayload.data.current,
    source: 'web',
  };

  const result = await executeWebhook(webhook, testPayload, context);
  return { success: result.success, log: result.log };
}

/**
 * Obtiene estadísticas de webhooks
 */
export async function getWebhookStats(webhookId: string): Promise<{
  total: number;
  success: number;
  failed: number;
  pending: number;
  avgResponseTime: number;
}> {
  await connectDB();

  const [stats] = await CrmWebhookLog.aggregate([
    { $match: { webhookId: new (require('mongoose').Types.ObjectId)(webhookId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $in: ['$status', ['pending', 'retrying']] }, 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
  ]);

  return stats || {
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    avgResponseTime: 0,
  };
}

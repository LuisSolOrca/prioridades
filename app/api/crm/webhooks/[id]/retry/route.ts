import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import CrmWebhook from '@/models/CrmWebhook';
import CrmWebhookLog from '@/models/CrmWebhookLog';
import { generateSignature, WebhookPayload, TriggerContext } from '@/lib/crm/webhookEngine';

// POST - Reintentar webhooks fallidos o un log específico
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { logId } = body; // Opcional: reintentar un log específico

    await connectDB();

    const webhook = await CrmWebhook.findById(id);
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook no encontrado' }, { status: 404 });
    }

    if (!webhook.isActive) {
      return NextResponse.json(
        { error: 'El webhook está desactivado' },
        { status: 400 }
      );
    }

    let logsToRetry;

    if (logId) {
      // Reintentar un log específico
      const log = await CrmWebhookLog.findOne({
        _id: logId,
        webhookId: id,
        status: { $in: ['failed', 'retrying'] },
      });

      if (!log) {
        return NextResponse.json(
          { error: 'Log no encontrado o no se puede reintentar' },
          { status: 404 }
        );
      }

      logsToRetry = [log];
    } else {
      // Reintentar todos los fallidos/pending
      logsToRetry = await CrmWebhookLog.find({
        webhookId: id,
        status: { $in: ['failed', 'retrying'] },
      }).limit(10); // Limitar para evitar sobrecarga
    }

    if (logsToRetry.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay webhooks para reintentar',
        retried: 0,
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const log of logsToRetry) {
      try {
        const payload = log.payload as WebhookPayload;
        const payloadString = JSON.stringify(payload);
        const signature = generateSignature(payloadString, webhook.secret);
        const timestamp = Math.floor(Date.now() / 1000).toString();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Webhook-Id': webhook._id.toString(),
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Signature': signature,
          'User-Agent': 'PrioridadesApp-Webhook/1.0',
        };

        if (webhook.headers) {
          const customHeaders = webhook.headers instanceof Map
            ? Object.fromEntries(webhook.headers)
            : webhook.headers;
          Object.assign(headers, customHeaders);
        }

        const startTime = Date.now();
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
          if (responseBody.length > 10000) {
            responseBody = responseBody.substring(0, 10000) + '... (truncated)';
          }
        } catch {
          responseBody = '[Unable to read response body]';
        }

        // Actualizar log
        log.attempts += 1;
        log.responseStatus = response.status;
        log.responseBody = responseBody;
        log.responseTime = responseTime;

        if (response.ok) {
          log.status = 'success';
          log.error = undefined;
          log.nextRetryAt = undefined;
          results.success++;

          // Resetear contador de fallos del webhook
          await CrmWebhook.findByIdAndUpdate(id, {
            lastSuccessAt: new Date(),
            consecutiveFailures: 0,
          });
        } else {
          log.status = 'failed';
          log.error = `HTTP ${response.status}: ${response.statusText}`;
          results.failed++;
          results.errors.push(log.error);
        }

        await log.save();
      } catch (error: any) {
        log.attempts += 1;
        log.status = 'failed';
        log.error = error.message || 'Unknown error';
        await log.save();
        results.failed++;
        results.errors.push(error.message);
      }
    }

    return NextResponse.json({
      success: true,
      retried: logsToRetry.length,
      results,
    });
  } catch (error: any) {
    console.error('Error retrying webhooks:', error);
    return NextResponse.json(
      { error: 'Error al reintentar webhooks' },
      { status: 500 }
    );
  }
}

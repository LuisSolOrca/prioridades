import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/webhooks/teams-bridge
 * Bridge entre Teams Outgoing Webhook y webhook entrante de la app
 *
 * Teams Outgoing Webhook envía mensajes cuando mencionas al bot.
 * Este endpoint los recibe, valida y reenvía al webhook interno.
 *
 * Variables de entorno opcionales:
 * - TEAMS_WEBHOOK_SECRET: Token de seguridad del Outgoing Webhook de Teams (para validación HMAC)
 * - TEAMS_TARGET_WEBHOOK_SECRET: Secret del webhook entrante destino
 */
export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    let body;

    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'JSON inválido' },
        { status: 400 }
      );
    }

    // Validar firma HMAC de Teams (si está configurado)
    const teamsSecret = process.env.TEAMS_WEBHOOK_SECRET;
    if (teamsSecret) {
      const authHeader = request.headers.get('Authorization');

      if (authHeader && authHeader.startsWith('HMAC ')) {
        const receivedSignature = authHeader.substring(5);
        const expectedSignature = crypto
          .createHmac('sha256', teamsSecret)
          .update(bodyText)
          .digest('base64');

        if (receivedSignature !== expectedSignature) {
          console.error('Firma HMAC inválida');
          return NextResponse.json(
            { error: 'Firma inválida' },
            { status: 401 }
          );
        }
      }
    }

    // Extraer información del mensaje de Teams
    const {
      text = '',
      from = {},
      channelData = {},
      conversation = {},
      timestamp
    } = body;

    const senderName = from.name || 'Usuario de Teams';
    const channelName = conversation.name || 'Canal de Teams';

    // Limpiar el texto (Teams incluye el @mention del bot en formato XML)
    // Ejemplo: "<at>BotName</at> mensaje real"
    const cleanText = text.replace(/<at>.*?<\/at>\s*/g, '').trim();

    if (!cleanText) {
      // Responder a Teams si no hay contenido
      return NextResponse.json({
        type: 'message',
        text: '⚠️ Por favor escribe un mensaje después de mencionar al bot.'
      });
    }

    // Obtener el secret del webhook destino
    const targetSecret = process.env.TEAMS_TARGET_WEBHOOK_SECRET;
    if (!targetSecret) {
      console.error('TEAMS_TARGET_WEBHOOK_SECRET no está configurado');
      return NextResponse.json(
        { error: 'Configuración incompleta' },
        { status: 500 }
      );
    }

    // Construir URL del webhook interno
    const baseUrl = process.env.NEXTAUTH_URL ||
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const webhookUrl = `${baseUrl}/api/webhooks/incoming/${targetSecret}`;

    // Preparar payload para webhook interno
    const payload = {
      content: `**${senderName}** escribió desde Teams:\n\n${cleanText}`,
      username: senderName,
      metadata: {
        source: 'Microsoft Teams',
        channel: channelName,
        timestamp: timestamp || new Date().toISOString(),
        teamsMessageId: body.id,
        originalText: text
      }
    };

    // Enviar a webhook interno
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error enviando a webhook interno:', response.status, errorText);
      throw new Error(`Error del webhook interno: ${response.status}`);
    }

    const result = await response.json();

    // Responder a Teams con confirmación
    return NextResponse.json({
      type: 'message',
      text: `✅ Mensaje recibido y publicado en el canal`
    });
  } catch (error: any) {
    console.error('Error en Teams bridge:', error);

    // Responder a Teams con error amigable
    return NextResponse.json({
      type: 'message',
      text: '❌ Hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
    });
  }
}

/**
 * GET /api/webhooks/teams-bridge
 * Endpoint de verificación (útil para debugging)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Teams bridge endpoint está activo',
    configured: {
      teamsSecret: !!process.env.TEAMS_WEBHOOK_SECRET,
      targetSecret: !!process.env.TEAMS_TARGET_WEBHOOK_SECRET
    }
  });
}

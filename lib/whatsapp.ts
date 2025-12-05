/**
 * WhatsApp Business API Integration
 *
 * This module provides functions to send WhatsApp messages via the Meta WhatsApp Business API.
 * Requires WHATSAPP_BUSINESS_ID, WHATSAPP_ACCESS_TOKEN, and WHATSAPP_PHONE_NUMBER_ID env vars.
 */

interface WhatsAppTextMessage {
  to: string;
  message: string;
}

interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: {
    type: 'header' | 'body' | 'button';
    parameters: {
      type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
      image?: { link: string };
      document?: { link: string; filename?: string };
      video?: { link: string };
    }[];
  }[];
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/**
 * Get WhatsApp API base URL
 */
function getApiUrl(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
}

/**
 * Format phone number for WhatsApp (E.164 format without +)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // If it starts with 52 (Mexico) and is 12 digits, it's already correct
  if (cleaned.startsWith('52') && cleaned.length === 12) {
    return cleaned;
  }

  // If it's 10 digits (Mexican format without country code), add 52
  if (cleaned.length === 10) {
    return `52${cleaned}`;
  }

  // If it starts with 1 (US) or other country codes, keep as is
  return cleaned;
}

/**
 * Send a simple text message
 */
export async function sendTextMessage(
  message: WhatsAppTextMessage
): Promise<WhatsAppResponse> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhoneNumber(message.to),
        type: 'text',
        text: {
          preview_url: true,
          body: message.message,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Error sending message',
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error sending WhatsApp message',
    };
  }
}

/**
 * Send a template message
 */
export async function sendTemplateMessage(
  message: WhatsAppTemplateMessage
): Promise<WhatsAppResponse> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  try {
    const templatePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formatPhoneNumber(message.to),
      type: 'template',
      template: {
        name: message.templateName,
        language: {
          code: message.languageCode || 'es_MX',
        },
      },
    };

    if (message.components && message.components.length > 0) {
      templatePayload.template.components = message.components;
    }

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templatePayload),
    });

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Error sending template message',
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error sending WhatsApp template',
    };
  }
}

/**
 * Send a message with media (image, document, video)
 */
export async function sendMediaMessage(
  to: string,
  mediaType: 'image' | 'document' | 'video' | 'audio',
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<WhatsAppResponse> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  try {
    const mediaPayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formatPhoneNumber(to),
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
      },
    };

    if (caption && mediaType !== 'audio') {
      mediaPayload[mediaType].caption = caption;
    }

    if (filename && mediaType === 'document') {
      mediaPayload[mediaType].filename = filename;
    }

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mediaPayload),
    });

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Error sending media message',
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error sending WhatsApp media',
    };
  }
}

/**
 * Send interactive message with buttons
 */
export async function sendInteractiveMessage(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
  header?: string,
  footer?: string
): Promise<WhatsAppResponse> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  try {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formatPhoneNumber(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: body,
        },
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20), // Max 20 chars
            },
          })),
        },
      },
    };

    if (header) {
      payload.interactive.header = {
        type: 'text',
        text: header,
      };
    }

    if (footer) {
      payload.interactive.footer = {
        text: footer,
      };
    }

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Error sending interactive message',
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error sending WhatsApp interactive',
    };
  }
}

/**
 * Batch send template messages to multiple recipients
 */
export async function sendBulkTemplateMessages(
  recipients: { phone: string; parameters?: any[] }[],
  templateName: string,
  languageCode: string = 'es_MX'
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: { phone: string; success: boolean; messageId?: string; error?: string }[];
}> {
  const results: { phone: string; success: boolean; messageId?: string; error?: string }[] = [];

  for (const recipient of recipients) {
    const components = recipient.parameters
      ? [
          {
            type: 'body' as const,
            parameters: recipient.parameters.map((p: string) => ({
              type: 'text' as const,
              text: p,
            })),
          },
        ]
      : undefined;

    const result = await sendTemplateMessage({
      to: recipient.phone,
      templateName,
      languageCode,
      components,
    });

    results.push({
      phone: recipient.phone,
      ...result,
    });

    // Rate limiting - wait 100ms between messages
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    total: recipients.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

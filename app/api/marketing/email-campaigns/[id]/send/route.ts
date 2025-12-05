import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign, { IEmailContent } from '@/models/EmailCampaign';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import Contact from '@/models/Contact';
import MarketingAudience, { ICondition, IConditionGroup } from '@/models/MarketingAudience';
import mongoose from 'mongoose';
import {
  sendBatchEmails,
  personalizeContent,
  isResendConfigured,
  BatchEmailItem,
} from '@/lib/resend';

// Helper to build MongoDB query from audience segment conditions
function buildContactQueryFromCondition(condition: ICondition): Record<string, any> {
  const { type, comparator, value } = condition;
  const query: Record<string, any> = {};

  // Map condition types to Contact model fields
  const fieldMapping: Record<string, string> = {
    location: 'address.city',
    industry: 'company',
    job_title: 'position',
    crm_client: 'type',
    crm_contact: 'type',
    email_subscriber: 'tags',
  };

  const field = fieldMapping[type] || type;

  switch (comparator) {
    case 'equals':
      query[field] = value;
      break;
    case 'not_equals':
      query[field] = { $ne: value };
      break;
    case 'contains':
      query[field] = { $regex: value, $options: 'i' };
      break;
    case 'not_contains':
      query[field] = { $not: { $regex: value, $options: 'i' } };
      break;
    case 'greater_than':
      query[field] = { $gt: value };
      break;
    case 'less_than':
      query[field] = { $lt: value };
      break;
    case 'between':
      if (typeof value === 'object' && 'min' in value && 'max' in value) {
        query[field] = { $gte: value.min, $lte: value.max };
      }
      break;
    case 'in_list':
      query[field] = { $in: Array.isArray(value) ? value : [value] };
      break;
    case 'not_in_list':
      query[field] = { $nin: Array.isArray(value) ? value : [value] };
      break;
  }

  return query;
}

function buildContactQueryFromGroup(group: IConditionGroup): Record<string, any> {
  if (group.conditions.length === 0) return {};

  const conditionQueries = group.conditions.map(buildContactQueryFromCondition);

  if (group.operator === 'AND') {
    return { $and: conditionQueries };
  } else {
    return { $or: conditionQueries };
  }
}

function buildContactQueryFromSegment(audience: any): Record<string, any> {
  if (!audience?.rules?.groups || audience.rules.groups.length === 0) {
    return {};
  }

  const groupQueries = audience.rules.groups
    .map(buildContactQueryFromGroup)
    .filter((q: Record<string, any>) => Object.keys(q).length > 0);

  if (groupQueries.length === 0) return {};

  if (audience.rules.operator === 'AND') {
    return { $and: groupQueries };
  } else {
    return { $or: groupQueries };
  }
}

// Generate HTML from email blocks
function generateHtmlFromBlocks(content: IEmailContent): string {
  // If we already have rendered HTML, use it
  if (content.html && content.html.trim().length > 0) {
    return content.html;
  }

  // Otherwise generate from blocks
  const { blocks, globalStyles } = content.json;
  const backgroundColor = globalStyles?.backgroundColor || '#f5f5f5';
  const contentWidth = globalStyles?.contentWidth || 600;
  const fontFamily = globalStyles?.fontFamily || 'Arial, sans-serif';

  let blocksHtml = '';

  for (const block of blocks || []) {
    blocksHtml += renderBlock(block);
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: ${fontFamily}; }
    img { max-width: 100%; height: auto; }
    a { color: inherit; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" width="${contentWidth}" cellspacing="0" cellpadding="0" style="max-width: ${contentWidth}px; width: 100%;">
          <tr>
            <td style="background-color: #ffffff;">
              ${blocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderBlock(block: any): string {
  const { type, content, styles } = block;
  const padding = styles?.padding || '20px';
  const backgroundColor = styles?.backgroundColor || 'transparent';

  switch (type) {
    case 'text':
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: ${padding}; background-color: ${backgroundColor};">
              ${content?.html || content || ''}
            </td>
          </tr>
        </table>`;

    case 'image':
      const imgAlign = content?.align || 'center';
      const imgWidth = content?.width || '100%';
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: ${padding}; background-color: ${backgroundColor}; text-align: ${imgAlign};">
              ${content?.link ? `<a href="${content.link}">` : ''}
              <img src="${content?.src || ''}" alt="${content?.alt || ''}" style="width: ${imgWidth}; max-width: 100%; display: inline-block;" />
              ${content?.link ? '</a>' : ''}
            </td>
          </tr>
        </table>`;

    case 'button':
      const btnBg = content?.backgroundColor || styles?.buttonColor || '#2563eb';
      const btnColor = content?.textColor || '#ffffff';
      const btnRadius = content?.borderRadius || '4px';
      const btnAlign = content?.align || 'center';
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: ${padding}; background-color: ${backgroundColor}; text-align: ${btnAlign};">
              <a href="${content?.url || '#'}" style="display: inline-block; padding: 12px 24px; background-color: ${btnBg}; color: ${btnColor}; text-decoration: none; border-radius: ${btnRadius}; font-weight: bold;">
                ${content?.text || 'Click aquí'}
              </a>
            </td>
          </tr>
        </table>`;

    case 'divider':
      const divColor = content?.color || '#e5e5e5';
      const divThickness = content?.thickness || '1px';
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: ${padding}; background-color: ${backgroundColor};">
              <hr style="border: none; border-top: ${divThickness} solid ${divColor}; margin: 0;" />
            </td>
          </tr>
        </table>`;

    case 'spacer':
      const height = content?.height || '20px';
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="height: ${height}; background-color: ${backgroundColor};">&nbsp;</td>
          </tr>
        </table>`;

    case 'social':
      const socialLinks = content?.links || [];
      const socialIcons = socialLinks.map((link: any) => {
        const iconUrl = getSocialIconUrl(link.platform);
        return `<a href="${link.url}" style="display: inline-block; margin: 0 8px;"><img src="${iconUrl}" alt="${link.platform}" width="32" height="32" /></a>`;
      }).join('');
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: ${padding}; background-color: ${backgroundColor}; text-align: center;">
              ${socialIcons}
            </td>
          </tr>
        </table>`;

    case 'html':
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: ${padding}; background-color: ${backgroundColor};">
              ${content?.code || ''}
            </td>
          </tr>
        </table>`;

    case 'columns':
      const columns = block.children || [];
      const columnWidth = Math.floor(100 / Math.max(columns.length, 1));
      const columnHtml = columns.map((col: any) => {
        const innerBlocks = (col.children || []).map(renderBlock).join('');
        return `<td style="width: ${columnWidth}%; vertical-align: top; padding: 0 10px;">${innerBlocks}</td>`;
      }).join('');
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: ${padding}; background-color: ${backgroundColor};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>${columnHtml}</tr>
              </table>
            </td>
          </tr>
        </table>`;

    default:
      return '';
  }
}

function getSocialIconUrl(platform: string): string {
  const icons: Record<string, string> = {
    facebook: 'https://cdn-icons-png.flaticon.com/32/733/733547.png',
    twitter: 'https://cdn-icons-png.flaticon.com/32/733/733579.png',
    instagram: 'https://cdn-icons-png.flaticon.com/32/2111/2111463.png',
    linkedin: 'https://cdn-icons-png.flaticon.com/32/733/733561.png',
    youtube: 'https://cdn-icons-png.flaticon.com/32/1384/1384060.png',
    tiktok: 'https://cdn-icons-png.flaticon.com/32/3046/3046121.png',
  };
  return icons[platform.toLowerCase()] || icons.facebook;
}

// POST - Send campaign immediately
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Check if Resend is configured
    if (!isResendConfigured()) {
      return NextResponse.json(
        { error: 'El servicio de email (Resend) no está configurado. Agrega RESEND_API_KEY en las variables de entorno.' },
        { status: 500 }
      );
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const campaign = await EmailCampaign.findById(params.id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      );
    }

    // Validate campaign can be sent
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Solo se pueden enviar campañas en borrador o programadas' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!campaign.subject || !campaign.fromName || !campaign.fromEmail) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: asunto, nombre de remitente o email' },
        { status: 400 }
      );
    }

    if (!campaign.content?.html && (!campaign.content?.json?.blocks || campaign.content.json.blocks.length === 0)) {
      return NextResponse.json(
        { error: 'La campaña no tiene contenido' },
        { status: 400 }
      );
    }

    // Build audience query
    let contactQuery: Record<string, any> = {
      isActive: true,
      email: { $exists: true, $ne: '' },
      unsubscribed: { $ne: true },
    };

    // Apply audience filters based on type
    if (campaign.audienceType === 'segment' && campaign.audienceId) {
      const audience = await MarketingAudience.findById(campaign.audienceId);
      if (audience) {
        const segmentQuery = buildContactQueryFromSegment(audience);
        if (Object.keys(segmentQuery).length > 0) {
          contactQuery = { ...contactQuery, ...segmentQuery };
        }
      }
    } else if (campaign.audienceType === 'list' && campaign.audienceId) {
      contactQuery.lists = campaign.audienceId;
    }
    // 'all_contacts' uses the default query

    // Apply additional audience filter if present
    if (campaign.audienceFilter && Object.keys(campaign.audienceFilter).length > 0) {
      contactQuery = { ...contactQuery, ...campaign.audienceFilter };
    }

    // Get contacts
    const contactsRaw = await Contact.find(contactQuery)
      .select('_id email firstName lastName')
      .lean();

    // Filter contacts with valid emails
    const contacts = contactsRaw.filter(
      (c): c is typeof c & { email: string } => !!c.email
    );

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No hay destinatarios para esta campaña' },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    campaign.status = 'sending';
    campaign.sentAt = new Date();
    campaign.estimatedRecipients = contacts.length;
    await campaign.save();

    // Generate HTML content
    const baseHtml = generateHtmlFromBlocks(campaign.content);

    // Prepare recipients and emails to send
    const recipients = contacts.map((contact, index) => {
      // Assign variant for A/B testing
      let variant = 'A';
      let subjectToUse = campaign.subject;
      let htmlToUse = baseHtml;
      let fromNameToUse = campaign.fromName;
      let fromEmailToUse = campaign.fromEmail;

      if (campaign.abTest?.enabled && campaign.abTest.variants.length > 0) {
        const totalPercentage = campaign.abTest.variants.reduce((sum, v) => sum + v.percentage, 0);
        let random = Math.random() * totalPercentage;
        for (const v of campaign.abTest.variants) {
          random -= v.percentage;
          if (random <= 0) {
            variant = v.id;
            // Apply variant specific values
            if (v.subject) subjectToUse = v.subject;
            if (v.content) htmlToUse = generateHtmlFromBlocks(v.content);
            if (v.fromName) fromNameToUse = v.fromName;
            if (v.fromEmail) fromEmailToUse = v.fromEmail;
            break;
          }
        }
      }

      // Personalize content
      const personalizedHtml = personalizeContent(htmlToUse, {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
      });
      const personalizedSubject = personalizeContent(subjectToUse, {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
      });

      return {
        campaignId: campaign._id,
        contactId: contact._id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        variant,
        status: 'queued' as const,
        queuedAt: new Date(),
        // For sending
        personalizedHtml,
        personalizedSubject,
        fromName: fromNameToUse,
        fromEmail: fromEmailToUse,
      };
    });

    // Create recipients in database
    await EmailCampaignRecipient.insertMany(
      recipients.map(r => ({
        campaignId: r.campaignId,
        contactId: r.contactId,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        variant: r.variant,
        status: r.status,
        queuedAt: r.queuedAt,
      }))
    );

    // Prepare batch emails for Resend
    const emailsToSend: BatchEmailItem[] = recipients.map(r => ({
      to: r.email!,
      from: `${r.fromName} <${r.fromEmail}>`,
      subject: r.personalizedSubject,
      html: r.personalizedHtml,
      replyTo: campaign.replyTo || undefined,
      tags: [
        { name: 'campaignId', value: campaign._id.toString() },
        { name: 'variant', value: r.variant },
      ],
    }));

    // Send emails via Resend
    const sendResult = await sendBatchEmails(emailsToSend);

    // Update recipient statuses based on send result
    const sentEmails = new Set(sendResult.data.map(r => r.email));
    const failedEmails = new Map(sendResult.errors.map(e => [e.email, e.error]));

    // Update successfully sent recipients
    if (sentEmails.size > 0) {
      await EmailCampaignRecipient.updateMany(
        {
          campaignId: campaign._id,
          email: { $in: Array.from(sentEmails) },
        },
        {
          status: 'sent',
          sentAt: new Date(),
        }
      );
    }

    // Update failed recipients
    for (const [email, error] of failedEmails) {
      await EmailCampaignRecipient.updateOne(
        { campaignId: campaign._id, email },
        {
          status: 'failed',
          providerResponse: error,
        }
      );
    }

    // Update message IDs for tracking
    for (const result of sendResult.data) {
      if (result.id) {
        await EmailCampaignRecipient.updateOne(
          { campaignId: campaign._id, email: result.email },
          { messageId: result.id }
        );
      }
    }

    // Update campaign metrics and status
    campaign.metrics.sent = sendResult.totalSent || 0;
    campaign.status = (sendResult.totalFailed || 0) === contacts.length ? 'paused' : 'sent';
    campaign.completedAt = new Date();
    await campaign.save();

    return NextResponse.json({
      message: (sendResult.totalFailed || 0) === 0
        ? 'Campaña enviada exitosamente'
        : `Campaña enviada con ${sendResult.totalFailed || 0} errores`,
      recipientCount: contacts.length,
      sent: sendResult.totalSent || 0,
      failed: sendResult.totalFailed || 0,
      status: campaign.status,
    });
  } catch (error: any) {
    console.error('Error sending email campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar campaña' },
      { status: 500 }
    );
  }
}

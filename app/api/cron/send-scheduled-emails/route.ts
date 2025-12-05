import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import Contact from '@/models/Contact';
import MarketingAudience, { ICondition, IConditionGroup } from '@/models/MarketingAudience';
import {
  sendBatchEmails,
  personalizeContent,
  isResendConfigured,
  BatchEmailItem,
} from '@/lib/resend';
import { prepareEmailHtml, encryptId } from '@/lib/emailUtils';

// Helper to build MongoDB query from audience segment conditions
function buildContactQueryFromCondition(condition: ICondition): Record<string, any> {
  const { type, comparator, value } = condition;
  const query: Record<string, any> = {};

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
  return group.operator === 'AND' ? { $and: conditionQueries } : { $or: conditionQueries };
}

function buildContactQueryFromSegment(audience: any): Record<string, any> {
  if (!audience?.rules?.groups || audience.rules.groups.length === 0) return {};
  const groupQueries = audience.rules.groups
    .map(buildContactQueryFromGroup)
    .filter((q: Record<string, any>) => Object.keys(q).length > 0);
  if (groupQueries.length === 0) return {};
  return audience.rules.operator === 'AND' ? { $and: groupQueries } : { $or: groupQueries };
}

// Generate HTML from email blocks
function generateHtmlFromBlocks(content: any): string {
  if (content.html && content.html.trim().length > 0) {
    return content.html;
  }

  const { blocks, globalStyles } = content.json || {};
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
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: ${fontFamily};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
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

  switch (type) {
    case 'text':
      return `<table role="presentation" width="100%"><tr><td style="padding: ${padding};">${content.html || ''}</td></tr></table>`;
    case 'image':
      const imgAlign = styles?.align || 'center';
      return `<table role="presentation" width="100%"><tr><td style="padding: ${padding}; text-align: ${imgAlign};"><img src="${content.src || ''}" alt="${content.alt || ''}" width="${content.width || 'auto'}" style="max-width: 100%; height: auto;" /></td></tr></table>`;
    case 'button':
      return `<table role="presentation" width="100%"><tr><td style="padding: ${padding}; text-align: ${styles?.align || 'center'};"><a href="${content.url || '#'}" style="display: inline-block; padding: 12px 24px; background-color: ${styles?.buttonColor || '#3B82F6'}; color: ${styles?.textColor || '#ffffff'}; text-decoration: none; border-radius: ${styles?.borderRadius || '4px'}; font-weight: bold;">${content.text || 'Click aquí'}</a></td></tr></table>`;
    case 'divider':
      return `<table role="presentation" width="100%"><tr><td style="padding: ${padding};"><hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;" /></td></tr></table>`;
    case 'spacer':
      return `<table role="presentation" width="100%"><tr><td style="height: ${styles?.height || '20px'};"></td></tr></table>`;
    default:
      return '';
  }
}

// GET - Process scheduled emails
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const cronSecret = request.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResendConfigured()) {
      return NextResponse.json(
        { error: 'Resend no está configurado', sent: 0 },
        { status: 200 }
      );
    }

    await connectDB();

    // Find campaigns scheduled for now or before
    const now = new Date();
    const campaigns = await EmailCampaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
      isActive: true,
    }).limit(5); // Process max 5 campaigns at a time

    if (campaigns.length === 0) {
      return NextResponse.json({
        message: 'No hay campañas programadas para enviar',
        processed: 0,
      });
    }

    const results = [];

    for (const campaign of campaigns) {
      try {
        // Update status to sending
        await EmailCampaign.findByIdAndUpdate(campaign._id, {
          status: 'sending',
          sentAt: now,
        });

        // Build audience query
        let contactQuery: Record<string, any> = {
          isActive: true,
          email: { $exists: true, $ne: '' },
          unsubscribed: { $ne: true },
        };

        if (campaign.audienceType === 'segment' && campaign.audienceId) {
          const audience = await MarketingAudience.findById(campaign.audienceId);
          if (audience) {
            const segmentQuery = buildContactQueryFromSegment(audience);
            if (Object.keys(segmentQuery).length > 0) {
              contactQuery = { ...contactQuery, ...segmentQuery };
            }
          }
        }

        // Get contacts
        const contacts = await Contact.find(contactQuery).lean();

        if (contacts.length === 0) {
          await EmailCampaign.findByIdAndUpdate(campaign._id, {
            status: 'sent',
            'metrics.totalSent': 0,
          });
          results.push({ campaignId: campaign._id, sent: 0, error: 'No contacts found' });
          continue;
        }

        // Generate base HTML
        const baseHtml = generateHtmlFromBlocks(campaign.content);

        // Prepare emails with tracking
        const emails: BatchEmailItem[] = [];

        for (const contact of contacts) {
          const contactData = {
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email!,
            fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          };

          // Personalize subject and HTML
          const personalizedSubject = personalizeContent(campaign.subject, contactData);
          let personalizedHtml = personalizeContent(baseHtml, contactData);

          // Add tracking
          personalizedHtml = prepareEmailHtml(
            personalizedHtml,
            contact._id.toString(),
            campaign._id.toString(),
            {
              trackOpens: true,
              trackClicks: true,
              includeUnsubscribe: true,
              companyName: campaign.fromName || 'Nuestra empresa',
            }
          );

          const fromEmail = campaign.fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@example.com';
          const fromName = campaign.fromName || 'Notificaciones';

          emails.push({
            to: contact.email!,
            from: `${fromName} <${fromEmail}>`,
            subject: personalizedSubject,
            html: personalizedHtml,
            replyTo: campaign.replyTo,
            tags: [{ name: 'campaign_id', value: campaign._id.toString() }],
          });

          // Create recipient record
          await EmailCampaignRecipient.findOneAndUpdate(
            { campaignId: campaign._id, contactId: contact._id },
            {
              email: contact.email,
              firstName: contact.firstName,
              lastName: contact.lastName,
              status: 'queued',
              queuedAt: now,
            },
            { upsert: true }
          );
        }

        // Send emails in batches
        const sendResult = await sendBatchEmails(emails);

        // Update campaign metrics
        await EmailCampaign.findByIdAndUpdate(campaign._id, {
          status: 'sent',
          'metrics.totalSent': sendResult.totalSent || 0,
          'metrics.totalFailed': sendResult.totalFailed || 0,
        });

        // Update recipient statuses
        for (const success of sendResult.data || []) {
          if (success.id) {
            await EmailCampaignRecipient.findOneAndUpdate(
              { campaignId: campaign._id, email: success.email },
              { status: 'sent', sentAt: now, messageId: success.id }
            );
          }
        }

        for (const failed of sendResult.errors || []) {
          await EmailCampaignRecipient.findOneAndUpdate(
            { campaignId: campaign._id, email: failed.email },
            { status: 'failed', providerResponse: failed.error }
          );
        }

        results.push({
          campaignId: campaign._id,
          name: campaign.name,
          sent: sendResult.totalSent || 0,
          failed: sendResult.totalFailed || 0,
        });
      } catch (error: any) {
        console.error(`Error processing campaign ${campaign._id}:`, error);
        await EmailCampaign.findByIdAndUpdate(campaign._id, {
          status: 'paused',
          lastError: error.message,
        });
        results.push({
          campaignId: campaign._id,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: 'Campañas procesadas',
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error in scheduled email cron:', error);
    return NextResponse.json(
      { error: error.message || 'Error procesando emails programados' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import Touchpoint from '@/models/Touchpoint';
import Contact from '@/models/Contact';
import crypto from 'crypto';

// Resend webhook event types
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked';

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For clicks
    click?: {
      link: string;
      timestamp: string;
      ipAddress?: string;
      userAgent?: string;
    };
    // For bounces
    bounce?: {
      type: 'hard' | 'soft';
      message: string;
    };
    // Tags we set during sending
    tags?: { name: string; value: string }[];
  };
}

// Verify Resend webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret) return true; // Skip if no secret configured

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('svix-signature') || '';

    // Verify signature if webhook secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret && !verifyWebhookSignature(payload, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: ResendWebhookPayload = JSON.parse(payload);

    await connectDB();

    const { type, data } = event;
    const emailId = data.email_id;
    const recipientEmail = data.to[0];

    // Extract campaign ID from tags
    const campaignIdTag = data.tags?.find(t => t.name === 'campaignId');
    const campaignId = campaignIdTag?.value;

    if (!campaignId) {
      // Not a campaign email, ignore
      return NextResponse.json({ received: true });
    }

    // Find recipient
    const recipient = await EmailCampaignRecipient.findOne({
      campaignId,
      email: recipientEmail,
    });

    if (!recipient) {
      return NextResponse.json({ received: true, warning: 'Recipient not found' });
    }

    const now = new Date();

    switch (type) {
      case 'email.delivered':
        await EmailCampaignRecipient.updateOne(
          { _id: recipient._id },
          {
            status: 'delivered',
            deliveredAt: now,
          }
        );
        // Update campaign metrics
        await EmailCampaign.updateOne(
          { _id: campaignId },
          { $inc: { 'metrics.delivered': 1 } }
        );
        break;

      case 'email.opened':
        // Update recipient
        await EmailCampaignRecipient.updateOne(
          { _id: recipient._id },
          {
            $set: recipient.openedAt ? {} : { openedAt: now },
            $inc: { openCount: 1 },
          }
        );
        // Update campaign metrics only for first open
        if (!recipient.openedAt) {
          await EmailCampaign.updateOne(
            { _id: campaignId },
            { $inc: { 'metrics.opened': 1 } }
          );
          // Update rates
          await updateCampaignRates(campaignId);

          // Create touchpoint for email open
          await createEmailTouchpoint({
            type: 'email_open',
            recipientEmail,
            campaignId,
            contactId: recipient.contactId,
            metadata: {
              emailId,
              subject: data.subject,
            },
          });
        }
        break;

      case 'email.clicked':
        const clickedLink = data.click?.link || '';
        // Update recipient
        const existingLinkIndex = recipient.clickedLinks.findIndex(
          (l: any) => l.url === clickedLink
        );

        if (existingLinkIndex >= 0) {
          await EmailCampaignRecipient.updateOne(
            { _id: recipient._id },
            {
              $set: recipient.clickedAt ? {} : { clickedAt: now },
              $inc: {
                clickCount: 1,
                [`clickedLinks.${existingLinkIndex}.count`]: 1,
              },
            }
          );
        } else {
          await EmailCampaignRecipient.updateOne(
            { _id: recipient._id },
            {
              $set: recipient.clickedAt ? {} : { clickedAt: now },
              $inc: { clickCount: 1 },
              $push: {
                clickedLinks: {
                  url: clickedLink,
                  clickedAt: now,
                  count: 1,
                },
              },
            }
          );
        }
        // Update campaign metrics only for first click
        if (!recipient.clickedAt) {
          await EmailCampaign.updateOne(
            { _id: campaignId },
            { $inc: { 'metrics.clicked': 1 } }
          );
          await updateCampaignRates(campaignId);

          // Create touchpoint for email click
          await createEmailTouchpoint({
            type: 'email_click',
            recipientEmail,
            campaignId,
            contactId: recipient.contactId,
            url: clickedLink,
            metadata: {
              emailId,
              subject: data.subject,
              link: clickedLink,
              ipAddress: data.click?.ipAddress,
              userAgent: data.click?.userAgent,
            },
          });
        }
        break;

      case 'email.bounced':
        const bounceType = data.bounce?.type || 'soft';
        await EmailCampaignRecipient.updateOne(
          { _id: recipient._id },
          {
            status: 'bounced',
            bouncedAt: now,
            bounceType,
            bounceReason: data.bounce?.message,
          }
        );
        await EmailCampaign.updateOne(
          { _id: campaignId },
          { $inc: { 'metrics.bounced': 1 } }
        );
        break;

      case 'email.complained':
        await EmailCampaignRecipient.updateOne(
          { _id: recipient._id },
          { complainedAt: now }
        );
        await EmailCampaign.updateOne(
          { _id: campaignId },
          { $inc: { 'metrics.complained': 1 } }
        );
        break;
    }

    return NextResponse.json({ received: true, processed: type });
  } catch (error: any) {
    console.error('Error processing Resend webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing webhook' },
      { status: 500 }
    );
  }
}

// Helper to update campaign rates
async function updateCampaignRates(campaignId: string) {
  const campaign = await EmailCampaign.findById(campaignId);
  if (!campaign || !campaign.metrics) return;

  const metrics = campaign.metrics;

  if (metrics.delivered > 0) {
    metrics.openRate = (metrics.opened / metrics.delivered) * 100;
    metrics.clickRate = (metrics.clicked / metrics.delivered) * 100;
  }

  if (metrics.opened > 0) {
    metrics.clickToOpenRate = (metrics.clicked / metrics.opened) * 100;
  }

  await campaign.save();
}

// Helper to create touchpoints for email events
interface EmailTouchpointData {
  type: 'email_open' | 'email_click';
  recipientEmail: string;
  campaignId: string;
  contactId?: any;
  url?: string;
  metadata: Record<string, any>;
}

async function createEmailTouchpoint(data: EmailTouchpointData) {
  try {
    // Get campaign details
    const campaign = await EmailCampaign.findById(data.campaignId)
      .select('name')
      .lean();

    // Try to find contact by email if not provided
    let contactId = data.contactId;
    if (!contactId) {
      const contact = await Contact.findOne({ email: data.recipientEmail })
        .select('_id')
        .lean();
      if (contact) {
        contactId = contact._id;
      }
    }

    // Create a visitorId based on email (for anonymous tracking)
    const visitorId = `email_${crypto.createHash('md5').update(data.recipientEmail).digest('hex')}`;

    const touchpoint = new Touchpoint({
      contactId,
      visitorId,
      type: data.type,
      channel: 'email',
      source: 'resend',
      medium: 'email',
      campaign: (campaign as any)?.name || data.campaignId,
      referenceType: 'emailCampaign',
      referenceId: data.campaignId,
      url: data.url,
      metadata: {
        ...data.metadata,
        recipientEmail: data.recipientEmail,
        campaignName: (campaign as any)?.name,
      },
      occurredAt: new Date(),
      isIdentified: !!contactId,
    });

    await touchpoint.save();
    console.log(`[Touchpoint] Created ${data.type} touchpoint for ${data.recipientEmail}`);
  } catch (error) {
    console.error('Error creating email touchpoint:', error);
    // Don't throw - touchpoint creation should not fail the webhook
  }
}

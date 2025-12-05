import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import EmailCampaign from '@/models/EmailCampaign';
import Touchpoint from '@/models/Touchpoint';
import { decryptId } from '@/lib/emailUtils';

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const encryptedContactId = searchParams.get('c');
    const campaignId = searchParams.get('campaign');

    // Always return the tracking pixel, even if tracking fails
    const response = new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    if (!encryptedContactId || !campaignId) {
      return response;
    }

    const contactId = decryptId(encryptedContactId);
    if (!contactId) {
      return response;
    }

    // Track the open asynchronously
    trackOpen(contactId, campaignId).catch(console.error);

    return response;
  } catch (error) {
    // Always return the pixel even on error
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store',
      },
    });
  }
}

async function trackOpen(contactId: string, campaignId: string) {
  await connectDB();

  // Update recipient record
  const recipient = await EmailCampaignRecipient.findOneAndUpdate(
    {
      campaignId,
      contactId,
      opened: { $ne: true }, // Only update if not already marked as opened
    },
    {
      $set: {
        opened: true,
        openedAt: new Date(),
      },
      $inc: { openCount: 1 },
    },
    { new: true }
  );

  // Get campaign info for touchpoint
  const campaign = await EmailCampaign.findById(campaignId).select('name').lean();

  if (recipient) {
    // Increment campaign open count
    await EmailCampaign.findByIdAndUpdate(campaignId, {
      $inc: { 'metrics.opens': 1, 'metrics.uniqueOpens': 1 },
    });

    // Create touchpoint for attribution (only on first open)
    try {
      const touchpoint = new Touchpoint({
        contactId,
        visitorId: `email-${contactId}`, // Use contactId as visitorId for email
        type: 'email_open',
        channel: 'email',
        source: 'email',
        medium: 'email',
        campaign: (campaign as any)?.name || undefined,
        referenceType: 'emailCampaign',
        referenceId: campaignId,
        metadata: {
          campaignId,
          isFirstOpen: true,
        },
        occurredAt: new Date(),
        isIdentified: true,
      });
      await touchpoint.save();
    } catch (tpError) {
      console.error('Error creating email_open touchpoint:', tpError);
    }
  } else {
    // Recipient already opened, just increment total opens
    await EmailCampaignRecipient.findOneAndUpdate(
      { campaignId, contactId },
      { $inc: { openCount: 1 } }
    );

    await EmailCampaign.findByIdAndUpdate(campaignId, {
      $inc: { 'metrics.opens': 1 },
    });
  }
}

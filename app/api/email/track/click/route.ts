import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import EmailCampaign from '@/models/EmailCampaign';
import Touchpoint from '@/models/Touchpoint';
import { decryptId } from '@/lib/emailUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const originalUrl = searchParams.get('url');
    const encryptedContactId = searchParams.get('c');
    const campaignId = searchParams.get('campaign');
    const linkId = searchParams.get('link');

    // If no URL, show error
    if (!originalUrl) {
      return new NextResponse('Missing URL', { status: 400 });
    }

    // If we have tracking info, track the click asynchronously
    if (encryptedContactId && campaignId) {
      const contactId = decryptId(encryptedContactId);
      if (contactId) {
        trackClick(contactId, campaignId, originalUrl, linkId || undefined).catch(console.error);
      }
    }

    // Redirect to the original URL
    return NextResponse.redirect(originalUrl, { status: 302 });
  } catch (error) {
    console.error('Click tracking error:', error);
    // Try to redirect anyway
    const url = new URL(request.url).searchParams.get('url');
    if (url) {
      return NextResponse.redirect(url, { status: 302 });
    }
    return new NextResponse('Error processing link', { status: 500 });
  }
}

async function trackClick(
  contactId: string,
  campaignId: string,
  url: string,
  linkId?: string
) {
  await connectDB();

  // Check if this is the first click for this recipient
  const recipient = await EmailCampaignRecipient.findOne({
    campaignId,
    contactId,
  });

  const isFirstClick = recipient && !recipient.clicked;

  // Get campaign info for touchpoint
  const campaign = await EmailCampaign.findById(campaignId).select('name').lean();

  // Update recipient record
  await EmailCampaignRecipient.findOneAndUpdate(
    { campaignId, contactId },
    {
      $set: {
        clicked: true,
        clickedAt: recipient?.clickedAt || new Date(),
      },
      $inc: { clickCount: 1 },
      $push: {
        clickedLinks: {
          url,
          linkId,
          clickedAt: new Date(),
        },
      },
    }
  );

  // Update campaign metrics
  const updateFields: Record<string, any> = {
    $inc: { 'metrics.clicks': 1 },
  };

  if (isFirstClick) {
    updateFields.$inc['metrics.uniqueClicks'] = 1;
  }

  await EmailCampaign.findByIdAndUpdate(campaignId, updateFields);

  // Create touchpoint for attribution (on every click - clicks are valuable signals)
  try {
    const touchpoint = new Touchpoint({
      contactId,
      visitorId: `email-${contactId}`, // Use contactId as visitorId for email
      type: 'email_click',
      channel: 'email',
      source: 'email',
      medium: 'email',
      campaign: (campaign as any)?.name || undefined,
      referenceType: 'emailCampaign',
      referenceId: campaignId,
      url,
      metadata: {
        campaignId,
        linkId,
        isFirstClick,
      },
      occurredAt: new Date(),
      isIdentified: true,
    });
    await touchpoint.save();
  } catch (tpError) {
    console.error('Error creating email_click touchpoint:', tpError);
  }
}

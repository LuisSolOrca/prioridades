import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import mongoose from 'mongoose';

// GET - Get detailed analytics for campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const campaignId = new mongoose.Types.ObjectId(params.id);

    const campaign = await EmailCampaign.findById(params.id).lean();
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      );
    }

    // Get overall stats
    const overallStats = await (EmailCampaignRecipient as any).getCampaignStats(campaignId);

    // Get variant stats if A/B testing
    let variantStats: any[] = [];
    if (campaign.abTest?.enabled) {
      variantStats = await (EmailCampaignRecipient as any).getVariantStats(campaignId);
    }

    // Get link stats
    const linkStats = await (EmailCampaignRecipient as any).getLinkStats(campaignId);

    // Get hourly activity (opens/clicks over time)
    const hourlyActivity = await EmailCampaignRecipient.aggregate([
      { $match: { campaignId } },
      {
        $facet: {
          opens: [
            { $match: { openedAt: { $ne: null } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d %H:00', date: '$openedAt' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          clicks: [
            { $match: { clickedAt: { $ne: null } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d %H:00', date: '$clickedAt' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    // Get device breakdown
    const deviceStats = await EmailCampaignRecipient.aggregate([
      { $match: { campaignId, openedAt: { $ne: null } } },
      {
        $group: {
          _id: '$deviceInfo.type',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get location breakdown (top 10 countries)
    const locationStats = await EmailCampaignRecipient.aggregate([
      { $match: { campaignId, 'deviceInfo.location.country': { $exists: true } } },
      {
        $group: {
          _id: '$deviceInfo.location.country',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get bounce breakdown
    const bounceStats = await EmailCampaignRecipient.aggregate([
      { $match: { campaignId, status: 'bounced' } },
      {
        $group: {
          _id: '$bounceType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate rates
    const rates = {
      openRate: overallStats.delivered > 0
        ? ((overallStats.opened / overallStats.delivered) * 100).toFixed(2)
        : '0.00',
      clickRate: overallStats.delivered > 0
        ? ((overallStats.clicked / overallStats.delivered) * 100).toFixed(2)
        : '0.00',
      clickToOpenRate: overallStats.opened > 0
        ? ((overallStats.clicked / overallStats.opened) * 100).toFixed(2)
        : '0.00',
      bounceRate: overallStats.sent > 0
        ? ((overallStats.bounced / overallStats.sent) * 100).toFixed(2)
        : '0.00',
      unsubscribeRate: overallStats.delivered > 0
        ? ((overallStats.unsubscribed / overallStats.delivered) * 100).toFixed(2)
        : '0.00',
      complaintRate: overallStats.delivered > 0
        ? ((overallStats.complained / overallStats.delivered) * 100).toFixed(2)
        : '0.00',
    };

    return NextResponse.json({
      campaign: {
        id: campaign._id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        sentAt: campaign.sentAt,
      },
      overview: {
        ...overallStats,
        ...rates,
      },
      variants: variantStats,
      links: linkStats,
      activity: hourlyActivity[0] || { opens: [], clicks: [] },
      devices: deviceStats,
      locations: locationStats,
      bounces: bounceStats,
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener analytics' },
      { status: 500 }
    );
  }
}

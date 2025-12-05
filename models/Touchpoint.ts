import mongoose, { Document, Model, Schema } from 'mongoose';

// Types of touchpoints
export type TouchpointType =
  | 'page_view'
  | 'form_submission'
  | 'email_open'
  | 'email_click'
  | 'ad_click'
  | 'ad_impression'
  | 'social_engagement'
  | 'content_download'
  | 'webinar_registration'
  | 'webinar_attendance'
  | 'meeting_booked'
  | 'chat_started'
  | 'call_completed'
  | 'landing_page_view'
  | 'landing_page_conversion';

// Marketing channels
export type MarketingChannel =
  | 'email'
  | 'paid_social'
  | 'organic_social'
  | 'paid_search'
  | 'organic_search'
  | 'direct'
  | 'referral'
  | 'affiliate'
  | 'display'
  | 'video'
  | 'other';

export interface ITouchpoint extends Document {
  contactId?: mongoose.Types.ObjectId;
  visitorId: string;
  sessionId?: string;
  type: TouchpointType;
  channel: MarketingChannel;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referenceType?: string;
  referenceId?: mongoose.Types.ObjectId;
  url?: string;
  referrer?: string;
  metadata: Record<string, any>;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  occurredAt: Date;
  isIdentified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TouchpointSchema = new Schema<ITouchpoint>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    visitorId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'page_view',
        'form_submission',
        'email_open',
        'email_click',
        'ad_click',
        'ad_impression',
        'social_engagement',
        'content_download',
        'webinar_registration',
        'webinar_attendance',
        'meeting_booked',
        'chat_started',
        'call_completed',
        'landing_page_view',
        'landing_page_conversion',
      ],
      index: true,
    },
    channel: {
      type: String,
      required: true,
      enum: [
        'email',
        'paid_social',
        'organic_social',
        'paid_search',
        'organic_search',
        'direct',
        'referral',
        'affiliate',
        'display',
        'video',
        'other',
      ],
      index: true,
    },
    source: {
      type: String,
      index: true,
    },
    medium: {
      type: String,
      index: true,
    },
    campaign: {
      type: String,
      index: true,
    },
    content: String,
    term: String,
    referenceType: {
      type: String,
      enum: ['emailCampaign', 'landingPage', 'webForm', 'ad', 'content', null],
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    url: String,
    referrer: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
    },
    browser: String,
    os: String,
    country: String,
    city: String,
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    isIdentified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
TouchpointSchema.index({ contactId: 1, occurredAt: -1 });
TouchpointSchema.index({ visitorId: 1, occurredAt: -1 });
TouchpointSchema.index({ channel: 1, occurredAt: -1 });
TouchpointSchema.index({ campaign: 1, occurredAt: -1 });
TouchpointSchema.index({ source: 1, medium: 1, occurredAt: -1 });

// Static method to identify visitor touchpoints when contact is created
TouchpointSchema.statics.identifyVisitor = async function(
  visitorId: string,
  contactId: mongoose.Types.ObjectId
) {
  return this.updateMany(
    { visitorId, contactId: null },
    { $set: { contactId, isIdentified: true } }
  );
};

// Static method to get touchpoints for a contact journey
TouchpointSchema.statics.getContactJourney = async function(
  contactId: mongoose.Types.ObjectId,
  options: { limit?: number; startDate?: Date; endDate?: Date } = {}
) {
  const { limit = 100, startDate, endDate } = options;

  const query: any = { contactId };

  if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) query.occurredAt.$gte = startDate;
    if (endDate) query.occurredAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ occurredAt: 1 })
    .limit(limit)
    .lean();
};

// Static method to detect channel from UTM params or referrer
TouchpointSchema.statics.detectChannel = function(
  utmSource?: string,
  utmMedium?: string,
  referrer?: string
): MarketingChannel {
  // Check UTM parameters first
  if (utmMedium) {
    const medium = utmMedium.toLowerCase();
    if (medium === 'email' || medium === 'e-mail') return 'email';
    if (medium === 'cpc' || medium === 'ppc' || medium === 'paid') {
      if (utmSource?.toLowerCase().includes('google')) return 'paid_search';
      if (['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'].some(s =>
        utmSource?.toLowerCase().includes(s)
      )) return 'paid_social';
      return 'display';
    }
    if (medium === 'social' || medium === 'organic_social') return 'organic_social';
    if (medium === 'affiliate') return 'affiliate';
    if (medium === 'video') return 'video';
    if (medium === 'display' || medium === 'banner') return 'display';
    if (medium === 'referral') return 'referral';
  }

  // Check source
  if (utmSource) {
    const source = utmSource.toLowerCase();
    if (source === 'google' && !utmMedium) return 'organic_search';
    if (source === 'bing' || source === 'yahoo' || source === 'duckduckgo') return 'organic_search';
    if (['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'].includes(source)) {
      return 'organic_social';
    }
  }

  // Check referrer
  if (referrer) {
    const ref = referrer.toLowerCase();
    if (ref.includes('google.com') || ref.includes('bing.com') || ref.includes('yahoo.com')) {
      return 'organic_search';
    }
    if (ref.includes('facebook.com') || ref.includes('instagram.com') ||
        ref.includes('linkedin.com') || ref.includes('twitter.com') || ref.includes('t.co')) {
      return 'organic_social';
    }
    if (referrer && !referrer.includes(process.env.NEXT_PUBLIC_APP_URL || '')) {
      return 'referral';
    }
  }

  return 'direct';
};

// Static method to get channel breakdown
TouchpointSchema.statics.getChannelBreakdown = async function(
  startDate: Date,
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        occurredAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$channel',
        count: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$visitorId' },
        uniqueContacts: { $addToSet: '$contactId' },
      },
    },
    {
      $project: {
        channel: '$_id',
        count: 1,
        uniqueVisitors: { $size: '$uniqueVisitors' },
        uniqueContacts: { $size: { $filter: { input: '$uniqueContacts', cond: { $ne: ['$$this', null] } } } },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get campaign performance
TouchpointSchema.statics.getCampaignPerformance = async function(
  startDate: Date,
  endDate: Date,
  limit: number = 20
) {
  return this.aggregate([
    {
      $match: {
        occurredAt: { $gte: startDate, $lte: endDate },
        campaign: { $ne: null, $exists: true },
      },
    },
    {
      $group: {
        _id: {
          campaign: '$campaign',
          source: '$source',
          medium: '$medium',
        },
        count: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$visitorId' },
        uniqueContacts: { $addToSet: '$contactId' },
        channels: { $addToSet: '$channel' },
      },
    },
    {
      $project: {
        campaign: '$_id.campaign',
        source: '$_id.source',
        medium: '$_id.medium',
        touchpoints: '$count',
        uniqueVisitors: { $size: '$uniqueVisitors' },
        uniqueContacts: { $size: { $filter: { input: '$uniqueContacts', cond: { $ne: ['$$this', null] } } } },
        channels: 1,
      },
    },
    { $sort: { touchpoints: -1 } },
    { $limit: limit },
  ]);
};

// Interface for static methods
interface ITouchpointModel extends Model<ITouchpoint> {
  identifyVisitor(visitorId: string, contactId: mongoose.Types.ObjectId): Promise<any>;
  getContactJourney(contactId: mongoose.Types.ObjectId, options?: { limit?: number; startDate?: Date; endDate?: Date }): Promise<ITouchpoint[]>;
  detectChannel(utmSource?: string, utmMedium?: string, referrer?: string): MarketingChannel;
  getChannelBreakdown(startDate: Date, endDate: Date): Promise<any[]>;
  getCampaignPerformance(startDate: Date, endDate: Date, limit?: number): Promise<any[]>;
}

const Touchpoint = (mongoose.models.Touchpoint as ITouchpointModel) ||
  mongoose.model<ITouchpoint, ITouchpointModel>('Touchpoint', TouchpointSchema);

export default Touchpoint;

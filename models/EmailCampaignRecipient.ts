import mongoose, { Schema, Model } from 'mongoose';

// Enums
export type RecipientStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed';
export type BounceType = 'hard' | 'soft';

export interface IEmailCampaignRecipient {
  _id: mongoose.Types.ObjectId;

  // References
  campaignId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;

  // Contact info (denormalized for performance)
  email: string;
  firstName?: string;
  lastName?: string;

  // A/B Test
  variant?: string; // A, B, C, etc.

  // Status
  status: RecipientStatus;

  // Timestamps
  queuedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date; // First open
  clickedAt?: Date; // First click
  unsubscribedAt?: Date;
  bouncedAt?: Date;
  complainedAt?: Date;

  // Engagement metrics
  opened: boolean;
  clicked: boolean;
  unsubscribed: boolean;
  openCount: number;
  clickCount: number;
  clickedLinks: {
    url: string;
    linkId?: string;
    clickedAt: Date;
    count: number;
  }[];

  // Bounce info
  bounceType?: BounceType;
  bounceReason?: string;
  bounceCode?: string;

  // Delivery info
  messageId?: string; // Provider message ID
  providerResponse?: string;

  // Device/Location info (from opens/clicks)
  deviceInfo?: {
    type?: string; // desktop, mobile, tablet
    os?: string;
    browser?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}

const ClickedLinkSchema = new Schema({
  url: { type: String, required: true },
  linkId: { type: String },
  clickedAt: { type: Date, required: true },
  count: { type: Number, default: 1 },
}, { _id: false });

const DeviceInfoSchema = new Schema({
  type: String,
  os: String,
  browser: String,
  location: {
    country: String,
    region: String,
    city: String,
  },
}, { _id: false });

const EmailCampaignRecipientSchema = new Schema<IEmailCampaignRecipient>({
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailCampaign',
    required: true,
    index: true,
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true,
  },

  // Contact info
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  firstName: String,
  lastName: String,

  // A/B Test
  variant: String,

  // Status
  status: {
    type: String,
    enum: ['pending', 'queued', 'sent', 'delivered', 'bounced', 'failed'],
    default: 'pending',
    index: true,
  },

  // Timestamps
  queuedAt: Date,
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date,
  clickedAt: Date,
  unsubscribedAt: Date,
  bouncedAt: Date,
  complainedAt: Date,

  // Engagement
  opened: { type: Boolean, default: false },
  clicked: { type: Boolean, default: false },
  unsubscribed: { type: Boolean, default: false },
  openCount: { type: Number, default: 0 },
  clickCount: { type: Number, default: 0 },
  clickedLinks: [ClickedLinkSchema],

  // Bounce
  bounceType: {
    type: String,
    enum: ['hard', 'soft'],
  },
  bounceReason: String,
  bounceCode: String,

  // Delivery
  messageId: String,
  providerResponse: String,

  // Device
  deviceInfo: DeviceInfoSchema,
}, {
  timestamps: true,
});

// Compound indexes for queries
EmailCampaignRecipientSchema.index({ campaignId: 1, status: 1 });
EmailCampaignRecipientSchema.index({ campaignId: 1, variant: 1 });
EmailCampaignRecipientSchema.index({ campaignId: 1, openedAt: 1 });
EmailCampaignRecipientSchema.index({ campaignId: 1, clickedAt: 1 });
EmailCampaignRecipientSchema.index({ email: 1, campaignId: 1 }, { unique: true });
EmailCampaignRecipientSchema.index({ messageId: 1 });

// Static methods for analytics
EmailCampaignRecipientSchema.statics.getCampaignStats = async function(campaignId: mongoose.Types.ObjectId) {
  const stats = await this.aggregate([
    { $match: { campaignId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'bounced']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $ne: ['$openedAt', null] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $ne: ['$clickedAt', null] }, 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
        unsubscribed: { $sum: { $cond: [{ $ne: ['$unsubscribedAt', null] }, 1, 0] } },
        complained: { $sum: { $cond: [{ $ne: ['$complainedAt', null] }, 1, 0] } },
        totalOpens: { $sum: '$openCount' },
        totalClicks: { $sum: '$clickCount' },
      },
    },
  ]);

  return stats[0] || {
    total: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    unsubscribed: 0,
    complained: 0,
    totalOpens: 0,
    totalClicks: 0,
  };
};

EmailCampaignRecipientSchema.statics.getVariantStats = async function(campaignId: mongoose.Types.ObjectId) {
  return this.aggregate([
    { $match: { campaignId } },
    {
      $group: {
        _id: '$variant',
        sent: { $sum: 1 },
        opened: { $sum: { $cond: [{ $ne: ['$openedAt', null] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $ne: ['$clickedAt', null] }, 1, 0] } },
      },
    },
    {
      $project: {
        variant: '$_id',
        sent: 1,
        opened: 1,
        clicked: 1,
        openRate: {
          $cond: [
            { $gt: ['$sent', 0] },
            { $multiply: [{ $divide: ['$opened', '$sent'] }, 100] },
            0,
          ],
        },
        clickRate: {
          $cond: [
            { $gt: ['$sent', 0] },
            { $multiply: [{ $divide: ['$clicked', '$sent'] }, 100] },
            0,
          ],
        },
      },
    },
  ]);
};

EmailCampaignRecipientSchema.statics.getLinkStats = async function(campaignId: mongoose.Types.ObjectId) {
  return this.aggregate([
    { $match: { campaignId } },
    { $unwind: '$clickedLinks' },
    {
      $group: {
        _id: '$clickedLinks.url',
        totalClicks: { $sum: '$clickedLinks.count' },
        uniqueClicks: { $sum: 1 },
      },
    },
    { $sort: { totalClicks: -1 } },
  ]);
};

const EmailCampaignRecipient: Model<IEmailCampaignRecipient> =
  mongoose.models.EmailCampaignRecipient ||
  mongoose.model<IEmailCampaignRecipient>('EmailCampaignRecipient', EmailCampaignRecipientSchema);

export default EmailCampaignRecipient;

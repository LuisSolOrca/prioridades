import mongoose, { Schema, Model } from 'mongoose';

export type AnalyticsSource = 'GA4' | 'CUSTOM_PIXEL';
export type EventCategory = 'PAGE_VIEW' | 'DOWNLOAD' | 'FORM_SUBMIT' | 'CLICK' | 'SCROLL' | 'VIDEO' | 'CUSTOM';

export interface IWebAnalyticsEvent {
  _id: mongoose.Types.ObjectId;

  // Source
  source: AnalyticsSource;
  ga4PropertyId?: string;

  // Session info
  sessionId?: string;
  clientId?: string;
  userId?: string;

  // Event details
  eventName: string;
  eventCategory: EventCategory;
  eventLabel?: string;
  eventValue?: number;

  // Page info
  pageUrl: string;
  pageTitle?: string;
  pagePath: string;
  hostname?: string;

  // Document download (if applicable)
  documentUrl?: string;
  documentTitle?: string;
  documentType?: string;
  documentSize?: number;

  // Form submission (if applicable)
  formId?: string;
  formName?: string;

  // UTM and attribution
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;

  // User data
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  browserVersion?: string;
  os?: string;
  screenResolution?: string;

  // Geo data
  country?: string;
  region?: string;
  city?: string;

  // Session metrics
  sessionDuration?: number;
  pageViewsInSession?: number;
  isNewUser?: boolean;
  isBounce?: boolean;

  // CRM relations
  linkedContactId?: mongoose.Types.ObjectId;
  linkedDealId?: mongoose.Types.ObjectId;
  linkedCampaignId?: mongoose.Types.ObjectId;

  // Timestamps
  eventTimestamp: Date;

  createdAt: Date;
  updatedAt: Date;
}

const WebAnalyticsEventSchema = new Schema<IWebAnalyticsEvent>({
  source: {
    type: String,
    enum: ['GA4', 'CUSTOM_PIXEL'],
    default: 'GA4',
  },
  ga4PropertyId: String,

  sessionId: String,
  clientId: String,
  userId: String,

  eventName: {
    type: String,
    required: true,
    trim: true,
  },
  eventCategory: {
    type: String,
    enum: ['PAGE_VIEW', 'DOWNLOAD', 'FORM_SUBMIT', 'CLICK', 'SCROLL', 'VIDEO', 'CUSTOM'],
    default: 'PAGE_VIEW',
  },
  eventLabel: String,
  eventValue: Number,

  pageUrl: {
    type: String,
    required: true,
  },
  pageTitle: String,
  pagePath: {
    type: String,
    required: true,
  },
  hostname: String,

  documentUrl: String,
  documentTitle: String,
  documentType: String,
  documentSize: Number,

  formId: String,
  formName: String,

  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  utmTerm: String,
  utmContent: String,
  referrer: String,

  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
  },
  browser: String,
  browserVersion: String,
  os: String,
  screenResolution: String,

  country: String,
  region: String,
  city: String,

  sessionDuration: Number,
  pageViewsInSession: Number,
  isNewUser: Boolean,
  isBounce: Boolean,

  linkedContactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
  },
  linkedDealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
  },
  linkedCampaignId: {
    type: Schema.Types.ObjectId,
    ref: 'MarketingCampaign',
  },

  eventTimestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
WebAnalyticsEventSchema.index({ eventTimestamp: -1 });
WebAnalyticsEventSchema.index({ eventCategory: 1, eventTimestamp: -1 });
WebAnalyticsEventSchema.index({ pagePath: 1, eventTimestamp: -1 });
WebAnalyticsEventSchema.index({ documentUrl: 1 }, { sparse: true });
WebAnalyticsEventSchema.index({ sessionId: 1 });
WebAnalyticsEventSchema.index({ clientId: 1 });
WebAnalyticsEventSchema.index({ utmCampaign: 1 }, { sparse: true });
WebAnalyticsEventSchema.index({ linkedContactId: 1 }, { sparse: true });
WebAnalyticsEventSchema.index({ linkedCampaignId: 1 }, { sparse: true });
WebAnalyticsEventSchema.index({ ga4PropertyId: 1, eventTimestamp: -1 });

// Static: Get top pages
WebAnalyticsEventSchema.statics.getTopPages = async function(
  startDate: Date,
  endDate: Date,
  limit: number = 10
) {
  return this.aggregate([
    {
      $match: {
        eventCategory: 'PAGE_VIEW',
        eventTimestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { pagePath: '$pagePath', pageTitle: '$pageTitle' },
        views: { $sum: 1 },
        uniqueUsers: { $addToSet: '$clientId' },
        avgDuration: { $avg: '$sessionDuration' },
      },
    },
    {
      $project: {
        pagePath: '$_id.pagePath',
        pageTitle: '$_id.pageTitle',
        views: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgDuration: 1,
      },
    },
    { $sort: { views: -1 } },
    { $limit: limit },
  ]);
};

// Static: Get top downloads
WebAnalyticsEventSchema.statics.getTopDownloads = async function(
  startDate: Date,
  endDate: Date,
  limit: number = 10
) {
  return this.aggregate([
    {
      $match: {
        eventCategory: 'DOWNLOAD',
        eventTimestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          documentUrl: '$documentUrl',
          documentTitle: '$documentTitle',
          documentType: '$documentType',
        },
        downloads: { $sum: 1 },
        uniqueUsers: { $addToSet: '$clientId' },
      },
    },
    {
      $project: {
        documentUrl: '$_id.documentUrl',
        documentTitle: '$_id.documentTitle',
        documentType: '$_id.documentType',
        downloads: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { downloads: -1 } },
    { $limit: limit },
  ]);
};

// Static: Get traffic sources
WebAnalyticsEventSchema.statics.getTrafficSources = async function(
  startDate: Date,
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        eventCategory: 'PAGE_VIEW',
        eventTimestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          source: { $ifNull: ['$utmSource', 'direct'] },
          medium: { $ifNull: ['$utmMedium', 'none'] },
        },
        sessions: { $addToSet: '$sessionId' },
        pageViews: { $sum: 1 },
      },
    },
    {
      $project: {
        source: '$_id.source',
        medium: '$_id.medium',
        sessions: { $size: '$sessions' },
        pageViews: 1,
      },
    },
    { $sort: { sessions: -1 } },
  ]);
};

const WebAnalyticsEvent: Model<IWebAnalyticsEvent> =
  mongoose.models.WebAnalyticsEvent ||
  mongoose.model<IWebAnalyticsEvent>('WebAnalyticsEvent', WebAnalyticsEventSchema);

export default WebAnalyticsEvent;

import mongoose, { Schema, Document, Model } from 'mongoose';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface ILandingPageView extends Document {
  pageId: mongoose.Types.ObjectId;
  visitorId: string;
  sessionId: string;
  variant?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  device: DeviceType;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  ip?: string;
  userAgent?: string;
  timeOnPage: number;
  scrollDepth: number;
  converted: boolean;
  submissionId?: mongoose.Types.ObjectId;
  exitUrl?: string;
  createdAt: Date;
}

const LandingPageViewSchema = new Schema<ILandingPageView>(
  {
    pageId: {
      type: Schema.Types.ObjectId,
      ref: 'LandingPage',
      required: true,
      index: true,
    },
    visitorId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    variant: {
      type: String,
    },
    referrer: {
      type: String,
    },
    utmSource: {
      type: String,
    },
    utmMedium: {
      type: String,
    },
    utmCampaign: {
      type: String,
    },
    utmTerm: {
      type: String,
    },
    utmContent: {
      type: String,
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: 'desktop',
    },
    browser: {
      type: String,
    },
    os: {
      type: String,
    },
    country: {
      type: String,
    },
    city: {
      type: String,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timeOnPage: {
      type: Number,
      default: 0,
    },
    scrollDepth: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    converted: {
      type: Boolean,
      default: false,
    },
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'WebFormSubmission',
    },
    exitUrl: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for analytics queries
LandingPageViewSchema.index({ pageId: 1, createdAt: -1 });
LandingPageViewSchema.index({ pageId: 1, visitorId: 1 });
LandingPageViewSchema.index({ pageId: 1, converted: 1 });
LandingPageViewSchema.index({ pageId: 1, device: 1 });
LandingPageViewSchema.index({ pageId: 1, utmSource: 1 });
LandingPageViewSchema.index({ createdAt: -1 });

// Static method to get page analytics
LandingPageViewSchema.statics.getPageAnalytics = async function(
  pageId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const match: any = { pageId };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }

  const [stats] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        views: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$visitorId' },
        conversions: { $sum: { $cond: ['$converted', 1, 0] } },
        totalTimeOnPage: { $sum: '$timeOnPage' },
        totalScrollDepth: { $sum: '$scrollDepth' },
        bounces: {
          $sum: { $cond: [{ $and: [{ $lt: ['$timeOnPage', 10] }, { $lt: ['$scrollDepth', 20] }] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        views: 1,
        uniqueVisitors: { $size: '$uniqueVisitors' },
        conversions: 1,
        avgTimeOnPage: {
          $cond: [{ $gt: ['$views', 0] }, { $divide: ['$totalTimeOnPage', '$views'] }, 0],
        },
        avgScrollDepth: {
          $cond: [{ $gt: ['$views', 0] }, { $divide: ['$totalScrollDepth', '$views'] }, 0],
        },
        bounceRate: {
          $cond: [{ $gt: ['$views', 0] }, { $multiply: [{ $divide: ['$bounces', '$views'] }, 100] }, 0],
        },
      },
    },
  ]);

  return stats || {
    views: 0,
    uniqueVisitors: 0,
    conversions: 0,
    avgTimeOnPage: 0,
    avgScrollDepth: 0,
    bounceRate: 0,
  };
};

// Static method to get traffic sources
LandingPageViewSchema.statics.getTrafficSources = async function(
  pageId: mongoose.Types.ObjectId,
  limit: number = 10
) {
  return this.aggregate([
    { $match: { pageId } },
    {
      $group: {
        _id: {
          source: { $ifNull: ['$utmSource', { $ifNull: ['$referrer', 'direct'] }] },
        },
        count: { $sum: 1 },
        conversions: { $sum: { $cond: ['$converted', 1, 0] } },
      },
    },
    {
      $project: {
        source: '$_id.source',
        count: 1,
        conversions: 1,
        conversionRate: {
          $cond: [{ $gt: ['$count', 0] }, { $multiply: [{ $divide: ['$conversions', '$count'] }, 100] }, 0],
        },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

// Static method to get device breakdown
LandingPageViewSchema.statics.getDeviceBreakdown = async function(pageId: mongoose.Types.ObjectId) {
  const results = await this.aggregate([
    { $match: { pageId } },
    {
      $group: {
        _id: '$device',
        count: { $sum: 1 },
        conversions: { $sum: { $cond: ['$converted', 1, 0] } },
      },
    },
  ]);

  const breakdown: Record<string, { count: number; conversions: number }> = {
    desktop: { count: 0, conversions: 0 },
    mobile: { count: 0, conversions: 0 },
    tablet: { count: 0, conversions: 0 },
  };

  results.forEach((r) => {
    if (r._id && breakdown[r._id]) {
      breakdown[r._id] = { count: r.count, conversions: r.conversions };
    }
  });

  return breakdown;
};

// Static method to get views over time
LandingPageViewSchema.statics.getViewsOverTime = async function(
  pageId: mongoose.Types.ObjectId,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        pageId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        views: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$visitorId' },
        conversions: { $sum: { $cond: ['$converted', 1, 0] } },
      },
    },
    {
      $project: {
        date: '$_id',
        views: 1,
        uniqueVisitors: { $size: '$uniqueVisitors' },
        conversions: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);
};

// Static method to get A/B test results
LandingPageViewSchema.statics.getABTestResults = async function(pageId: mongoose.Types.ObjectId) {
  return this.aggregate([
    { $match: { pageId, variant: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$variant',
        views: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$visitorId' },
        conversions: { $sum: { $cond: ['$converted', 1, 0] } },
        totalTimeOnPage: { $sum: '$timeOnPage' },
      },
    },
    {
      $project: {
        variant: '$_id',
        views: 1,
        uniqueVisitors: { $size: '$uniqueVisitors' },
        conversions: 1,
        avgTimeOnPage: {
          $cond: [{ $gt: ['$views', 0] }, { $divide: ['$totalTimeOnPage', '$views'] }, 0],
        },
        conversionRate: {
          $cond: [
            { $gt: [{ $size: '$uniqueVisitors' }, 0] },
            { $multiply: [{ $divide: ['$conversions', { $size: '$uniqueVisitors' }] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { conversionRate: -1 } },
  ]);
};

interface ILandingPageViewModel extends Model<ILandingPageView> {
  getPageAnalytics(pageId: mongoose.Types.ObjectId, startDate?: Date, endDate?: Date): Promise<any>;
  getTrafficSources(pageId: mongoose.Types.ObjectId, limit?: number): Promise<any[]>;
  getDeviceBreakdown(pageId: mongoose.Types.ObjectId): Promise<any>;
  getViewsOverTime(pageId: mongoose.Types.ObjectId, days?: number): Promise<any[]>;
  getABTestResults(pageId: mongoose.Types.ObjectId): Promise<any[]>;
}

const LandingPageView = (mongoose.models.LandingPageView as ILandingPageViewModel) ||
  mongoose.model<ILandingPageView, ILandingPageViewModel>('LandingPageView', LandingPageViewSchema);

export default LandingPageView;

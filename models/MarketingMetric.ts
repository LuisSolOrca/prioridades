import mongoose, { Schema, Model } from 'mongoose';
import { MarketingPlatform } from './MarketingPlatformConfig';

export type MetricPeriodType = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';

export interface IMarketingMetric {
  _id: mongoose.Types.ObjectId;

  // References
  campaignId?: mongoose.Types.ObjectId;
  platformConfigId: mongoose.Types.ObjectId;
  platform: MarketingPlatform;

  // Period
  date: Date;
  periodType: MetricPeriodType;

  // Universal metrics
  impressions?: number;
  reach?: number;
  clicks?: number;
  spend?: number;

  // Engagement metrics
  likes?: number;
  shares?: number;
  comments?: number;
  saves?: number;
  reactions?: number;

  // Conversion metrics
  conversions?: number;
  conversionValue?: number;
  leads?: number;
  purchases?: number;
  addToCarts?: number;

  // Calculated metrics
  ctr?: number;
  cpc?: number;
  cpm?: number;
  costPerConversion?: number;

  // Video metrics (YouTube, TikTok, Reels)
  videoViews?: number;
  videoViews25?: number;
  videoViews50?: number;
  videoViews75?: number;
  videoViews100?: number;
  watchTimeSeconds?: number;
  avgViewDuration?: number;
  completionRate?: number;

  // WhatsApp specific
  messagesDelivered?: number;
  messagesRead?: number;
  messagesReplied?: number;
  conversationsStarted?: number;

  // LinkedIn specific
  follows?: number;
  companyPageViews?: number;

  // Raw data from platform (JSON)
  rawData?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const MarketingMetricSchema = new Schema<IMarketingMetric>({
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'MarketingCampaign',
    required: false,
  },
  platformConfigId: {
    type: Schema.Types.ObjectId,
    ref: 'MarketingPlatformConfig',
    required: true,
  },
  platform: {
    type: String,
    enum: ['META', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'WHATSAPP', 'GA4', 'GOOGLE_ADS'],
    required: true,
  },

  date: {
    type: Date,
    required: true,
  },
  periodType: {
    type: String,
    enum: ['HOUR', 'DAY', 'WEEK', 'MONTH'],
    default: 'DAY',
  },

  // Universal metrics
  impressions: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },

  // Engagement
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  reactions: { type: Number, default: 0 },

  // Conversions
  conversions: { type: Number, default: 0 },
  conversionValue: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  addToCarts: { type: Number, default: 0 },

  // Calculated
  ctr: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  cpm: { type: Number, default: 0 },
  costPerConversion: { type: Number, default: 0 },

  // Video
  videoViews: { type: Number, default: 0 },
  videoViews25: { type: Number, default: 0 },
  videoViews50: { type: Number, default: 0 },
  videoViews75: { type: Number, default: 0 },
  videoViews100: { type: Number, default: 0 },
  watchTimeSeconds: { type: Number, default: 0 },
  avgViewDuration: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },

  // WhatsApp
  messagesDelivered: { type: Number, default: 0 },
  messagesRead: { type: Number, default: 0 },
  messagesReplied: { type: Number, default: 0 },
  conversationsStarted: { type: Number, default: 0 },

  // LinkedIn
  follows: { type: Number, default: 0 },
  companyPageViews: { type: Number, default: 0 },

  // Raw data
  rawData: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
MarketingMetricSchema.index({ platform: 1, date: -1 });
MarketingMetricSchema.index({ campaignId: 1, date: -1 });
MarketingMetricSchema.index({ platformConfigId: 1, date: -1 });
MarketingMetricSchema.index({ date: -1, periodType: 1 });
// Compound index for unique metrics per campaign per day
MarketingMetricSchema.index(
  { campaignId: 1, date: 1, periodType: 1 },
  { unique: true, sparse: true }
);

// Pre-save hook to calculate derived metrics
MarketingMetricSchema.pre('save', function(next) {
  // Calculate CTR
  if (this.impressions && this.impressions > 0) {
    this.ctr = ((this.clicks || 0) / this.impressions) * 100;
    this.cpm = ((this.spend || 0) / this.impressions) * 1000;
  }

  // Calculate CPC
  if (this.clicks && this.clicks > 0) {
    this.cpc = (this.spend || 0) / this.clicks;
  }

  // Calculate cost per conversion
  if (this.conversions && this.conversions > 0) {
    this.costPerConversion = (this.spend || 0) / this.conversions;
  }

  // Calculate video completion rate
  if (this.videoViews && this.videoViews > 0 && this.videoViews100) {
    this.completionRate = (this.videoViews100 / this.videoViews) * 100;
  }

  next();
});

// Static method to get metrics summary for date range
MarketingMetricSchema.statics.getSummary = async function(
  platform: MarketingPlatform | null,
  startDate: Date,
  endDate: Date
) {
  const match: any = {
    date: { $gte: startDate, $lte: endDate },
  };
  if (platform) {
    match.platform = platform;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalImpressions: { $sum: '$impressions' },
        totalReach: { $sum: '$reach' },
        totalClicks: { $sum: '$clicks' },
        totalSpend: { $sum: '$spend' },
        totalConversions: { $sum: '$conversions' },
        totalConversionValue: { $sum: '$conversionValue' },
        totalVideoViews: { $sum: '$videoViews' },
        avgCtr: { $avg: '$ctr' },
        avgCpc: { $avg: '$cpc' },
      },
    },
  ]);
};

const MarketingMetric: Model<IMarketingMetric> =
  mongoose.models.MarketingMetric ||
  mongoose.model<IMarketingMetric>('MarketingMetric', MarketingMetricSchema);

export default MarketingMetric;

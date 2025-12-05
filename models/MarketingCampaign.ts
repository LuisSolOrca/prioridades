import mongoose, { Schema, Model } from 'mongoose';
import { MarketingPlatform } from './MarketingPlatformConfig';

export type CampaignObjective = 'AWARENESS' | 'TRAFFIC' | 'ENGAGEMENT' | 'LEADS' | 'CONVERSIONS' | 'MESSAGES' | 'VIDEO_VIEWS' | 'APP_INSTALLS';
export type CampaignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' | 'REJECTED';
export type BudgetType = 'DAILY' | 'LIFETIME';
export type CreativeType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'STORY' | 'REEL' | 'TEXT';

export interface IAdCreative {
  type: CreativeType;
  url?: string;
  thumbnailUrl?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  linkUrl?: string;
}

export interface ICampaignTargeting {
  locations?: string[];
  excludedLocations?: string[];
  ageMin?: number;
  ageMax?: number;
  genders?: ('male' | 'female' | 'all')[];
  interests?: string[];
  behaviors?: string[];
  // LinkedIn specific
  industries?: string[];
  jobTitles?: string[];
  companySizes?: string[];
  skills?: string[];
  // Custom audiences
  customAudiences?: string[];
  lookalikes?: string[];
}

export interface ICampaignMetrics {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  costPerResult: number;
  costPerClick: number;
  frequency: number;
  // Video metrics
  videoViews?: number;
  videoCompletions?: number;
  // Engagement
  likes?: number;
  shares?: number;
  comments?: number;
  saves?: number;
  // WhatsApp/Messages
  messagesDelivered?: number;
  messagesRead?: number;
  replies?: number;
  lastUpdatedAt: Date;
}

export interface IMarketingCampaign {
  _id: mongoose.Types.ObjectId;

  // Identification
  name: string;
  description?: string;
  platform: Exclude<MarketingPlatform, 'GA4'>;
  externalCampaignId?: string;
  externalAdSetId?: string;
  externalAdId?: string;

  // Configuration
  objective: CampaignObjective;
  status: CampaignStatus;
  platformStatus?: string; // Status from the platform

  // Budget
  budgetType: BudgetType;
  budget: number;
  currency: string;
  spentAmount: number;

  // Schedule
  startDate?: Date;
  endDate?: Date;
  timezone?: string;

  // Targeting
  targeting?: ICampaignTargeting;

  // Creatives
  adCreatives?: IAdCreative[];

  // Aggregated metrics (updated via sync)
  metrics?: ICampaignMetrics;

  // CRM relations
  linkedDealIds?: mongoose.Types.ObjectId[];
  linkedClientIds?: mongoose.Types.ObjectId[];
  linkedContactIds?: mongoose.Types.ObjectId[];

  // Metadata
  tags?: string[];
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;

  // Platform sync
  lastSyncAt?: Date;
  syncError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AdCreativeSchema = new Schema<IAdCreative>({
  type: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'CAROUSEL', 'STORY', 'REEL', 'TEXT'],
    required: true,
  },
  url: String,
  thumbnailUrl: String,
  headline: String,
  description: String,
  callToAction: String,
  linkUrl: String,
}, { _id: false });

const CampaignTargetingSchema = new Schema<ICampaignTargeting>({
  locations: [String],
  excludedLocations: [String],
  ageMin: { type: Number, min: 13, max: 65 },
  ageMax: { type: Number, min: 13, max: 65 },
  genders: [{ type: String, enum: ['male', 'female', 'all'] }],
  interests: [String],
  behaviors: [String],
  industries: [String],
  jobTitles: [String],
  companySizes: [String],
  skills: [String],
  customAudiences: [String],
  lookalikes: [String],
}, { _id: false });

const CampaignMetricsSchema = new Schema<ICampaignMetrics>({
  impressions: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  conversionValue: { type: Number, default: 0 },
  costPerResult: { type: Number, default: 0 },
  costPerClick: { type: Number, default: 0 },
  frequency: { type: Number, default: 0 },
  videoViews: Number,
  videoCompletions: Number,
  likes: Number,
  shares: Number,
  comments: Number,
  saves: Number,
  messagesDelivered: Number,
  messagesRead: Number,
  replies: Number,
  lastUpdatedAt: { type: Date, default: Date.now },
}, { _id: false });

const MarketingCampaignSchema = new Schema<IMarketingCampaign>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  platform: {
    type: String,
    enum: ['META', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'WHATSAPP', 'GOOGLE_ADS'],
    required: true,
  },
  externalCampaignId: String,
  externalAdSetId: String,
  externalAdId: String,

  objective: {
    type: String,
    enum: ['AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEADS', 'CONVERSIONS', 'MESSAGES', 'VIDEO_VIEWS', 'APP_INSTALLS'],
    required: true,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'REJECTED'],
    default: 'DRAFT',
  },
  platformStatus: String,

  budgetType: {
    type: String,
    enum: ['DAILY', 'LIFETIME'],
    default: 'DAILY',
  },
  budget: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'MXN',
  },
  spentAmount: {
    type: Number,
    default: 0,
  },

  startDate: Date,
  endDate: Date,
  timezone: {
    type: String,
    default: 'America/Mexico_City',
  },

  targeting: CampaignTargetingSchema,
  adCreatives: [AdCreativeSchema],
  metrics: CampaignMetricsSchema,

  linkedDealIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Deal',
  }],
  linkedClientIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Client',
  }],
  linkedContactIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Contact',
  }],

  tags: [String],
  notes: String,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  lastSyncAt: Date,
  syncError: String,
}, {
  timestamps: true,
});

// Indexes
MarketingCampaignSchema.index({ platform: 1, status: 1 });
MarketingCampaignSchema.index({ ownerId: 1, status: 1 });
MarketingCampaignSchema.index({ externalCampaignId: 1 });
MarketingCampaignSchema.index({ startDate: 1, endDate: 1 });
MarketingCampaignSchema.index({ tags: 1 });
MarketingCampaignSchema.index({ linkedDealIds: 1 });
MarketingCampaignSchema.index({ linkedClientIds: 1 });
MarketingCampaignSchema.index({ createdAt: -1 });

// Virtual for budget utilization
MarketingCampaignSchema.virtual('budgetUtilization').get(function() {
  if (!this.budget || this.budget === 0) return 0;
  return (this.spentAmount / this.budget) * 100;
});

// Virtual for ROAS (Return on Ad Spend)
MarketingCampaignSchema.virtual('roas').get(function() {
  if (!this.metrics?.spend || this.metrics.spend === 0) return 0;
  return (this.metrics.conversionValue || 0) / this.metrics.spend;
});

const MarketingCampaign: Model<IMarketingCampaign> =
  mongoose.models.MarketingCampaign ||
  mongoose.model<IMarketingCampaign>('MarketingCampaign', MarketingCampaignSchema);

export default MarketingCampaign;

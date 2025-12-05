import mongoose, { Schema, Model } from 'mongoose';

export type MarketingPlatform = 'META' | 'TWITTER' | 'TIKTOK' | 'YOUTUBE' | 'LINKEDIN' | 'WHATSAPP' | 'GA4' | 'GOOGLE_ADS';

export interface IMarketingPlatformConfig {
  _id: mongoose.Types.ObjectId;
  platform: MarketingPlatform;

  // OAuth credentials
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;

  // Platform-specific IDs
  platformAccountId?: string;
  platformAccountName?: string;
  platformUserId?: string;

  // Additional platform data (JSON)
  platformData?: {
    adAccountId?: string;
    businessId?: string;
    pageId?: string;
    propertyId?: string; // GA4
    phoneNumberId?: string; // WhatsApp
    organizationId?: string; // LinkedIn
    [key: string]: any;
  };

  // Scopes otorgados
  scope: string;

  // Sync configuration
  syncEnabled: boolean;
  syncFrequency: 'HOURLY' | 'DAILY' | 'MANUAL';
  lastSyncAt?: Date;
  nextSyncAt?: Date;

  // Status
  isActive: boolean;
  configuredBy: mongoose.Types.ObjectId;

  // Rate limit tracking
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;

  // Error tracking
  lastError?: string;
  lastErrorAt?: Date;
  consecutiveErrors: number;

  createdAt: Date;
  updatedAt: Date;
}

const MarketingPlatformConfigSchema = new Schema<IMarketingPlatformConfig>({
  platform: {
    type: String,
    enum: ['META', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'WHATSAPP', 'GA4', 'GOOGLE_ADS'],
    required: true,
  },

  // OAuth credentials
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: false,
  },
  tokenExpiresAt: {
    type: Date,
    required: false,
  },

  // Platform-specific IDs
  platformAccountId: {
    type: String,
    required: false,
  },
  platformAccountName: {
    type: String,
    required: false,
  },
  platformUserId: {
    type: String,
    required: false,
  },

  // Additional platform data
  platformData: {
    type: Schema.Types.Mixed,
    default: {},
  },

  // Scopes
  scope: {
    type: String,
    required: true,
  },

  // Sync configuration
  syncEnabled: {
    type: Boolean,
    default: true,
  },
  syncFrequency: {
    type: String,
    enum: ['HOURLY', 'DAILY', 'MANUAL'],
    default: 'DAILY',
  },
  lastSyncAt: {
    type: Date,
    required: false,
  },
  nextSyncAt: {
    type: Date,
    required: false,
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  configuredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Rate limit tracking
  rateLimitRemaining: {
    type: Number,
    required: false,
  },
  rateLimitResetAt: {
    type: Date,
    required: false,
  },

  // Error tracking
  lastError: {
    type: String,
    required: false,
  },
  lastErrorAt: {
    type: Date,
    required: false,
  },
  consecutiveErrors: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
MarketingPlatformConfigSchema.index({ platform: 1, isActive: 1 });
MarketingPlatformConfigSchema.index({ platform: 1 }, { unique: true }); // Solo una config por plataforma
MarketingPlatformConfigSchema.index({ syncEnabled: 1, nextSyncAt: 1 });
MarketingPlatformConfigSchema.index({ configuredBy: 1 });

// Auto-disable after too many errors
MarketingPlatformConfigSchema.pre('save', function(next) {
  if (this.consecutiveErrors >= 5 && this.isActive) {
    this.isActive = false;
  }
  next();
});

// Static method to get active config for platform
MarketingPlatformConfigSchema.statics.getActivePlatform = async function(platform: MarketingPlatform) {
  return this.findOne({ platform, isActive: true });
};

// Static method to get all active platforms
MarketingPlatformConfigSchema.statics.getActivePlatforms = async function() {
  return this.find({ isActive: true }).sort({ platform: 1 });
};

const MarketingPlatformConfig: Model<IMarketingPlatformConfig> =
  mongoose.models.MarketingPlatformConfig ||
  mongoose.model<IMarketingPlatformConfig>('MarketingPlatformConfig', MarketingPlatformConfigSchema);

export default MarketingPlatformConfig;

import mongoose, { Schema, Model } from 'mongoose';
import { MarketingPlatform } from './MarketingPlatformConfig';

export type SyncType = 'CAMPAIGNS' | 'METRICS' | 'TEMPLATES' | 'ANALYTICS' | 'FULL';
export type SyncStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface ISyncError {
  entityId?: string;
  entityType?: string;
  error: string;
  code?: string;
  timestamp: Date;
}

export interface IMarketingSyncLog {
  _id: mongoose.Types.ObjectId;

  platform: MarketingPlatform;
  platformConfigId: mongoose.Types.ObjectId;

  syncType: SyncType;
  status: SyncStatus;

  // Results
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;

  // Errors
  errors?: ISyncError[];

  // API usage
  apiCallsMade: number;
  rateLimitHit: boolean;
  rateLimitResetAt?: Date;

  // Trigger info
  triggerType: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK';
  triggeredBy?: mongoose.Types.ObjectId;

  // Sync range (for metrics)
  syncStartDate?: Date;
  syncEndDate?: Date;

  // Notes
  notes?: string;

  createdAt: Date;
}

const SyncErrorSchema = new Schema<ISyncError>({
  entityId: String,
  entityType: String,
  error: {
    type: String,
    required: true,
  },
  code: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const MarketingSyncLogSchema = new Schema<IMarketingSyncLog>({
  platform: {
    type: String,
    enum: ['META', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'WHATSAPP', 'GA4', 'GOOGLE_ADS'],
    required: true,
  },
  platformConfigId: {
    type: Schema.Types.ObjectId,
    ref: 'MarketingPlatformConfig',
    required: true,
  },

  syncType: {
    type: String,
    enum: ['CAMPAIGNS', 'METRICS', 'TEMPLATES', 'ANALYTICS', 'FULL'],
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'SUCCESS', 'PARTIAL', 'FAILED'],
    default: 'PENDING',
  },

  recordsProcessed: {
    type: Number,
    default: 0,
  },
  recordsCreated: {
    type: Number,
    default: 0,
  },
  recordsUpdated: {
    type: Number,
    default: 0,
  },
  recordsSkipped: {
    type: Number,
    default: 0,
  },
  recordsFailed: {
    type: Number,
    default: 0,
  },

  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  completedAt: Date,
  durationMs: Number,

  errors: [SyncErrorSchema],

  apiCallsMade: {
    type: Number,
    default: 0,
  },
  rateLimitHit: {
    type: Boolean,
    default: false,
  },
  rateLimitResetAt: Date,

  triggerType: {
    type: String,
    enum: ['MANUAL', 'SCHEDULED', 'WEBHOOK'],
    default: 'MANUAL',
  },
  triggeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  syncStartDate: Date,
  syncEndDate: Date,

  notes: String,
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

// Indexes
MarketingSyncLogSchema.index({ platform: 1, createdAt: -1 });
MarketingSyncLogSchema.index({ platformConfigId: 1, createdAt: -1 });
MarketingSyncLogSchema.index({ status: 1, createdAt: -1 });
MarketingSyncLogSchema.index({ syncType: 1, createdAt: -1 });
MarketingSyncLogSchema.index({ createdAt: -1 });
// TTL index to auto-delete old logs after 90 days
MarketingSyncLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Pre-save hook to calculate duration
MarketingSyncLogSchema.pre('save', function(next) {
  if (this.completedAt && this.startedAt) {
    this.durationMs = this.completedAt.getTime() - this.startedAt.getTime();
  }
  next();
});

// Static: Get recent logs for platform
MarketingSyncLogSchema.statics.getRecentLogs = async function(
  platform: MarketingPlatform,
  limit: number = 10
) {
  return this.find({ platform })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('triggeredBy', 'name email');
};

// Static: Get failed syncs in last 24 hours
MarketingSyncLogSchema.statics.getRecentFailures = async function() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return this.find({
    status: 'FAILED',
    createdAt: { $gte: yesterday },
  })
    .sort({ createdAt: -1 })
    .populate('platformConfigId', 'platform platformAccountName');
};

// Static: Get sync statistics
MarketingSyncLogSchema.statics.getSyncStats = async function(
  startDate: Date,
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { platform: '$platform', status: '$status' },
        count: { $sum: 1 },
        totalRecords: { $sum: '$recordsProcessed' },
        totalDuration: { $sum: '$durationMs' },
        avgDuration: { $avg: '$durationMs' },
      },
    },
    {
      $group: {
        _id: '$_id.platform',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalRecords: '$totalRecords',
            avgDuration: '$avgDuration',
          },
        },
        totalSyncs: { $sum: '$count' },
      },
    },
  ]);
};

// Instance method to mark as completed
MarketingSyncLogSchema.methods.complete = async function(
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED',
  stats?: {
    recordsCreated?: number;
    recordsUpdated?: number;
    recordsSkipped?: number;
    recordsFailed?: number;
    errors?: ISyncError[];
  }
) {
  this.status = status;
  this.completedAt = new Date();

  if (stats) {
    if (stats.recordsCreated !== undefined) this.recordsCreated = stats.recordsCreated;
    if (stats.recordsUpdated !== undefined) this.recordsUpdated = stats.recordsUpdated;
    if (stats.recordsSkipped !== undefined) this.recordsSkipped = stats.recordsSkipped;
    if (stats.recordsFailed !== undefined) this.recordsFailed = stats.recordsFailed;
    if (stats.errors) this.errors = stats.errors;

    this.recordsProcessed =
      (this.recordsCreated || 0) +
      (this.recordsUpdated || 0) +
      (this.recordsSkipped || 0) +
      (this.recordsFailed || 0);
  }

  await this.save();
  return this;
};

const MarketingSyncLog: Model<IMarketingSyncLog> =
  mongoose.models.MarketingSyncLog ||
  mongoose.model<IMarketingSyncLog>('MarketingSyncLog', MarketingSyncLogSchema);

export default MarketingSyncLog;

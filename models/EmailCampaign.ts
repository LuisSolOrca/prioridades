import mongoose, { Schema, Model } from 'mongoose';

// Enums
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
export type AudienceType = 'segment' | 'list' | 'all_contacts';
export type ABTestType = 'subject' | 'content' | 'sender' | 'send_time';
export type WinnerCriteria = 'open_rate' | 'click_rate' | 'conversions';

// Block types for the email editor
export type EmailBlockType =
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'html'
  | 'social'
  | 'video'
  | 'product'
  | 'menu';

// Interfaces
export interface IEmailBlock {
  id: string;
  type: EmailBlockType;
  content: any; // Varies by block type
  styles?: Record<string, any>;
  children?: IEmailBlock[]; // For columns
}

export interface IEmailContent {
  html: string;
  json: {
    blocks: IEmailBlock[];
    globalStyles: {
      backgroundColor: string;
      contentWidth: number;
      fontFamily: string;
      [key: string]: any;
    };
  };
}

export interface IABVariant {
  id: string; // A, B, C, etc.
  subject?: string;
  content?: IEmailContent;
  fromName?: string;
  fromEmail?: string;
  percentage: number;
  metrics?: {
    sent: number;
    opened: number;
    clicked: number;
  };
}

export interface IABTest {
  enabled: boolean;
  testType: ABTestType;
  variants: IABVariant[];
  testSize: number; // Percentage of audience for test (10-50%)
  winnerCriteria: WinnerCriteria;
  testDuration: number; // Hours before selecting winner
  winnerVariant?: string; // Selected after test completes
  testCompletedAt?: Date;
}

export interface ICampaignMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
}

export interface IEmailCampaign {
  _id: mongoose.Types.ObjectId;

  // Basic info
  name: string;
  subject: string;
  preheader?: string;

  // Sender info
  fromName: string;
  fromEmail: string;
  replyTo?: string;

  // Content
  content: IEmailContent;

  // Audience
  audienceType: AudienceType;
  audienceId?: mongoose.Types.ObjectId; // Ref to MarketingAudience or Contact list
  audienceFilter?: Record<string, any>; // Additional filters
  excludeAudienceIds?: mongoose.Types.ObjectId[];
  estimatedRecipients?: number;

  // Status & scheduling
  status: CampaignStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  completedAt?: Date;

  // A/B Testing
  abTest?: IABTest;

  // Metrics
  metrics: ICampaignMetrics;

  // Organization
  tags?: string[];
  category?: string;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  lastEditedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// Sub-schemas
const EmailBlockSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'image', 'button', 'divider', 'spacer', 'columns', 'html', 'social', 'video', 'product', 'menu'],
    required: true,
  },
  content: Schema.Types.Mixed,
  styles: Schema.Types.Mixed,
  children: [{ type: Schema.Types.Mixed }],
}, { _id: false });

const EmailContentSchema = new Schema({
  html: { type: String, default: '' },
  json: {
    blocks: [EmailBlockSchema],
    globalStyles: {
      backgroundColor: { type: String, default: '#f5f5f5' },
      contentWidth: { type: Number, default: 600 },
      fontFamily: { type: String, default: 'Arial, sans-serif' },
    },
  },
}, { _id: false });

const ABVariantSchema = new Schema({
  id: { type: String, required: true },
  subject: String,
  content: EmailContentSchema,
  fromName: String,
  fromEmail: String,
  percentage: { type: Number, required: true },
  metrics: {
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
  },
}, { _id: false });

const ABTestSchema = new Schema({
  enabled: { type: Boolean, default: false },
  testType: {
    type: String,
    enum: ['subject', 'content', 'sender', 'send_time'],
  },
  variants: [ABVariantSchema],
  testSize: { type: Number, min: 10, max: 50, default: 20 },
  winnerCriteria: {
    type: String,
    enum: ['open_rate', 'click_rate', 'conversions'],
    default: 'open_rate',
  },
  testDuration: { type: Number, default: 4 }, // Hours
  winnerVariant: String,
  testCompletedAt: Date,
}, { _id: false });

const CampaignMetricsSchema = new Schema({
  sent: { type: Number, default: 0 },
  delivered: { type: Number, default: 0 },
  opened: { type: Number, default: 0 },
  clicked: { type: Number, default: 0 },
  replied: { type: Number, default: 0 },
  bounced: { type: Number, default: 0 },
  unsubscribed: { type: Number, default: 0 },
  complained: { type: Number, default: 0 },
  openRate: { type: Number, default: 0 },
  clickRate: { type: Number, default: 0 },
  clickToOpenRate: { type: Number, default: 0 },
}, { _id: false });

// Main Schema
const EmailCampaignSchema = new Schema<IEmailCampaign>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  preheader: {
    type: String,
    trim: true,
    maxlength: 150,
  },

  // Sender
  fromName: {
    type: String,
    required: true,
    trim: true,
  },
  fromEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  replyTo: {
    type: String,
    trim: true,
    lowercase: true,
  },

  // Content
  content: {
    type: EmailContentSchema,
    default: () => ({
      html: '',
      json: {
        blocks: [],
        globalStyles: {
          backgroundColor: '#f5f5f5',
          contentWidth: 600,
          fontFamily: 'Arial, sans-serif',
        },
      },
    }),
  },

  // Audience
  audienceType: {
    type: String,
    enum: ['segment', 'list', 'all_contacts'],
    default: 'segment',
  },
  audienceId: {
    type: Schema.Types.ObjectId,
    ref: 'MarketingAudience',
  },
  audienceFilter: Schema.Types.Mixed,
  excludeAudienceIds: [{
    type: Schema.Types.ObjectId,
    ref: 'MarketingAudience',
  }],
  estimatedRecipients: Number,

  // Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'],
    default: 'draft',
  },
  scheduledAt: Date,
  sentAt: Date,
  completedAt: Date,

  // A/B Test
  abTest: ABTestSchema,

  // Metrics
  metrics: {
    type: CampaignMetricsSchema,
    default: () => ({
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      bounced: 0,
      unsubscribed: 0,
      complained: 0,
      openRate: 0,
      clickRate: 0,
      clickToOpenRate: 0,
    }),
  },

  // Organization
  tags: [String],
  category: {
    type: String,
    enum: ['newsletter', 'promotion', 'announcement', 'event', 'reengagement', 'other'],
  },

  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastEditedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
EmailCampaignSchema.index({ status: 1, scheduledAt: 1 });
EmailCampaignSchema.index({ createdBy: 1 });
EmailCampaignSchema.index({ tags: 1 });
EmailCampaignSchema.index({ category: 1 });
EmailCampaignSchema.index({ name: 'text', subject: 'text' });

// Virtual for calculating metrics
EmailCampaignSchema.methods.calculateRates = function() {
  if (this.metrics.delivered > 0) {
    this.metrics.openRate = (this.metrics.opened / this.metrics.delivered) * 100;
    this.metrics.clickRate = (this.metrics.clicked / this.metrics.delivered) * 100;
  }
  if (this.metrics.opened > 0) {
    this.metrics.clickToOpenRate = (this.metrics.clicked / this.metrics.opened) * 100;
  }
};

const EmailCampaign: Model<IEmailCampaign> =
  mongoose.models.EmailCampaign ||
  mongoose.model<IEmailCampaign>('EmailCampaign', EmailCampaignSchema);

export default EmailCampaign;

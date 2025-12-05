import mongoose, { Schema, Model } from 'mongoose';

export type EmailTemplateCategory =
  | 'welcome'
  | 'newsletter'
  | 'promotional'
  | 'announcement'
  | 'event'
  | 'follow_up'
  | 'transactional'
  | 'seasonal'
  | 'other';

export interface IEmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'columns' | 'divider' | 'spacer' | 'social' | 'video' | 'html' | 'menu' | 'product';
  content: Record<string, any>;
  styles?: Record<string, any>;
}

export interface IEmailCampaignTemplate {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category: EmailTemplateCategory;
  thumbnail?: string;

  // Email content
  subject: string;
  preheader?: string;
  blocks: IEmailBlock[];
  globalStyles: {
    backgroundColor: string;
    contentWidth: number;
    fontFamily: string;
    textColor: string;
    linkColor: string;
  };

  // Template metadata
  industry?: string;
  tags: string[];
  isPublic: boolean; // Available to all users
  isPremium: boolean; // Premium templates

  // Stats
  usageCount: number;
  rating: number;
  ratingCount: number;

  // Metadata
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const EMAIL_TEMPLATE_CATEGORIES: Record<EmailTemplateCategory, { label: string; icon: string }> = {
  welcome: { label: 'Bienvenida', icon: 'hand-wave' },
  newsletter: { label: 'Newsletter', icon: 'newspaper' },
  promotional: { label: 'Promocional', icon: 'tag' },
  announcement: { label: 'Anuncio', icon: 'megaphone' },
  event: { label: 'Evento', icon: 'calendar' },
  follow_up: { label: 'Seguimiento', icon: 'reply' },
  transactional: { label: 'Transaccional', icon: 'receipt' },
  seasonal: { label: 'Temporada', icon: 'snowflake' },
  other: { label: 'Otro', icon: 'file' },
};

const EmailBlockSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'image', 'button', 'columns', 'divider', 'spacer', 'social', 'video', 'html', 'menu', 'product'],
    required: true,
  },
  content: { type: Schema.Types.Mixed, default: {} },
  styles: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const EmailCampaignTemplateSchema = new Schema<IEmailCampaignTemplate>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: ['welcome', 'newsletter', 'promotional', 'announcement', 'event', 'follow_up', 'transactional', 'seasonal', 'other'],
    default: 'other',
  },
  thumbnail: String,

  subject: {
    type: String,
    required: true,
  },
  preheader: String,
  blocks: [EmailBlockSchema],
  globalStyles: {
    backgroundColor: { type: String, default: '#f5f5f5' },
    contentWidth: { type: Number, default: 600 },
    fontFamily: { type: String, default: 'Arial, sans-serif' },
    textColor: { type: String, default: '#333333' },
    linkColor: { type: String, default: '#0066cc' },
  },

  industry: String,
  tags: [String],
  isPublic: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },

  usageCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
EmailCampaignTemplateSchema.index({ category: 1, isActive: 1 });
EmailCampaignTemplateSchema.index({ isPublic: 1, isActive: 1 });
EmailCampaignTemplateSchema.index({ tags: 1 });
EmailCampaignTemplateSchema.index({ usageCount: -1 });
EmailCampaignTemplateSchema.index({ createdBy: 1 });

const EmailCampaignTemplate: Model<IEmailCampaignTemplate> =
  mongoose.models.EmailCampaignTemplate ||
  mongoose.model<IEmailCampaignTemplate>('EmailCampaignTemplate', EmailCampaignTemplateSchema);

export default EmailCampaignTemplate;

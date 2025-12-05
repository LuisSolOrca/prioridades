import mongoose, { Schema, Document, Model } from 'mongoose';
import { ILandingSection, ILandingGlobalStyles } from './LandingPage';

export type LandingTemplateCategory =
  | 'lead_generation'
  | 'product_launch'
  | 'webinar_event'
  | 'saas_software'
  | 'ecommerce_promo'
  | 'coming_soon'
  | 'thank_you'
  | 'app_download'
  | 'service_business'
  | 'portfolio'
  | 'other';

export interface ILandingPageTemplate extends Document {
  name: string;
  slug: string;
  description: string;
  category: LandingTemplateCategory;
  thumbnail?: string;
  previewUrl?: string;
  content: {
    sections: ILandingSection[];
    globalStyles: ILandingGlobalStyles;
  };
  tags: string[];
  isSystem: boolean;
  isActive: boolean;
  usageCount: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LandingSectionSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  content: { type: Schema.Types.Mixed, default: {} },
  styles: { type: Schema.Types.Mixed, default: {} },
  visibility: {
    desktop: { type: Boolean, default: true },
    mobile: { type: Boolean, default: true },
  },
}, { _id: false });

const LandingGlobalStylesSchema = new Schema({
  primaryColor: { type: String, default: '#3B82F6' },
  secondaryColor: { type: String, default: '#10B981' },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#1F2937' },
  fontFamily: { type: String, default: 'Inter, system-ui, sans-serif' },
  headingFontFamily: { type: String },
  containerWidth: { type: Number, default: 1200 },
  borderRadius: { type: Number, default: 8 },
}, { _id: false });

const LandingPageTemplateSchema = new Schema<ILandingPageTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'lead_generation',
        'product_launch',
        'webinar_event',
        'saas_software',
        'ecommerce_promo',
        'coming_soon',
        'thank_you',
        'app_download',
        'service_business',
        'portfolio',
        'other',
      ],
    },
    thumbnail: { type: String },
    previewUrl: { type: String },
    content: {
      sections: { type: [LandingSectionSchema], default: [] },
      globalStyles: { type: LandingGlobalStylesSchema, default: () => ({}) },
    },
    tags: [{ type: String, trim: true }],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

LandingPageTemplateSchema.index({ category: 1 });
LandingPageTemplateSchema.index({ isActive: 1 });
LandingPageTemplateSchema.index({ isSystem: 1 });
LandingPageTemplateSchema.index({ tags: 1 });

const LandingPageTemplate: Model<ILandingPageTemplate> =
  mongoose.models.LandingPageTemplate ||
  mongoose.model<ILandingPageTemplate>('LandingPageTemplate', LandingPageTemplateSchema);

export default LandingPageTemplate;

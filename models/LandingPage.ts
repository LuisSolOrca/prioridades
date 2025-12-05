import mongoose, { Schema, Document, Model } from 'mongoose';

// Section Types
export type LandingSectionType =
  | 'hero'
  | 'features'
  | 'benefits'
  | 'testimonials'
  | 'pricing'
  | 'faq'
  | 'cta'
  | 'form'
  | 'video'
  | 'gallery'
  | 'logos'
  | 'stats'
  | 'team'
  | 'countdown'
  | 'comparison'
  | 'text'
  | 'columns'
  | 'divider'
  | 'spacer'
  | 'html'
  | 'header'
  | 'footer';

export type LandingPageStatus = 'draft' | 'published' | 'archived';

// Section Interface
export interface ILandingSection {
  id: string;
  type: LandingSectionType;
  content: any;
  styles?: Record<string, any>;
  visibility?: {
    desktop: boolean;
    mobile: boolean;
  };
  animation?: {
    type: string;
    delay?: number;
    duration?: number;
  };
}

// Global Styles Interface
export interface ILandingGlobalStyles {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  headingFontFamily?: string;
  containerWidth: number;
  borderRadius: number;
}

// A/B Test Variant
export interface ILandingVariant {
  id: string;
  name: string;
  sections?: ILandingSection[];
  weight: number;
  views: number;
  conversions: number;
}

// A/B Test Config
export interface ILandingABTest {
  enabled: boolean;
  variants: ILandingVariant[];
  winnerCriteria: 'conversion_rate' | 'time_on_page' | 'manual';
  testDuration?: number;
  startedAt?: Date;
  endedAt?: Date;
  winnerVariant?: string;
}

// Analytics Interface
export interface ILandingAnalytics {
  views: number;
  uniqueVisitors: number;
  formSubmissions: number;
  conversionRate: number;
  avgTimeOnPage: number;
  bounceRate: number;
  topSources: Array<{
    source: string;
    count: number;
  }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

// Scripts Interface
export interface ILandingScripts {
  headScripts?: string;
  bodyStartScripts?: string;
  bodyEndScripts?: string;
}

// Main Document Interface
export interface ILandingPage extends Document {
  name: string;
  slug: string;
  title: string;
  description: string;
  keywords?: string[];
  content: {
    sections: ILandingSection[];
    globalStyles: ILandingGlobalStyles;
  };
  formId?: mongoose.Types.ObjectId;
  status: LandingPageStatus;
  publishedAt?: Date;
  customDomain?: string;
  favicon?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  scripts?: ILandingScripts;
  abTest?: ILandingABTest;
  analytics: ILandingAnalytics;
  campaignId?: mongoose.Types.ObjectId;
  templateId?: string;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const LandingSectionSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      'hero', 'features', 'benefits', 'testimonials', 'pricing', 'faq',
      'cta', 'form', 'video', 'gallery', 'logos', 'stats', 'team',
      'countdown', 'comparison', 'text', 'columns', 'divider', 'spacer',
      'html', 'header', 'footer'
    ],
  },
  content: { type: Schema.Types.Mixed, default: {} },
  styles: { type: Schema.Types.Mixed, default: {} },
  visibility: {
    desktop: { type: Boolean, default: true },
    mobile: { type: Boolean, default: true },
  },
  animation: {
    type: { type: String },
    delay: { type: Number },
    duration: { type: Number },
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

const LandingVariantSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  sections: [LandingSectionSchema],
  weight: { type: Number, default: 50 },
  views: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
}, { _id: false });

const LandingABTestSchema = new Schema({
  enabled: { type: Boolean, default: false },
  variants: [LandingVariantSchema],
  winnerCriteria: {
    type: String,
    enum: ['conversion_rate', 'time_on_page', 'manual'],
    default: 'conversion_rate',
  },
  testDuration: { type: Number },
  startedAt: { type: Date },
  endedAt: { type: Date },
  winnerVariant: { type: String },
}, { _id: false });

const LandingAnalyticsSchema = new Schema({
  views: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  formSubmissions: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  avgTimeOnPage: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 },
  topSources: [{
    source: { type: String },
    count: { type: Number },
  }],
  deviceBreakdown: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 },
  },
}, { _id: false });

const LandingScriptsSchema = new Schema({
  headScripts: { type: String },
  bodyStartScripts: { type: String },
  bodyEndScripts: { type: String },
}, { _id: false });

const LandingPageSchema = new Schema<ILandingPage>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'El slug es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'El slug solo puede contener letras minusculas, numeros y guiones'],
    },
    title: {
      type: String,
      required: [true, 'El titulo es requerido'],
      trim: true,
      maxlength: [70, 'El titulo no puede exceder 70 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [160, 'La descripcion no puede exceder 160 caracteres'],
    },
    keywords: [{ type: String, trim: true }],
    content: {
      sections: { type: [LandingSectionSchema], default: [] },
      globalStyles: { type: LandingGlobalStylesSchema, default: () => ({}) },
    },
    formId: {
      type: Schema.Types.ObjectId,
      ref: 'WebForm',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    publishedAt: { type: Date },
    customDomain: { type: String, trim: true },
    favicon: { type: String },
    ogImage: { type: String },
    ogTitle: { type: String, maxlength: 60 },
    ogDescription: { type: String, maxlength: 200 },
    scripts: { type: LandingScriptsSchema },
    abTest: { type: LandingABTestSchema },
    analytics: { type: LandingAnalyticsSchema, default: () => ({}) },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'MarketingCampaign',
    },
    templateId: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
LandingPageSchema.index({ slug: 1 }, { unique: true });
LandingPageSchema.index({ status: 1 });
LandingPageSchema.index({ createdBy: 1 });
LandingPageSchema.index({ campaignId: 1 });
LandingPageSchema.index({ createdAt: -1 });

// Pre-save hook to generate slug if not provided
LandingPageSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Static method to get public page data
LandingPageSchema.statics.getPublicPage = async function(slug: string) {
  const page = await this.findOne({
    slug,
    status: 'published',
    isActive: true,
  }).populate('formId').lean();

  return page;
};

// Static method to increment view count
LandingPageSchema.statics.incrementViews = async function(pageId: mongoose.Types.ObjectId, isUnique: boolean) {
  const update: any = {
    $inc: { 'analytics.views': 1 },
  };

  if (isUnique) {
    update.$inc['analytics.uniqueVisitors'] = 1;
  }

  await this.findByIdAndUpdate(pageId, update);
};

// Static method to increment conversions
LandingPageSchema.statics.incrementConversions = async function(pageId: mongoose.Types.ObjectId) {
  const page = await this.findByIdAndUpdate(
    pageId,
    { $inc: { 'analytics.formSubmissions': 1 } },
    { new: true }
  );

  if (page && page.analytics.uniqueVisitors > 0) {
    page.analytics.conversionRate =
      (page.analytics.formSubmissions / page.analytics.uniqueVisitors) * 100;
    await page.save();
  }
};

// Interface for static methods
interface ILandingPageModel extends Model<ILandingPage> {
  getPublicPage(slug: string): Promise<ILandingPage | null>;
  incrementViews(pageId: mongoose.Types.ObjectId, isUnique: boolean): Promise<void>;
  incrementConversions(pageId: mongoose.Types.ObjectId): Promise<void>;
}

const LandingPage = (mongoose.models.LandingPage as ILandingPageModel) ||
  mongoose.model<ILandingPage, ILandingPageModel>('LandingPage', LandingPageSchema);

export default LandingPage;

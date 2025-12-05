import mongoose, { Schema, Model } from 'mongoose';

export type CreativeType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'STORY' | 'REEL' | 'TEXT';
export type CreativeStatus = 'DRAFT' | 'READY' | 'IN_USE' | 'ARCHIVED';
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1';

export interface ICreativeAsset {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number; // For videos, in seconds
  fileSize?: number;
  mimeType?: string;
  r2Key?: string; // R2 storage key
}

export interface ITextOverlay {
  id: string;
  text: string;
  position: { x: number; y: number };
  style: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    backgroundColor?: string;
    textAlign: 'left' | 'center' | 'right';
    maxWidth?: number;
  };
}

export interface ICarouselSlide {
  id: string;
  asset: ICreativeAsset;
  headline?: string;
  description?: string;
  linkUrl?: string;
  order: number;
}

export interface IMarketingCreative {
  _id: mongoose.Types.ObjectId;

  // Basic info
  name: string;
  description?: string;
  type: CreativeType;
  status: CreativeStatus;

  // Platform compatibility
  platforms: ('META' | 'LINKEDIN' | 'TWITTER' | 'TIKTOK' | 'YOUTUBE' | 'WHATSAPP')[];
  aspectRatio: AspectRatio;

  // Main asset (for single image/video)
  primaryAsset?: ICreativeAsset;

  // Carousel slides
  carouselSlides?: ICarouselSlide[];

  // Text content
  headline?: string;
  bodyText?: string; // Ad copy/body text
  callToAction?: string;
  linkUrl?: string;

  // Text overlays on the creative
  textOverlays?: ITextOverlay[];

  // Styling
  backgroundColor?: string;
  brandColors?: string[];

  // Template info
  isTemplate: boolean;
  templateCategory?: string;

  // Preview URLs (generated)
  previewUrls?: {
    platform: string;
    format: string;
    url: string;
  }[];

  // Usage tracking
  usedInCampaigns?: mongoose.Types.ObjectId[];
  usageCount: number;

  // Metadata
  tags?: string[];
  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const CreativeAssetSchema = new Schema<ICreativeAsset>({
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true,
  },
  url: { type: String, required: true },
  thumbnailUrl: String,
  width: Number,
  height: Number,
  duration: Number,
  fileSize: Number,
  mimeType: String,
  r2Key: String,
}, { _id: false });

const TextOverlaySchema = new Schema<ITextOverlay>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  position: {
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
  },
  style: {
    fontSize: { type: Number, default: 24 },
    fontFamily: { type: String, default: 'Inter' },
    fontWeight: { type: String, default: 'bold' },
    color: { type: String, default: '#FFFFFF' },
    backgroundColor: String,
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    maxWidth: Number,
  },
}, { _id: false });

const CarouselSlideSchema = new Schema<ICarouselSlide>({
  id: { type: String, required: true },
  asset: CreativeAssetSchema,
  headline: String,
  description: String,
  linkUrl: String,
  order: { type: Number, required: true },
}, { _id: false });

const MarketingCreativeSchema = new Schema<IMarketingCreative>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'CAROUSEL', 'STORY', 'REEL', 'TEXT'],
    required: true,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'READY', 'IN_USE', 'ARCHIVED'],
    default: 'DRAFT',
  },
  platforms: [{
    type: String,
    enum: ['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'GOOGLE_ADS'],
  }],
  aspectRatio: {
    type: String,
    enum: ['1:1', '4:5', '9:16', '16:9', '1.91:1'],
    default: '1:1',
  },
  primaryAsset: CreativeAssetSchema,
  carouselSlides: [CarouselSlideSchema],
  headline: {
    type: String,
    maxlength: 100,
  },
  bodyText: {
    type: String,
    maxlength: 500,
  },
  callToAction: {
    type: String,
    maxlength: 50,
  },
  linkUrl: String,
  textOverlays: [TextOverlaySchema],
  backgroundColor: String,
  brandColors: [String],
  isTemplate: {
    type: Boolean,
    default: false,
  },
  templateCategory: String,
  previewUrls: [{
    platform: String,
    format: String,
    url: String,
  }],
  usedInCampaigns: [{
    type: Schema.Types.ObjectId,
    ref: 'MarketingCampaign',
  }],
  usageCount: {
    type: Number,
    default: 0,
  },
  tags: [String],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
MarketingCreativeSchema.index({ name: 'text', description: 'text' });
MarketingCreativeSchema.index({ type: 1, status: 1 });
MarketingCreativeSchema.index({ platforms: 1 });
MarketingCreativeSchema.index({ isTemplate: 1, templateCategory: 1 });
MarketingCreativeSchema.index({ createdBy: 1 });
MarketingCreativeSchema.index({ tags: 1 });
MarketingCreativeSchema.index({ usageCount: -1 });

const MarketingCreative: Model<IMarketingCreative> =
  mongoose.models.MarketingCreative ||
  mongoose.model<IMarketingCreative>('MarketingCreative', MarketingCreativeSchema);

export default MarketingCreative;

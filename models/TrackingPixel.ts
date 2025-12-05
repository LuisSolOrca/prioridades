import mongoose, { Schema, Model } from 'mongoose';

export type PixelType = 'META_PIXEL' | 'GOOGLE_ADS' | 'LINKEDIN_INSIGHT' | 'TIKTOK_PIXEL' | 'TWITTER_PIXEL' | 'CUSTOM';

export interface ITrackingPixel {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: PixelType;
  pixelId: string;

  // For Google Ads
  conversionLabel?: string;

  // For custom pixels
  customScript?: string;

  // Where to inject
  injectIn: {
    app: boolean;           // Main app (authenticated users)
    landingPages: boolean;  // Public landing pages
    publicForms: boolean;   // Public forms
  };

  // Events to track
  trackEvents: {
    pageView: boolean;
    formSubmit: boolean;
    buttonClick: boolean;
    purchase: boolean;
    lead: boolean;
    customEvents: string[];  // Custom event names
  };

  // Status
  isActive: boolean;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingPixelSchema = new Schema<ITrackingPixel>({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['META_PIXEL', 'GOOGLE_ADS', 'LINKEDIN_INSIGHT', 'TIKTOK_PIXEL', 'TWITTER_PIXEL', 'CUSTOM'],
    required: true,
  },
  pixelId: {
    type: String,
    required: true,
  },
  conversionLabel: {
    type: String,
    required: false,
  },
  customScript: {
    type: String,
    required: false,
  },
  injectIn: {
    app: { type: Boolean, default: false },
    landingPages: { type: Boolean, default: true },
    publicForms: { type: Boolean, default: true },
  },
  trackEvents: {
    pageView: { type: Boolean, default: true },
    formSubmit: { type: Boolean, default: true },
    buttonClick: { type: Boolean, default: false },
    purchase: { type: Boolean, default: false },
    lead: { type: Boolean, default: true },
    customEvents: { type: [String], default: [] },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
TrackingPixelSchema.index({ type: 1, isActive: 1 });
TrackingPixelSchema.index({ isActive: 1 });

const TrackingPixel: Model<ITrackingPixel> =
  mongoose.models.TrackingPixel ||
  mongoose.model<ITrackingPixel>('TrackingPixel', TrackingPixelSchema);

export default TrackingPixel;

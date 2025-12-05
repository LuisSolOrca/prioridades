import mongoose, { Schema, Model } from 'mongoose';

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type TemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
export type ComponentType = 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
export type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
export type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';

export interface ITemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
  example?: string;
}

export interface ITemplateComponent {
  type: ComponentType;
  format?: HeaderFormat;
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: ITemplateButton[];
}

export interface IWhatsAppTemplate {
  _id: mongoose.Types.ObjectId;

  // Identification
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;

  // External IDs
  externalTemplateId?: string;
  externalNamespace?: string;

  // Components
  components: ITemplateComponent[];

  // Variables info
  variables?: {
    header?: string[];
    body?: string[];
  };

  // Review
  rejectionReason?: string;
  lastReviewedAt?: Date;

  // Usage stats
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  lastUsedAt?: Date;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const TemplateButtonSchema = new Schema<ITemplateButton>({
  type: {
    type: String,
    enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'COPY_CODE'],
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 25,
  },
  url: String,
  phoneNumber: String,
  example: String,
}, { _id: false });

const TemplateComponentSchema = new Schema<ITemplateComponent>({
  type: {
    type: String,
    enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'],
    required: true,
  },
  format: {
    type: String,
    enum: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'],
  },
  text: String,
  example: {
    header_text: [String],
    body_text: [[String]],
    header_handle: [String],
  },
  buttons: [TemplateButtonSchema],
}, { _id: false });

const WhatsAppTemplateSchema = new Schema<IWhatsAppTemplate>({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9_]+$/, // WhatsApp naming convention
  },
  language: {
    type: String,
    required: true,
    default: 'es_MX',
  },
  category: {
    type: String,
    enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED'],
    default: 'PENDING',
  },

  externalTemplateId: String,
  externalNamespace: String,

  components: [TemplateComponentSchema],

  variables: {
    header: [String],
    body: [String],
  },

  rejectionReason: String,
  lastReviewedAt: Date,

  messagesSent: {
    type: Number,
    default: 0,
  },
  messagesDelivered: {
    type: Number,
    default: 0,
  },
  messagesRead: {
    type: Number,
    default: 0,
  },
  lastUsedAt: Date,

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
WhatsAppTemplateSchema.index({ name: 1, language: 1 }, { unique: true });
WhatsAppTemplateSchema.index({ status: 1, isActive: 1 });
WhatsAppTemplateSchema.index({ category: 1 });
WhatsAppTemplateSchema.index({ externalTemplateId: 1 }, { sparse: true });
WhatsAppTemplateSchema.index({ createdBy: 1 });

// Virtual for delivery rate
WhatsAppTemplateSchema.virtual('deliveryRate').get(function() {
  if (!this.messagesSent || this.messagesSent === 0) return 0;
  return (this.messagesDelivered / this.messagesSent) * 100;
});

// Virtual for read rate
WhatsAppTemplateSchema.virtual('readRate').get(function() {
  if (!this.messagesDelivered || this.messagesDelivered === 0) return 0;
  return (this.messagesRead / this.messagesDelivered) * 100;
});

// Static: Get approved templates
WhatsAppTemplateSchema.statics.getApprovedTemplates = async function() {
  return this.find({ status: 'APPROVED', isActive: true }).sort({ name: 1 });
};

// Static: Get templates by category
WhatsAppTemplateSchema.statics.getByCategory = async function(category: TemplateCategory) {
  return this.find({ category, status: 'APPROVED', isActive: true }).sort({ name: 1 });
};

const WhatsAppTemplate: Model<IWhatsAppTemplate> =
  mongoose.models.WhatsAppTemplate ||
  mongoose.model<IWhatsAppTemplate>('WhatsAppTemplate', WhatsAppTemplateSchema);

export default WhatsAppTemplate;

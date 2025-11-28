import mongoose, { Schema, Model } from 'mongoose';

// Re-export from shared constants file
export type { EmailTrackingStatus } from '@/lib/crm/emailTrackingConstants';
export { EMAIL_STATUS_LABELS, EMAIL_STATUS_COLORS } from '@/lib/crm/emailTrackingConstants';

import type { EmailTrackingStatus } from '@/lib/crm/emailTrackingConstants';

export interface IClickedLink {
  url: string;
  clickedAt: Date;
}

export interface IEmailTracking {
  _id: mongoose.Types.ObjectId;

  // Relaciones
  activityId: mongoose.Types.ObjectId;  // Actividad de tipo 'email'
  dealId?: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;      // Usuario que envió el email

  // Contenido
  subject: string;
  bodyPreview: string;                  // Primeros 200 caracteres
  recipientEmail: string;
  recipientName?: string;

  // Tracking
  trackingId: string;                   // UUID único para pixel/links

  // Métricas
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;                      // Primera apertura
  openCount: number;
  lastOpenedAt?: Date;
  clickedAt?: Date;                     // Primer clic
  clickCount: number;
  clickedLinks: IClickedLink[];
  repliedAt?: Date;
  bouncedAt?: Date;
  bounceReason?: string;

  // Estado
  status: EmailTrackingStatus;

  // Metadatos
  userAgent?: string;                   // Del primer open
  ipAddress?: string;                   // Del primer open

  createdAt: Date;
  updatedAt: Date;
}

const ClickedLinkSchema = new Schema<IClickedLink>({
  url: { type: String, required: true },
  clickedAt: { type: Date, required: true },
}, { _id: false });

const EmailTrackingSchema = new Schema<IEmailTracking>({
  // Relaciones
  activityId: {
    type: Schema.Types.ObjectId,
    ref: 'Activity',
    required: true,
    index: true,
  },
  dealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
    index: true,
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
    index: true,
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Contenido
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  bodyPreview: {
    type: String,
    maxlength: 500,
  },
  recipientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  recipientName: {
    type: String,
    trim: true,
  },

  // Tracking
  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Métricas
  sentAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  deliveredAt: { type: Date },
  openedAt: { type: Date },
  openCount: {
    type: Number,
    default: 0,
  },
  lastOpenedAt: { type: Date },
  clickedAt: { type: Date },
  clickCount: {
    type: Number,
    default: 0,
  },
  clickedLinks: {
    type: [ClickedLinkSchema],
    default: [],
  },
  repliedAt: { type: Date },
  bouncedAt: { type: Date },
  bounceReason: { type: String },

  // Estado
  status: {
    type: String,
    required: true,
    enum: ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced'],
    default: 'sent',
  },

  // Metadatos
  userAgent: { type: String },
  ipAddress: { type: String },
}, {
  timestamps: true,
});

// Índices compuestos para consultas comunes
EmailTrackingSchema.index({ userId: 1, sentAt: -1 });
EmailTrackingSchema.index({ status: 1, sentAt: -1 });
EmailTrackingSchema.index({ dealId: 1, sentAt: -1 });
EmailTrackingSchema.index({ contactId: 1, sentAt: -1 });

// Método para actualizar estado basado en eventos
EmailTrackingSchema.methods.updateStatus = function() {
  if (this.bouncedAt) {
    this.status = 'bounced';
  } else if (this.repliedAt) {
    this.status = 'replied';
  } else if (this.clickedAt) {
    this.status = 'clicked';
  } else if (this.openedAt) {
    this.status = 'opened';
  } else if (this.deliveredAt) {
    this.status = 'delivered';
  } else {
    this.status = 'sent';
  }
};

// Virtuals para métricas
EmailTrackingSchema.virtual('isOpened').get(function() {
  return this.openCount > 0;
});

EmailTrackingSchema.virtual('isClicked').get(function() {
  return this.clickCount > 0;
});

const EmailTracking: Model<IEmailTracking> =
  mongoose.models.EmailTracking ||
  mongoose.model<IEmailTracking>('EmailTracking', EmailTrackingSchema);

export default EmailTracking;

import mongoose from 'mongoose';

export interface IWebFormSubmission {
  _id: mongoose.Types.ObjectId;
  formId: mongoose.Types.ObjectId;
  formName: string;           // Snapshot del nombre del formulario

  // Datos enviados
  data: Record<string, any>;

  // Entidades creadas
  contactId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;

  // Estado
  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string;

  // UTM y Tracking
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  pageUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Geolocalización (opcional, basado en IP)
  geoCountry?: string;
  geoCity?: string;

  // Tiempos
  submittedAt: Date;
  processedAt?: Date;

  // Notas
  notes?: string;
}

const WebFormSubmissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebForm',
    required: true,
    index: true,
  },
  formName: {
    type: String,
    required: true,
  },

  // Datos enviados (flexible)
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // Entidades creadas
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    index: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    index: true,
  },
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    index: true,
  },

  // Estado
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
    index: true,
  },
  errorMessage: String,

  // UTM y Tracking
  ipAddress: String,
  userAgent: String,
  referrer: String,
  pageUrl: String,
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  utmTerm: String,
  utmContent: String,

  // Geolocalización
  geoCountry: String,
  geoCity: String,

  // Tiempos
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  processedAt: Date,

  // Notas
  notes: String,
});

// Índices compuestos
WebFormSubmissionSchema.index({ formId: 1, submittedAt: -1 });
WebFormSubmissionSchema.index({ formId: 1, status: 1 });
WebFormSubmissionSchema.index({ utmSource: 1, utmCampaign: 1, submittedAt: -1 });

export default mongoose.models.WebFormSubmission ||
  mongoose.model<IWebFormSubmission>('WebFormSubmission', WebFormSubmissionSchema);

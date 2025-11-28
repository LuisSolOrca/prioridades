import mongoose, { Schema, Model } from 'mongoose';

// Tipo de temperatura de lead
export type LeadTemperature = 'hot' | 'warm' | 'cold';

// Score breakdown interface
export interface IScoreBreakdown {
  fit: number;
  engagement: number;
  fitDetails?: { rule: string; points: number }[];
  engagementDetails?: { action: string; points: number; count: number }[];
}

export interface IDeal {
  _id: mongoose.Types.ObjectId;
  title: string;
  pipelineId?: mongoose.Types.ObjectId; // Pipeline al que pertenece
  clientId: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  value: number;
  currency: string;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  probability?: number;
  lostReason?: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  tags?: string[];
  customFields?: Record<string, any>;
  projectId?: mongoose.Types.ObjectId;

  // Lead Scoring fields
  leadScore?: number;
  leadScoreUpdatedAt?: Date;
  leadTemperature?: LeadTemperature;
  scoreBreakdown?: IScoreBreakdown;
  lastEngagementAt?: Date;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>({
  title: {
    type: String,
    required: [true, 'El título del deal es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres'],
  },
  pipelineId: {
    type: Schema.Types.ObjectId,
    ref: 'Pipeline',
    index: true,
    // No required para retrocompatibilidad - la migración asignará el pipeline
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es requerido'],
    index: true,
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
  },
  stageId: {
    type: Schema.Types.ObjectId,
    ref: 'PipelineStage',
    required: [true, 'La etapa es requerida'],
    index: true,
  },
  value: {
    type: Number,
    required: [true, 'El valor es requerido'],
    min: [0, 'El valor no puede ser negativo'],
  },
  currency: {
    type: String,
    required: true,
    default: 'MXN',
    enum: ['MXN', 'USD', 'EUR'],
  },
  expectedCloseDate: {
    type: Date,
  },
  actualCloseDate: {
    type: Date,
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
  },
  lostReason: {
    type: String,
    trim: true,
    maxlength: [500, 'La razón de pérdida no puede exceder 500 caracteres'],
  },
  description: {
    type: String,
    trim: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El responsable es requerido'],
    index: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {},
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
  },

  // Lead Scoring fields
  leadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  leadScoreUpdatedAt: {
    type: Date,
  },
  leadTemperature: {
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'cold',
  },
  scoreBreakdown: {
    fit: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    fitDetails: [{
      rule: String,
      points: Number,
    }],
    engagementDetails: [{
      action: String,
      points: Number,
      count: Number,
    }],
  },
  lastEngagementAt: {
    type: Date,
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Índices compuestos
DealSchema.index({ stageId: 1, ownerId: 1 });
DealSchema.index({ clientId: 1, stageId: 1 });
DealSchema.index({ expectedCloseDate: 1 });
DealSchema.index({ createdAt: -1 });
DealSchema.index({ leadTemperature: 1, leadScore: -1 });
DealSchema.index({ leadScore: -1 });

// Virtual para valor ponderado (valor * probabilidad)
DealSchema.virtual('weightedValue').get(function() {
  const prob = this.probability ?? 0;
  return this.value * (prob / 100);
});

const Deal: Model<IDeal> =
  mongoose.models.Deal ||
  mongoose.model<IDeal>('Deal', DealSchema);

export default Deal;

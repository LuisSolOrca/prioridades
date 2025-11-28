import mongoose, { Schema, Model } from 'mongoose';

export interface IPipelineStage {
  _id: mongoose.Types.ObjectId;
  pipelineId?: mongoose.Types.ObjectId; // Pipeline al que pertenece (opcional para retrocompatibilidad)
  name: string;
  order: number;
  color: string;
  probability: number;
  isDefault: boolean;
  isClosed: boolean;
  isWon: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PipelineStageSchema = new Schema<IPipelineStage>({
  pipelineId: {
    type: Schema.Types.ObjectId,
    ref: 'Pipeline',
    index: true,
    // No required para retrocompatibilidad - la migración asignará el pipeline
  },
  name: {
    type: String,
    required: [true, 'El nombre de la etapa es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
  },
  order: {
    type: Number,
    required: true,
    min: 0,
  },
  color: {
    type: String,
    required: true,
    default: '#6b7280',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un código hex válido'],
  },
  probability: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isClosed: {
    type: Boolean,
    default: false,
  },
  isWon: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Índices
PipelineStageSchema.index({ pipelineId: 1, order: 1 });
PipelineStageSchema.index({ pipelineId: 1, isActive: 1 });
PipelineStageSchema.index({ isActive: 1 });

// Asegurar que solo haya una etapa por defecto POR PIPELINE
PipelineStageSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    const query: any = { _id: { $ne: this._id }, isDefault: true };
    // Si tiene pipeline, solo quitar default de etapas del mismo pipeline
    if (this.pipelineId) {
      query.pipelineId = this.pipelineId;
    }
    await mongoose.model('PipelineStage').updateMany(query, { isDefault: false });
  }
  next();
});

const PipelineStage: Model<IPipelineStage> =
  mongoose.models.PipelineStage ||
  mongoose.model<IPipelineStage>('PipelineStage', PipelineStageSchema);

export default PipelineStage;

// Etapas por defecto para inicializar
export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Prospecto', order: 1, color: '#9ca3af', probability: 10, isDefault: true, isClosed: false, isWon: false },
  { name: 'Calificado', order: 2, color: '#60a5fa', probability: 25, isDefault: false, isClosed: false, isWon: false },
  { name: 'Propuesta Enviada', order: 3, color: '#fbbf24', probability: 50, isDefault: false, isClosed: false, isWon: false },
  { name: 'Negociación', order: 4, color: '#f97316', probability: 75, isDefault: false, isClosed: false, isWon: false },
  { name: 'Cerrado Ganado', order: 5, color: '#22c55e', probability: 100, isDefault: false, isClosed: true, isWon: true },
  { name: 'Cerrado Perdido', order: 6, color: '#ef4444', probability: 0, isDefault: false, isClosed: true, isWon: false },
];

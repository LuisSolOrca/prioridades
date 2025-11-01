import mongoose, { Schema, Model } from 'mongoose';

export type PriorityStatus = 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO';

export interface IPriority {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  weekStart: Date;
  weekEnd: Date;
  completionPercentage: number;
  status: PriorityStatus;
  wasEdited: boolean;
  isCarriedOver: boolean;
  userId: mongoose.Types.ObjectId;
  initiativeId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastEditedAt?: Date;
}

const PrioritySchema = new Schema<IPriority>({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [150, 'El título no puede exceder 150 caracteres'],
  },
  description: {
    type: String,
    trim: true,
  },
  weekStart: {
    type: Date,
    required: true,
  },
  weekEnd: {
    type: Date,
    required: true,
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  status: {
    type: String,
    enum: ['EN_TIEMPO', 'EN_RIESGO', 'BLOQUEADO', 'COMPLETADO'],
    default: 'EN_TIEMPO',
  },
  wasEdited: {
    type: Boolean,
    default: false,
  },
  isCarriedOver: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  initiativeId: {
    type: Schema.Types.ObjectId,
    ref: 'StrategicInitiative',
    required: true,
  },
  lastEditedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Índices para mejorar el rendimiento
PrioritySchema.index({ userId: 1, weekStart: 1 });
PrioritySchema.index({ weekStart: 1 });
PrioritySchema.index({ status: 1 });

const Priority: Model<IPriority> = 
  mongoose.models.Priority || 
  mongoose.model<IPriority>('Priority', PrioritySchema);

export default Priority;

import mongoose, { Schema, Model } from 'mongoose';

export type PriorityStatus = 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';

export interface IChecklistItem {
  _id?: mongoose.Types.ObjectId;
  text: string;
  completed: boolean;
  createdAt?: Date;
}

export interface IEvidenceLink {
  _id?: mongoose.Types.ObjectId;
  title: string;
  url: string;
  createdAt?: Date;
}

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
  initiativeId?: mongoose.Types.ObjectId; // Mantener para compatibilidad hacia atrás
  initiativeIds: mongoose.Types.ObjectId[]; // Nuevo campo para múltiples iniciativas
  checklist: IChecklistItem[]; // Lista de tareas
  evidenceLinks: IEvidenceLink[]; // Enlaces de evidencia
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
    enum: ['EN_TIEMPO', 'EN_RIESGO', 'BLOQUEADO', 'COMPLETADO', 'REPROGRAMADO'],
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
    required: false, // Ya no es requerido, para compatibilidad
  },
  initiativeIds: {
    type: [Schema.Types.ObjectId],
    ref: 'StrategicInitiative',
    default: [],
    validate: {
      validator: function(v: mongoose.Types.ObjectId[]) {
        return v && v.length > 0; // Al menos una iniciativa requerida
      },
      message: 'Debe seleccionar al menos una iniciativa estratégica'
    }
  },
  lastEditedAt: {
    type: Date,
  },
  checklist: {
    type: [{
      text: { type: String, required: true, trim: true },
      completed: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  evidenceLinks: {
    type: [{
      title: { type: String, required: true, trim: true },
      url: { type: String, required: true, trim: true },
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
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

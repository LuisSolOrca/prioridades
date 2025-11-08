import mongoose, { Schema, Model } from 'mongoose';

export type PriorityStatus = 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO' | 'REPROGRAMADO';
export type PriorityType = 'ESTRATEGICA' | 'OPERATIVA';

export interface IChecklistItem {
  _id?: mongoose.Types.ObjectId;
  text: string;
  completed: boolean;
  completedHours?: number;
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
  type: PriorityType;
  wasEdited: boolean;
  isCarriedOver: boolean;
  userId: mongoose.Types.ObjectId;
  initiativeId?: mongoose.Types.ObjectId; // Mantener para compatibilidad hacia atrás
  initiativeIds: mongoose.Types.ObjectId[]; // Nuevo campo para múltiples iniciativas
  clientId: mongoose.Types.ObjectId; // Cliente asociado (obligatorio)
  projectId?: mongoose.Types.ObjectId; // Proyecto asociado (opcional)
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
  type: {
    type: String,
    enum: ['ESTRATEGICA', 'OPERATIVA'],
    default: 'ESTRATEGICA',
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
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es requerido'],
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: false,
  },
  lastEditedAt: {
    type: Date,
  },
  checklist: {
    type: [{
      text: { type: String, required: true, trim: true },
      completed: { type: Boolean, default: false },
      completedHours: { type: Number, min: 0 },
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  evidenceLinks: {
    type: [{
      title: { type: String, required: true, trim: true, maxlength: 200 },
      url: { type: String, required: true, trim: true, maxlength: 2000 },
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

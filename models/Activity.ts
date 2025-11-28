import mongoose, { Schema, Model } from 'mongoose';

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task' | 'channel_message';

export interface IActivity {
  _id: mongoose.Types.ObjectId;
  type: ActivityType;
  title: string;
  description?: string;
  // Relaciones polimórficas
  clientId?: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  // Vinculación con canales
  channelMessageId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  // Metadata
  dueDate?: Date;
  completedAt?: Date;
  isCompleted: boolean;
  duration?: number;
  outcome?: string;
  // Usuarios
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>({
  type: {
    type: String,
    required: [true, 'El tipo de actividad es requerido'],
    enum: ['note', 'call', 'email', 'meeting', 'task', 'channel_message'],
  },
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres'],
  },
  description: {
    type: String,
    trim: true,
  },
  // Relaciones polimórficas
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    index: true,
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
    index: true,
  },
  dealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
    index: true,
  },
  // Vinculación con canales existentes
  channelMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'ChannelMessage',
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
  },
  // Metadata
  dueDate: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  duration: {
    type: Number,
    min: 0,
  },
  outcome: {
    type: String,
    trim: true,
    maxlength: [500, 'El resultado no puede exceder 500 caracteres'],
  },
  // Usuarios
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Índices compuestos
ActivitySchema.index({ clientId: 1, createdAt: -1 });
ActivitySchema.index({ dealId: 1, createdAt: -1 });
ActivitySchema.index({ contactId: 1, createdAt: -1 });
ActivitySchema.index({ type: 1, createdAt: -1 });
ActivitySchema.index({ assignedTo: 1, isCompleted: 1, dueDate: 1 });

// Validación: al menos una relación debe estar presente
ActivitySchema.pre('save', function(next) {
  if (!this.clientId && !this.contactId && !this.dealId) {
    next(new Error('La actividad debe estar asociada a un cliente, contacto o deal'));
  }
  next();
});

// Labels para tipos de actividad
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, { label: string; icon: string; color: string }> = {
  note: { label: 'Nota', icon: '📝', color: '#6b7280' },
  call: { label: 'Llamada', icon: '📞', color: '#3b82f6' },
  email: { label: 'Email', icon: '📧', color: '#8b5cf6' },
  meeting: { label: 'Reunión', icon: '🤝', color: '#10b981' },
  task: { label: 'Tarea', icon: '✅', color: '#f59e0b' },
  channel_message: { label: 'Mensaje de Canal', icon: '💬', color: '#ec4899' },
};

const Activity: Model<IActivity> =
  mongoose.models.Activity ||
  mongoose.model<IActivity>('Activity', ActivitySchema);

export default Activity;

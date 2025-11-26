import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChannel extends Document {
  _id: string;
  projectId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  parentId?: mongoose.Types.ObjectId | null;
  order: number;
  icon?: string; // Nombre del icono de Lucide React
  isActive: boolean;
  isPrivate: boolean; // Si es true, solo los miembros pueden ver/acceder
  members: mongoose.Types.ObjectId[]; // Lista de usuarios con acceso (solo aplica si isPrivate es true)
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      default: null,
      index: true
    },
    order: {
      type: Number,
      default: 0
    },
    icon: {
      type: String,
      default: 'Hash' // Icono por defecto de Lucide
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Índice compuesto para queries eficientes
ChannelSchema.index({ projectId: 1, parentId: 1, order: 1 });

// Validación: máximo 2 niveles de profundidad
ChannelSchema.pre('save', async function (next) {
  if (this.parentId) {
    const parent = await mongoose.model('Channel').findById(this.parentId);
    if (parent && parent.parentId) {
      throw new Error('No se permiten más de 2 niveles de jerarquía');
    }
  }
  next();
});

// Evitar recompilación en desarrollo
const Channel: Model<IChannel> =
  mongoose.models.Channel || mongoose.model<IChannel>('Channel', ChannelSchema);

export default Channel;

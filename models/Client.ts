import mongoose, { Schema, Model } from 'mongoose';

export interface IClient {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>({
  name: {
    type: String,
    required: [true, 'El nombre del cliente es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    unique: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Índice para mejorar el rendimiento en búsquedas
ClientSchema.index({ name: 1 });
ClientSchema.index({ isActive: 1 });

const Client: Model<IClient> =
  mongoose.models.Client ||
  mongoose.model<IClient>('Client', ClientSchema);

export default Client;

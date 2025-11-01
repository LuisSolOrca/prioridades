import mongoose, { Schema, Model } from 'mongoose';

export interface IStrategicInitiative {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  color: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StrategicInitiativeSchema = new Schema<IStrategicInitiative>({
  name: {
    type: String,
    required: [true, 'El nombre de la iniciativa es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
  },
  description: {
    type: String,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
  },
  color: {
    type: String,
    default: '#3B82F6',
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const StrategicInitiative: Model<IStrategicInitiative> = 
  mongoose.models.StrategicInitiative || 
  mongoose.model<IStrategicInitiative>('StrategicInitiative', StrategicInitiativeSchema);

export default StrategicInitiative;

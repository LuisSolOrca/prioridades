import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetitor extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  website?: string;
  description?: string;

  // Información competitiva
  strengths: string[];           // Fortalezas
  weaknesses: string[];          // Debilidades
  pricing?: string;              // Descripción de precios
  marketPosition: 'leader' | 'challenger' | 'niche' | 'unknown';

  // Metadata
  logo?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSchema = new Schema<ICompetitor>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    strengths: [{
      type: String,
      trim: true,
    }],
    weaknesses: [{
      type: String,
      trim: true,
    }],
    pricing: {
      type: String,
      trim: true,
    },
    marketPosition: {
      type: String,
      enum: ['leader', 'challenger', 'niche', 'unknown'],
      default: 'unknown',
    },
    logo: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
CompetitorSchema.index({ name: 1 });
CompetitorSchema.index({ isActive: 1 });

export default mongoose.models.Competitor || mongoose.model<ICompetitor>('Competitor', CompetitorSchema);

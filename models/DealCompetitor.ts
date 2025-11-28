import mongoose, { Document, Schema } from 'mongoose';

export interface IDealCompetitor extends Document {
  _id: mongoose.Types.ObjectId;
  dealId: mongoose.Types.ObjectId;
  competitorId: mongoose.Types.ObjectId;

  // Estado en este deal específico
  status: 'active' | 'won_against' | 'lost_to' | 'no_decision';
  threatLevel: 'low' | 'medium' | 'high';

  // Inteligencia competitiva
  notes?: string;                 // Notas sobre este competidor en este deal
  contactedBy?: string;           // ¿Quién del cliente habló con ellos?
  theirPrice?: number;            // Precio que ofrecieron (si se sabe)
  theirStrengths: string[];       // Fortalezas percibidas en este deal
  theirWeaknesses: string[];      // Debilidades percibidas en este deal

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DealCompetitorSchema = new Schema<IDealCompetitor>(
  {
    dealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
      index: true,
    },
    competitorId: {
      type: Schema.Types.ObjectId,
      ref: 'Competitor',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'won_against', 'lost_to', 'no_decision'],
      default: 'active',
    },
    threatLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    notes: {
      type: String,
      trim: true,
    },
    contactedBy: {
      type: String,
      trim: true,
    },
    theirPrice: {
      type: Number,
      min: 0,
    },
    theirStrengths: [{
      type: String,
      trim: true,
    }],
    theirWeaknesses: [{
      type: String,
      trim: true,
    }],
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

// Índice único para evitar duplicados
DealCompetitorSchema.index({ dealId: 1, competitorId: 1 }, { unique: true });

// Índice para reportes
DealCompetitorSchema.index({ competitorId: 1, status: 1 });

export default mongoose.models.DealCompetitor || mongoose.model<IDealCompetitor>('DealCompetitor', DealCompetitorSchema);

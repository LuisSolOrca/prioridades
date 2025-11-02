import mongoose, { Schema, Document } from 'mongoose';

export interface IBadge extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'FIRST_TASK' | 'FIRST_COMMENT' | 'FIRST_MENTION' | 'FIVE_WEEKS_STREAK';
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

const BadgeSchema = new Schema<IBadge>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['FIRST_TASK', 'FIRST_COMMENT', 'FIRST_MENTION', 'FIVE_WEEKS_STREAK'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  earnedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice único para evitar duplicados (excepto FIVE_WEEKS_STREAK que puede ganarse múltiples veces)
BadgeSchema.index({ userId: 1, type: 1 });

export default mongoose.models.Badge || mongoose.model<IBadge>('Badge', BadgeSchema);

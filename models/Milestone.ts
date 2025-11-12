import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliverable {
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface IMilestone extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  dueDate: Date;
  deliverables: IDeliverable[];
  isCompleted: boolean;
  completedAt?: Date;
  notificationSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverableSchema = new Schema<IDeliverable>({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 500
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
});

const MilestoneSchema = new Schema<IMilestone>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  deliverables: [DeliverableSchema],
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas eficientes
MilestoneSchema.index({ userId: 1, dueDate: 1 });

export default mongoose.models.Milestone || mongoose.model<IMilestone>('Milestone', MilestoneSchema);

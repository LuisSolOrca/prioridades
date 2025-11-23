import mongoose, { Schema, Document } from 'mongoose';

export interface IStandup extends Document {
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  yesterday: string;
  today: string;
  blockers: string;
  risks: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StandupSchema = new Schema<IStandup>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  yesterday: {
    type: String,
    required: true,
    maxlength: 1000
  },
  today: {
    type: String,
    required: true,
    maxlength: 1000
  },
  blockers: {
    type: String,
    default: '',
    maxlength: 500
  },
  risks: {
    type: String,
    default: '',
    maxlength: 500
  },
  date: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas eficientes
StandupSchema.index({ projectId: 1, date: -1 });
StandupSchema.index({ userId: 1, date: -1 });

export default mongoose.models.Standup || mongoose.model<IStandup>('Standup', StandupSchema);

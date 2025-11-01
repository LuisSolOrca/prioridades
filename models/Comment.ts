import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  priorityId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  isSystemComment: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  priorityId: {
    type: Schema.Types.ObjectId,
    ref: 'Priority',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  isSystemComment: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índice compuesto para optimizar búsquedas de comentarios por prioridad
CommentSchema.index({ priorityId: 1, createdAt: -1 });

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

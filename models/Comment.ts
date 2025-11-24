import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  priorityId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  isSystemComment: boolean;
  azureCommentId?: number; // ID del comentario en Azure DevOps (si fue sincronizado desde allá)
  attachments?: mongoose.Types.ObjectId[]; // Array de attachmentIds
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
    required: false, // Permitir texto vacío si hay attachments
    trim: true,
    default: ''
  },
  isSystemComment: {
    type: Boolean,
    default: false
  },
  azureCommentId: {
    type: Number,
    required: false,
    index: true // Índice para búsquedas rápidas
  },
  attachments: [{
    type: Schema.Types.ObjectId,
    ref: 'Attachment'
  }]
}, {
  timestamps: true
});

// Índice compuesto para optimizar búsquedas de comentarios por prioridad
CommentSchema.index({ priorityId: 1, createdAt: -1 });

// Validación personalizada: debe tener texto O attachments
CommentSchema.pre('validate', function(next) {
  if (!this.text && (!this.attachments || this.attachments.length === 0)) {
    next(new Error('Un comentario debe tener texto o archivos adjuntos'));
  } else {
    next();
  }
});

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

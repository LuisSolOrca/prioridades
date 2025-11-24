import mongoose, { Document, Schema } from 'mongoose';

export interface IAttachment extends Document {
  _id: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId; // Para archivos de canales/proyectos
  channelId?: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  priorityId?: mongoose.Types.ObjectId; // Para archivos de comentarios en prioridades
  commentId?: mongoose.Types.ObjectId;  // Para archivos de comentarios en prioridades
  fileName: string;
  originalName: string;
  fileSize: number; // bytes
  mimeType: string;
  r2Key: string; // Key en R2
  r2Url?: string; // URL pública si es público
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  isPublic: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      index: true
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'ChannelMessage',
      index: true
    },
    priorityId: {
      type: Schema.Types.ObjectId,
      ref: 'Priority',
      index: true
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    r2Key: {
      type: String,
      required: true,
      unique: true
    },
    r2Url: {
      type: String
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Índices compuestos
AttachmentSchema.index({ projectId: 1, isDeleted: 1, uploadedAt: -1 });
AttachmentSchema.index({ channelId: 1, isDeleted: 1, uploadedAt: -1 });
AttachmentSchema.index({ messageId: 1 });
AttachmentSchema.index({ priorityId: 1, isDeleted: 1, uploadedAt: -1 });
AttachmentSchema.index({ commentId: 1 });

export default mongoose.models.Attachment || mongoose.model<IAttachment>('Attachment', AttachmentSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type:
    | 'STATUS_CHANGE'
    | 'COMMENT'
    | 'MENTION'
    | 'WEEKEND_REMINDER'
    | 'PRIORITY_ASSIGNED'
    | 'PRIORITY_DUE_SOON'
    | 'COMPLETION_MILESTONE'
    | 'PRIORITY_INACTIVE'
    | 'PRIORITY_UNBLOCKED'
    | 'WEEKLY_SUMMARY'
    | 'INITIATIVE_AT_RISK'
    | 'WEEK_COMPLETED'
    | 'WEEK_START_REMINDER'
    | 'COMMENT_REPLY'
    | 'WORKFLOW_NOTIFICATION'
    | 'CHANNEL_MENTION'
    | 'CHANNEL_REPLY'
    | 'WEBFORM_SUBMISSION';
  title: string;
  message: string;
  priorityId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'STATUS_CHANGE',
      'COMMENT',
      'MENTION',
      'WEEKEND_REMINDER',
      'PRIORITY_ASSIGNED',
      'PRIORITY_DUE_SOON',
      'COMPLETION_MILESTONE',
      'PRIORITY_INACTIVE',
      'PRIORITY_UNBLOCKED',
      'WEEKLY_SUMMARY',
      'INITIATIVE_AT_RISK',
      'WEEK_COMPLETED',
      'WEEK_START_REMINDER',
      'COMMENT_REPLY',
      'WORKFLOW_NOTIFICATION',
      'CHANNEL_MENTION',
      'CHANNEL_REPLY',
      'WEBFORM_SUBMISSION'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  priorityId: {
    type: Schema.Types.ObjectId,
    ref: 'Priority'
  },
  commentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project'
  },
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'ChannelMessage'
  },
  actionUrl: {
    type: String,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Índice compuesto para optimizar consultas de notificaciones no leídas por usuario
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

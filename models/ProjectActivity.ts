import mongoose from 'mongoose';

/**
 * Tipos de actividad que se registran en el feed del proyecto
 */
export type ActivityType =
  | 'priority_created'
  | 'priority_status_changed'
  | 'priority_completed'
  | 'priority_deleted'
  | 'task_created'
  | 'task_status_changed'
  | 'task_completed'
  | 'task_deleted'
  | 'comment_added'
  | 'milestone_created'
  | 'milestone_completed'
  | 'milestone_upcoming'
  | 'project_updated'
  | 'user_assigned'
  | 'user_unassigned';

export interface IProjectActivity {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  activityType: ActivityType;
  userId: mongoose.Types.ObjectId; // Usuario que realizó la acción
  metadata: {
    // Datos específicos del evento
    priorityId?: mongoose.Types.ObjectId;
    priorityTitle?: string;
    taskId?: mongoose.Types.ObjectId;
    taskTitle?: string;
    oldStatus?: string;
    newStatus?: string;
    commentText?: string;
    milestoneId?: mongoose.Types.ObjectId;
    milestoneTitle?: string;
    milestoneDueDate?: Date;
    assignedUserId?: mongoose.Types.ObjectId;
    assignedUserName?: string;
    additionalInfo?: string;
  };
  createdAt: Date;
}

const ProjectActivitySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  activityType: {
    type: String,
    required: true,
    enum: [
      'priority_created',
      'priority_status_changed',
      'priority_completed',
      'priority_deleted',
      'task_created',
      'task_status_changed',
      'task_completed',
      'task_deleted',
      'comment_added',
      'milestone_created',
      'milestone_completed',
      'milestone_upcoming',
      'project_updated',
      'user_assigned',
      'user_unassigned'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Índice compuesto para búsquedas eficientes por proyecto y fecha
ProjectActivitySchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.models.ProjectActivity ||
  mongoose.model<IProjectActivity>('ProjectActivity', ProjectActivitySchema);

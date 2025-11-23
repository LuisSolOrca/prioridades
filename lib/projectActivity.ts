import ProjectActivity, { type ActivityType } from '@/models/ProjectActivity';
import type mongoose from 'mongoose';

/**
 * Registra una actividad en el feed del proyecto
 */
export async function logProjectActivity(params: {
  projectId: mongoose.Types.ObjectId | string;
  activityType: ActivityType;
  userId: mongoose.Types.ObjectId | string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await ProjectActivity.create({
      projectId: params.projectId,
      activityType: params.activityType,
      userId: params.userId,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('Error logging project activity:', error);
    // No lanzamos el error para no bloquear la operación principal
  }
}

/**
 * Funciones auxiliares para registrar eventos específicos
 */

export async function logPriorityCreated(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  priorityId: mongoose.Types.ObjectId | string,
  priorityTitle: string
) {
  return logProjectActivity({
    projectId,
    activityType: 'priority_created',
    userId,
    metadata: { priorityId, priorityTitle }
  });
}

export async function logPriorityStatusChanged(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  priorityId: mongoose.Types.ObjectId | string,
  priorityTitle: string,
  oldStatus: string,
  newStatus: string
) {
  return logProjectActivity({
    projectId,
    activityType: 'priority_status_changed',
    userId,
    metadata: { priorityId, priorityTitle, oldStatus, newStatus }
  });
}

export async function logPriorityCompleted(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  priorityId: mongoose.Types.ObjectId | string,
  priorityTitle: string
) {
  return logProjectActivity({
    projectId,
    activityType: 'priority_completed',
    userId,
    metadata: { priorityId, priorityTitle }
  });
}

export async function logTaskCreated(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  taskId: mongoose.Types.ObjectId | string,
  taskTitle: string,
  priorityId?: mongoose.Types.ObjectId | string,
  priorityTitle?: string
) {
  return logProjectActivity({
    projectId,
    activityType: 'task_created',
    userId,
    metadata: { taskId, taskTitle, priorityId, priorityTitle }
  });
}

export async function logTaskStatusChanged(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  taskId: mongoose.Types.ObjectId | string,
  taskTitle: string,
  oldStatus: string,
  newStatus: string
) {
  return logProjectActivity({
    projectId,
    activityType: 'task_status_changed',
    userId,
    metadata: { taskId, taskTitle, oldStatus, newStatus }
  });
}

export async function logTaskCompleted(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  taskId: mongoose.Types.ObjectId | string,
  taskTitle: string,
  priorityId?: mongoose.Types.ObjectId | string,
  priorityTitle?: string
) {
  return logProjectActivity({
    projectId,
    activityType: 'task_completed',
    userId,
    metadata: { taskId, taskTitle, priorityId, priorityTitle }
  });
}

export async function logCommentAdded(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  priorityId: mongoose.Types.ObjectId | string,
  priorityTitle: string,
  commentText: string
) {
  return logProjectActivity({
    projectId,
    activityType: 'comment_added',
    userId,
    metadata: {
      priorityId,
      priorityTitle,
      commentText: commentText.substring(0, 200) // Limitar a 200 caracteres
    }
  });
}

export async function logMilestoneCreated(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  milestoneId: mongoose.Types.ObjectId | string,
  milestoneTitle: string,
  milestoneDueDate: Date
) {
  return logProjectActivity({
    projectId,
    activityType: 'milestone_created',
    userId,
    metadata: { milestoneId, milestoneTitle, milestoneDueDate }
  });
}

export async function logMilestoneCompleted(
  projectId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  milestoneId: mongoose.Types.ObjectId | string,
  milestoneTitle: string
) {
  return logProjectActivity({
    projectId,
    activityType: 'milestone_completed',
    userId,
    metadata: { milestoneId, milestoneTitle }
  });
}

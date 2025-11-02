/**
 * Motor de ejecución de workflows
 * Evalúa condiciones y ejecuta acciones basadas en eventos de prioridades
 */

import mongoose from 'mongoose';
import Workflow, { IWorkflow, ICondition, IAction } from '@/models/Workflow';
import WorkflowExecution from '@/models/WorkflowExecution';
import Priority from '@/models/Priority';
import User from '@/models/User';
import Notification from '@/models/Notification';
import Comment from '@/models/Comment';
import { sendEmail } from '@/lib/email';
import connectDB from '@/lib/mongodb';

interface WorkflowContext {
  priority: any;
  previousStatus?: string;
  previousCompletion?: number;
  previousUserId?: string;
  newUserId?: string;
  previousOwnerName?: string;
  newOwnerName?: string;
}

/**
 * Reemplaza placeholders en un mensaje con datos de la prioridad
 * Placeholders disponibles:
 * - {{title}} - Título de la prioridad
 * - {{status}} - Estado actual
 * - {{completion}} - Porcentaje de completado
 * - {{owner}} - Nombre del dueño
 * - {{initiative}} - Nombre de la iniciativa
 * - {{weekStart}} - Fecha de inicio de semana
 * - {{weekEnd}} - Fecha de fin de semana
 * - {{previousOwner}} - Nombre del dueño anterior (en reasignación)
 * - {{newOwner}} - Nombre del nuevo dueño (en reasignación)
 */
function replacePlaceholders(message: string, context: WorkflowContext): string {
  if (!message) return message;

  const { priority, previousUserId, newUserId } = context;

  let result = message;

  // Reemplazar placeholders básicos
  result = result.replace(/\{\{title\}\}/g, priority.title || '');
  result = result.replace(/\{\{status\}\}/g, priority.status || '');
  result = result.replace(/\{\{completion\}\}/g, String(priority.completionPercentage || 0));

  // Reemplazar placeholder de dueño
  const ownerName = priority.userId?.name || 'Sin asignar';
  result = result.replace(/\{\{owner\}\}/g, ownerName);

  // Reemplazar placeholder de iniciativa
  const initiativeName = priority.initiativeId?.name || 'Sin iniciativa';
  result = result.replace(/\{\{initiative\}\}/g, initiativeName);

  // Reemplazar placeholders de fechas
  if (priority.weekStart) {
    const weekStart = new Date(priority.weekStart).toLocaleDateString('es-MX');
    result = result.replace(/\{\{weekStart\}\}/g, weekStart);
  }

  if (priority.weekEnd) {
    const weekEnd = new Date(priority.weekEnd).toLocaleDateString('es-MX');
    result = result.replace(/\{\{weekEnd\}\}/g, weekEnd);
  }

  // Reemplazar placeholders de estados previos (si están disponibles)
  if (context.previousStatus) {
    result = result.replace(/\{\{previousStatus\}\}/g, context.previousStatus);
  }

  if (context.previousCompletion !== undefined) {
    result = result.replace(/\{\{previousCompletion\}\}/g, String(context.previousCompletion));
  }

  // Reemplazar placeholders de reasignación (si están disponibles)
  if (context.previousOwnerName) {
    result = result.replace(/\{\{previousOwner\}\}/g, context.previousOwnerName);
  }

  if (context.newOwnerName) {
    result = result.replace(/\{\{newOwner\}\}/g, context.newOwnerName);
  }

  return result;
}

/**
 * Evalúa si una condición se cumple para una prioridad
 */
async function evaluateCondition(
  condition: ICondition,
  context: WorkflowContext
): Promise<boolean> {
  const { priority } = context;

  switch (condition.type) {
    case 'status_equals':
      return priority.status === condition.value;

    case 'status_for_days':
      // Verificar si el estado ha permanecido por N días
      if (priority.status !== condition.value) return false;
      if (!condition.days) return false;

      // Buscar cambios de estado recientes en el historial
      // Por ahora, simplificado: verificar si updatedAt es >= N días
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(priority.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate >= condition.days;

    case 'completion_less_than':
      return priority.completionPercentage < condition.value;

    case 'completion_greater_than':
      return priority.completionPercentage > condition.value;

    case 'day_of_week':
      // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const today = new Date().getDay();
      return today === condition.value;

    case 'days_until_deadline':
      if (!priority.weekEnd) return false;
      const daysUntil = Math.floor(
        (new Date(priority.weekEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= condition.value;

    case 'user_equals':
      return priority.userId?.toString() === condition.value?.toString();

    case 'initiative_equals':
      return priority.initiativeId?.toString() === condition.value?.toString();

    case 'title_contains':
      if (!condition.value) return false;
      const titleToCheck = priority.title?.toLowerCase() || '';
      const titleSearchText = String(condition.value).toLowerCase();
      return titleToCheck.includes(titleSearchText);

    case 'description_contains':
      if (!condition.value) return false;
      const descriptionToCheck = priority.detailedDescription?.toLowerCase() || '';
      const descriptionSearchText = String(condition.value).toLowerCase();
      return descriptionToCheck.includes(descriptionSearchText);

    case 'new_user_equals':
      // Verificar si la prioridad fue reasignada al usuario especificado
      if (!context.newUserId) return false;
      return context.newUserId?.toString() === condition.value?.toString();

    case 'previous_user_equals':
      // Verificar si la prioridad fue reasignada desde el usuario especificado
      if (!context.previousUserId) return false;
      return context.previousUserId?.toString() === condition.value?.toString();

    default:
      console.warn(`Tipo de condición desconocido: ${condition.type}`);
      return false;
  }
}

/**
 * Evalúa todas las condiciones de un workflow (AND lógico)
 */
async function evaluateConditions(
  workflow: IWorkflow,
  context: WorkflowContext
): Promise<boolean> {
  if (!workflow.conditions || workflow.conditions.length === 0) {
    return true; // Sin condiciones = siempre ejecutar
  }

  for (const condition of workflow.conditions) {
    const result = await evaluateCondition(condition, context);
    if (!result) {
      return false; // AND: todas deben cumplirse
    }
  }

  return true;
}

/**
 * Ejecuta una acción individual
 */
async function executeAction(
  action: IAction,
  context: WorkflowContext,
  workflow: IWorkflow
): Promise<{ success: boolean; error?: string; details?: any }> {
  const { priority } = context;

  try {
    switch (action.type) {
      case 'send_notification':
        const notificationMessage = replacePlaceholders(action.message || '', context);
        console.log(`[Notification] ${notificationMessage} para prioridad ${priority._id}`);

        // Determinar destinatarios
        let recipientIds: mongoose.Types.ObjectId[] = [];

        if (action.targetRole === 'OWNER') {
          // Notificar al dueño de la prioridad
          if (priority.userId?._id) {
            recipientIds.push(priority.userId._id);
          }
        } else if (action.targetRole === 'ADMIN') {
          // Notificar a todos los administradores
          const admins = await User.find({ role: 'ADMIN', isActive: true });
          recipientIds = admins.map(admin => admin._id as mongoose.Types.ObjectId);
        } else if (action.targetRole === 'USER' && action.targetUserId) {
          // Notificar a un usuario específico
          recipientIds.push(action.targetUserId as mongoose.Types.ObjectId);
        }

        // Crear notificaciones para cada destinatario
        const notificationsCreated = [];
        for (const userId of recipientIds) {
          const notification = await Notification.create({
            userId,
            type: 'WORKFLOW_NOTIFICATION',
            title: 'Workflow Automatizado',
            message: notificationMessage,
            priorityId: priority._id,
            actionUrl: `/priorities`,
            isRead: false
          });
          notificationsCreated.push(notification._id);
        }

        return {
          success: true,
          details: {
            type: 'notification',
            message: notificationMessage,
            targetUserId: action.targetUserId,
            targetRole: action.targetRole,
            recipientsCount: recipientIds.length,
            notificationIds: notificationsCreated
          }
        };

      case 'send_email':
        const emailSubject = replacePlaceholders(action.emailSubject || '', context);
        const emailMessage = replacePlaceholders(action.message || '', context);
        console.log(`[Email] ${emailSubject}: ${emailMessage}`);

        // Determinar destinatarios de email
        let emailRecipients: string[] = [];

        if (action.targetRole === 'OWNER') {
          // Enviar al dueño de la prioridad
          if (priority.userId?.email) {
            emailRecipients.push(priority.userId.email);
          }
        } else if (action.targetRole === 'ADMIN') {
          // Enviar a todos los administradores
          const admins = await User.find({ role: 'ADMIN', isActive: true });
          emailRecipients = admins.map(admin => admin.email).filter(email => email);
        } else if (action.targetRole === 'USER' && action.targetUserId) {
          // Enviar a un usuario específico
          const targetUser = await User.findById(action.targetUserId);
          if (targetUser?.email) {
            emailRecipients.push(targetUser.email);
          }
        }

        // Enviar emails
        const emailResults = [];
        for (const recipient of emailRecipients) {
          try {
            const result = await sendEmail({
              to: recipient,
              subject: emailSubject,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Notificación de Workflow</h2>
                  <p>${emailMessage.replace(/\n/g, '<br>')}</p>
                  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                  <p style="color: #6b7280; font-size: 14px;">
                    Esta es una notificación automática generada por el sistema de workflows.
                  </p>
                </div>
              `,
              text: emailMessage
            });
            emailResults.push({ recipient, success: true, messageId: result.messageId });
          } catch (error: any) {
            console.error(`Error enviando email a ${recipient}:`, error);
            emailResults.push({ recipient, success: false, error: error.message });
          }
        }

        return {
          success: true,
          details: {
            type: 'email',
            subject: emailSubject,
            message: emailMessage,
            targetRole: action.targetRole,
            recipientsCount: emailRecipients.length,
            emailResults
          }
        };

      case 'change_status':
        if (!action.newStatus) {
          throw new Error('newStatus requerido para change_status');
        }

        priority.status = action.newStatus;
        await priority.save();

        return {
          success: true,
          details: {
            type: 'status_change',
            oldStatus: context.previousStatus,
            newStatus: action.newStatus
          }
        };

      case 'assign_to_user':
        if (!action.targetUserId) {
          throw new Error('targetUserId requerido para assign_to_user');
        }

        priority.userId = action.targetUserId;
        await priority.save();

        return {
          success: true,
          details: {
            type: 'reassignment',
            newUserId: action.targetUserId
          }
        };

      case 'add_comment':
        const commentMessage = replacePlaceholders(action.message || '', context);
        console.log(`[Comment] ${commentMessage} en prioridad ${priority._id}`);

        // Crear comentario del sistema
        // Nota: Los workflows no tienen userId directo, usamos el userId de la prioridad
        // o podríamos crear un usuario del sistema
        let commentUserId = priority.userId?._id;

        // Si no hay usuario asignado a la prioridad, intentar usar el creador del workflow
        if (!commentUserId && workflow.createdBy) {
          commentUserId = workflow.createdBy;
        }

        if (!commentUserId) {
          throw new Error('No se puede crear comentario sin usuario válido');
        }

        const comment = await Comment.create({
          priorityId: priority._id,
          userId: commentUserId,
          text: commentMessage,
          isSystemComment: true // Marcar como comentario del sistema
        });

        return {
          success: true,
          details: {
            type: 'comment',
            message: commentMessage,
            commentId: comment._id
          }
        };

      default:
        throw new Error(`Tipo de acción desconocido: ${action.type}`);
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ejecuta un workflow completo
 */
export async function executeWorkflow(
  workflow: IWorkflow,
  context: WorkflowContext
): Promise<{ success: boolean; error?: string; actionsExecuted: any[] }> {
  const startTime = Date.now();
  const actionsExecuted: any[] = [];

  try {
    // Evaluar condiciones
    const conditionsMet = await evaluateConditions(workflow, context);

    if (!conditionsMet) {
      return {
        success: true,
        actionsExecuted: [],
        error: 'Condiciones no cumplidas'
      };
    }

    // Ejecutar todas las acciones
    for (const action of workflow.actions) {
      const result = await executeAction(action, context, workflow);
      actionsExecuted.push({
        type: action.type,
        success: result.success,
        error: result.error,
        details: result.details
      });

      if (!result.success) {
        console.error(`Error ejecutando acción ${action.type}:`, result.error);
      }
    }

    // Registrar ejecución
    const execution = new WorkflowExecution({
      workflowId: workflow._id,
      priorityId: context.priority._id,
      success: true,
      actionsExecuted,
      executedAt: new Date(),
      duration: Date.now() - startTime
    });
    await execution.save();

    // Actualizar estadísticas del workflow
    workflow.executionCount = (workflow.executionCount || 0) + 1;
    workflow.lastExecuted = new Date();
    await workflow.save();

    return {
      success: true,
      actionsExecuted
    };

  } catch (error: any) {
    // Registrar ejecución fallida
    const execution = new WorkflowExecution({
      workflowId: workflow._id,
      priorityId: context.priority._id,
      success: false,
      error: error.message,
      actionsExecuted,
      executedAt: new Date(),
      duration: Date.now() - startTime
    });
    await execution.save();

    return {
      success: false,
      error: error.message,
      actionsExecuted
    };
  }
}

/**
 * Verifica si un workflow ya fue ejecutado para una prioridad (executeOnce)
 */
async function wasExecutedBefore(
  workflowId: mongoose.Types.ObjectId,
  priorityId: mongoose.Types.ObjectId
): Promise<boolean> {
  const execution = await WorkflowExecution.findOne({
    workflowId,
    priorityId,
    success: true
  });
  return !!execution;
}

/**
 * Ejecuta todos los workflows elegibles para una prioridad
 * Usado en eventos de cambio de prioridad
 */
export async function executeWorkflowsForPriority(
  priorityId: string | mongoose.Types.ObjectId,
  triggerType: 'priority_status_change' | 'priority_created' | 'priority_updated' | 'priority_overdue' | 'completion_low' | 'priority_reassigned',
  previousStatus?: string,
  previousCompletion?: number,
  previousUserId?: string,
  newUserId?: string,
  previousOwnerName?: string,
  newOwnerName?: string
): Promise<{ executed: number; errors: number }> {
  await connectDB();

  try {
    // Obtener prioridad
    const priority = await Priority.findById(priorityId)
      .populate('userId')
      .populate('initiativeId');

    if (!priority) {
      console.error(`Prioridad ${priorityId} no encontrada`);
      return { executed: 0, errors: 0 };
    }

    // Buscar workflows activos del tipo correcto
    const workflows = await Workflow.find({
      isActive: true,
      triggerType
    }).sort({ priority: 1 }); // Ejecutar por prioridad

    const context: WorkflowContext = {
      priority,
      previousStatus,
      previousCompletion,
      previousUserId,
      newUserId,
      previousOwnerName,
      newOwnerName
    };

    let executed = 0;
    let errors = 0;

    for (const workflow of workflows) {
      // Verificar si ya fue ejecutado (executeOnce)
      if (workflow.executeOnce) {
        const alreadyExecuted = await wasExecutedBefore(
          workflow._id as mongoose.Types.ObjectId,
          priority._id as mongoose.Types.ObjectId
        );
        if (alreadyExecuted) {
          continue;
        }
      }

      // Ejecutar workflow
      const result = await executeWorkflow(workflow, context);

      if (result.success && result.actionsExecuted.length > 0) {
        executed++;
      } else if (!result.success) {
        errors++;
      }
    }

    return { executed, errors };

  } catch (error) {
    console.error('Error ejecutando workflows:', error);
    return { executed: 0, errors: 1 };
  }
}

/**
 * Ejecución manual de un workflow específico para una prioridad
 */
export async function executeWorkflowManually(
  workflowId: string,
  priorityId: string
): Promise<{ success: boolean; error?: string; actionsExecuted: any[] }> {
  await connectDB();

  try {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return {
        success: false,
        error: 'Workflow no encontrado',
        actionsExecuted: []
      };
    }

    const priority = await Priority.findById(priorityId)
      .populate('userId')
      .populate('initiativeId');

    if (!priority) {
      return {
        success: false,
        error: 'Prioridad no encontrada',
        actionsExecuted: []
      };
    }

    const context: WorkflowContext = { priority };
    return await executeWorkflow(workflow, context);

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      actionsExecuted: []
    };
  }
}

/**
 * Ejecuta todos los workflows elegibles manualmente (para daily_check, weekly_check)
 * Puede ser llamado desde un endpoint admin o un cron externo
 */
export async function executeScheduledWorkflows(
  triggerType: 'daily_check' | 'weekly_check'
): Promise<{ executed: number; errors: number; prioritiesProcessed: number }> {
  await connectDB();

  try {
    // Buscar workflows activos del tipo correcto
    const workflows = await Workflow.find({
      isActive: true,
      triggerType
    }).sort({ priority: 1 });

    if (workflows.length === 0) {
      return { executed: 0, errors: 0, prioritiesProcessed: 0 };
    }

    // Obtener todas las prioridades activas (no completadas)
    const priorities = await Priority.find({
      status: { $ne: 'COMPLETADO' }
    })
      .populate('userId')
      .populate('initiativeId');

    let executed = 0;
    let errors = 0;

    for (const priority of priorities) {
      const context: WorkflowContext = { priority };

      for (const workflow of workflows) {
        // Verificar si ya fue ejecutado (executeOnce)
        if (workflow.executeOnce) {
          const alreadyExecuted = await wasExecutedBefore(
            workflow._id as mongoose.Types.ObjectId,
            priority._id as mongoose.Types.ObjectId
          );
          if (alreadyExecuted) {
            continue;
          }
        }

        const result = await executeWorkflow(workflow, context);

        if (result.success && result.actionsExecuted.length > 0) {
          executed++;
        } else if (!result.success) {
          errors++;
        }
      }
    }

    return {
      executed,
      errors,
      prioritiesProcessed: priorities.length
    };

  } catch (error) {
    console.error('Error ejecutando workflows programados:', error);
    return { executed: 0, errors: 1, prioritiesProcessed: 0 };
  }
}

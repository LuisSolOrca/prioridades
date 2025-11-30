import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import CRMWorkflow, {
  ICRMWorkflow,
  ICRMWorkflowCondition,
  ICRMWorkflowAction,
  CRMTriggerType,
  ConditionOperator
} from '@/models/CRMWorkflow';
import CRMWorkflowExecution, { IActionLog, ExecutionStatus } from '@/models/CRMWorkflowExecution';
import Deal from '@/models/Deal';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import Activity from '@/models/Activity';
import Notification from '@/models/Notification';
import User from '@/models/User';
import EmailTemplate from '@/models/EmailTemplate';
import Priority from '@/models/Priority';
import ChannelMessage from '@/models/ChannelMessage';
import { sendEmail } from '@/lib/email';
import { createTrackedEmail } from '@/lib/emailTracking';
import { replaceTemplateVariables } from '@/lib/templateVariables';

export interface TriggerContext {
  entityType: 'deal' | 'contact' | 'client' | 'activity' | 'quote';
  entityId: mongoose.Types.ObjectId | string;
  entityName?: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  changedFields?: string[];
  userId?: string;
}

// Evaluar una condición individual
function evaluateCondition(
  condition: ICRMWorkflowCondition,
  data: Record<string, any>
): boolean {
  const fieldValue = getNestedValue(data, condition.field);
  const conditionValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return fieldValue === conditionValue;
    case 'not_equals':
      return fieldValue !== conditionValue;
    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue);
    case 'less_than':
      return Number(fieldValue) < Number(conditionValue);
    case 'greater_or_equal':
      return Number(fieldValue) >= Number(conditionValue);
    case 'less_or_equal':
      return Number(fieldValue) <= Number(conditionValue);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case 'starts_with':
      return String(fieldValue).toLowerCase().startsWith(String(conditionValue).toLowerCase());
    case 'ends_with':
      return String(fieldValue).toLowerCase().endsWith(String(conditionValue).toLowerCase());
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'in_list':
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'not_in_list':
      return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
    default:
      return false;
  }
}

// Obtener valor anidado de un objeto (ej: "deal.value")
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Evaluar todas las condiciones de un workflow
function evaluateConditions(
  conditions: ICRMWorkflowCondition[],
  data: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  let result = evaluateCondition(conditions[0], data);

  for (let i = 1; i < conditions.length; i++) {
    const prevCondition = conditions[i - 1];
    const currentResult = evaluateCondition(conditions[i], data);

    if (prevCondition.logicalOperator === 'OR') {
      result = result || currentResult;
    } else {
      result = result && currentResult;
    }
  }

  return result;
}

// Reemplazar variables en texto (usa utilidad compartida)
function replaceVariables(text: string, context: Record<string, any>): string {
  return replaceTemplateVariables(text, context);
}

// Ejecutar una acción individual
async function executeAction(
  action: ICRMWorkflowAction,
  context: Record<string, any>,
  workflowId: mongoose.Types.ObjectId
): Promise<{ success: boolean; result?: any; error?: string }> {
  const config = action.config;

  try {
    switch (action.type) {
      case 'send_notification': {
        let recipientIds: string[] = [];

        if (config.recipientType === 'owner' && context.deal?.ownerId) {
          recipientIds = [context.deal.ownerId.toString()];
        } else if (config.recipientType === 'admin') {
          const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');
          recipientIds = admins.map(a => a._id.toString());
        } else if (config.recipientType === 'specific_user' && config.recipientId) {
          recipientIds = [config.recipientId];
        } else if (config.recipientType === 'all_sales') {
          const salesUsers = await User.find({ isActive: true }).select('_id');
          recipientIds = salesUsers.map(u => u._id.toString());
        }

        const message = replaceVariables(config.message || '', context);

        // Construir título con información del contexto
        let title = 'Automatización CRM';
        if (context.activity) {
          title = `Nueva actividad: ${context.activity.type || 'actividad'}`;
        } else if (context.deal) {
          title = `Deal: ${context.deal.title || 'sin título'}`;
        } else if (context.contact) {
          title = `Contacto: ${context.contact.firstName || ''} ${context.contact.lastName || ''}`;
        } else if (context.client) {
          title = `Cliente: ${context.client.name || 'sin nombre'}`;
        }

        console.log(`[CRM Workflow] Sending notification to ${recipientIds.length} recipients: ${message}`);

        for (const recipientId of recipientIds) {
          try {
            await Notification.create({
              userId: recipientId,
              type: 'WORKFLOW_NOTIFICATION',
              title,
              message: message || 'Se ejecutó una automatización del CRM',
            });
            console.log(`[CRM Workflow] Notification created for user ${recipientId}`);
          } catch (notifError: any) {
            console.error(`[CRM Workflow] Error creating notification for user ${recipientId}:`, notifError.message);
          }
        }

        return { success: true, result: { notificationsSent: recipientIds.length } };
      }

      case 'send_email': {
        const to = config.to;
        let subject: string;
        let bodyHtml: string;
        let templateUsed: string | null = null;

        // Determinar contenido del email (plantilla o manual)
        if (config.useTemplate && config.emailTemplateId) {
          const template = await EmailTemplate.findById(config.emailTemplateId);
          if (!template) {
            return { success: false, error: `Plantilla de email ${config.emailTemplateId} no encontrada` };
          }
          subject = replaceVariables(template.subject, context);
          bodyHtml = replaceVariables(template.body, context);
          templateUsed = template.name;
          console.log(`[CRM Workflow] Using template "${template.name}"`);
        } else {
          subject = replaceVariables(config.subject || '', context);
          const bodyText = replaceVariables(config.body || '', context);
          bodyHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>${bodyText.replace(/\n/g, '<br>')}</p>
            </div>
          `;
        }

        // Determinar destinatario
        let recipientEmail = '';
        let recipientName = '';
        if (to === 'owner' && context.deal?.ownerId) {
          const owner = await User.findById(context.deal.ownerId).select('email name');
          recipientEmail = owner?.email || '';
          recipientName = owner?.name || '';
        } else if (to === 'contact' && context.contact?.email) {
          recipientEmail = context.contact.email;
          recipientName = `${context.contact.firstName || ''} ${context.contact.lastName || ''}`.trim();
        } else if (to === 'client' && context.client?.email) {
          recipientEmail = context.client.email;
          recipientName = context.client.name || '';
        } else if (to && to.includes('@')) {
          recipientEmail = to;
        }

        if (!recipientEmail) {
          return { success: false, error: 'No se pudo determinar el destinatario del email' };
        }

        try {
          // Obtener userId del contexto
          const userId = context.userId || context.deal?.ownerId?.toString() || context.deal?.createdBy?.toString();

          if (!userId) {
            return { success: false, error: 'No se pudo determinar el userId para el tracking' };
          }

          // Crear email con tracking
          const trackedEmail = await createTrackedEmail({
            userId,
            dealId: context.deal?._id,
            contactId: context.contact?._id,
            clientId: context.client?._id,
            subject,
            recipientEmail,
            recipientName,
            bodyHtml
          });

          // Enviar el email
          const result = await sendEmail({
            to: recipientEmail,
            subject,
            html: trackedEmail.html,
            text: bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          });

          console.log(`[CRM Workflow] Email sent to ${recipientEmail}: ${subject} (tracking: ${trackedEmail.trackingId})`);

          return {
            success: true,
            result: {
              to: recipientEmail,
              subject,
              templateUsed,
              messageId: result.messageId,
              trackingId: trackedEmail.trackingId
            }
          };
        } catch (emailError: any) {
          console.error(`[CRM Workflow] Error sending email:`, emailError);
          return { success: false, error: emailError.message };
        }
      }

      case 'create_task': {
        const ActivityModel = (await import('@/models/Activity')).default;

        const title = replaceVariables(config.taskTitle || '', context);
        const description = replaceVariables(config.taskDescription || '', context);

        // Calcular fecha de vencimiento
        let dueDate = new Date();
        if (config.taskDueDate) {
          const match = config.taskDueDate.match(/\+(\d+)\s*(days?|weeks?|months?)/i);
          if (match) {
            const amount = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            if (unit.startsWith('day')) {
              dueDate.setDate(dueDate.getDate() + amount);
            } else if (unit.startsWith('week')) {
              dueDate.setDate(dueDate.getDate() + amount * 7);
            } else if (unit.startsWith('month')) {
              dueDate.setMonth(dueDate.getMonth() + amount);
            }
          }
        }

        // Determinar el creador y asignado
        const creatorId = context.userId || context.deal?.ownerId;
        let assignToId = context.deal?.ownerId || context.userId;
        if (config.taskAssignTo === 'specific_user' && config.taskAssignToId) {
          assignToId = config.taskAssignToId;
        }

        // Determinar clientId - puede venir del contexto o del deal
        const clientId = context.client?._id || context.deal?.clientId || context.activity?.clientId;

        const task = await ActivityModel.create({
          type: 'task',
          title: title || 'Tarea de workflow',
          description,
          dealId: context.deal?._id,
          contactId: context.contact?._id,
          clientId,
          createdBy: creatorId,
          assignedTo: assignToId,
          dueDate,
          isCompleted: false,
        });

        console.log(`[CRM Workflow] Task created: ${task._id}`);
        return { success: true, result: { taskId: task._id } };
      }

      case 'create_activity': {
        const ActivityModel = (await import('@/models/Activity')).default;

        const title = replaceVariables(config.activityTitle || '', context);
        const description = replaceVariables(config.activityDescription || '', context);

        // Determinar el creador
        const creatorId = context.userId || context.deal?.ownerId;

        // Determinar clientId - puede venir del contexto o del deal
        const clientId = context.client?._id || context.deal?.clientId || context.activity?.clientId;

        const newActivity = await ActivityModel.create({
          type: config.activityType || 'note',
          title: title || 'Actividad de workflow',
          description,
          dealId: context.deal?._id,
          contactId: context.contact?._id,
          clientId,
          createdBy: creatorId,
          isCompleted: true, // Las notas y actividades que no son tareas se marcan como completadas
          completedAt: new Date(),
        });

        console.log(`[CRM Workflow] Activity created: ${newActivity._id}`);
        return { success: true, result: { activityId: newActivity._id } };
      }

      case 'update_field': {
        const targetEntity = config.targetEntity || context.entityType;
        const fieldName = config.fieldName;
        const fieldValue = replaceVariables(String(config.fieldValue || ''), context);

        if (!fieldName) {
          return { success: false, error: 'Campo no especificado' };
        }

        switch (targetEntity) {
          case 'deal': {
            const entityId = context.deal?._id;
            if (!entityId) return { success: false, error: 'ID de deal no encontrado' };
            await Deal.findByIdAndUpdate(entityId, { [fieldName]: fieldValue });
            break;
          }
          case 'contact': {
            const entityId = context.contact?._id;
            if (!entityId) return { success: false, error: 'ID de contacto no encontrado' };
            await Contact.findByIdAndUpdate(entityId, { [fieldName]: fieldValue });
            break;
          }
          case 'client': {
            const entityId = context.client?._id || context.deal?.clientId;
            if (!entityId) return { success: false, error: 'ID de cliente no encontrado' };
            await Client.findByIdAndUpdate(entityId, { [fieldName]: fieldValue });
            break;
          }
          default:
            return { success: false, error: 'Entidad no soportada' };
        }

        return { success: true, result: { updated: { [fieldName]: fieldValue } } };
      }

      case 'move_stage': {
        if (!context.deal?._id) {
          return { success: false, error: 'No hay deal para mover de etapa' };
        }

        if (!config.stageId) {
          return { success: false, error: 'Etapa no especificada' };
        }

        await Deal.findByIdAndUpdate(context.deal._id, { stageId: config.stageId });

        return { success: true, result: { newStageId: config.stageId } };
      }

      case 'assign_owner': {
        if (!context.deal?._id) {
          return { success: false, error: 'No hay deal para asignar owner' };
        }

        let newOwnerId = config.newOwnerId;

        if (config.assignmentType === 'round_robin') {
          // Asignar al usuario con menos deals activos
          const users = await User.find({ isActive: true }).select('_id');
          const dealCounts = await Deal.aggregate([
            { $match: { ownerId: { $in: users.map(u => u._id) } } },
            { $group: { _id: '$ownerId', count: { $sum: 1 } } },
            { $sort: { count: 1 } },
          ]);

          if (dealCounts.length > 0) {
            newOwnerId = dealCounts[0]._id.toString();
          } else if (users.length > 0) {
            newOwnerId = users[0]._id.toString();
          }
        } else if (config.assignmentType === 'least_deals') {
          // Similar al round robin
          const users = await User.find({ isActive: true }).select('_id');
          const dealCounts = await Deal.aggregate([
            { $match: { ownerId: { $in: users.map(u => u._id) } } },
            { $group: { _id: '$ownerId', count: { $sum: 1 } } },
            { $sort: { count: 1 } },
          ]);

          if (dealCounts.length > 0) {
            newOwnerId = dealCounts[0]._id.toString();
          }
        }

        if (!newOwnerId) {
          return { success: false, error: 'No se pudo determinar el nuevo owner' };
        }

        await Deal.findByIdAndUpdate(context.deal._id, { ownerId: newOwnerId });

        return { success: true, result: { newOwnerId } };
      }

      case 'add_tag': {
        if (!config.tag) {
          return { success: false, error: 'Tag no especificado' };
        }

        if (context.deal?._id) {
          await Deal.findByIdAndUpdate(context.deal._id, {
            $addToSet: { tags: config.tag },
          });
        } else if (context.contact?._id) {
          await Contact.findByIdAndUpdate(context.contact._id, {
            $addToSet: { tags: config.tag },
          });
        }

        return { success: true, result: { tagAdded: config.tag } };
      }

      case 'remove_tag': {
        if (!config.tag) {
          return { success: false, error: 'Tag no especificado' };
        }

        if (context.deal?._id) {
          await Deal.findByIdAndUpdate(context.deal._id, {
            $pull: { tags: config.tag },
          });
        } else if (context.contact?._id) {
          await Contact.findByIdAndUpdate(context.contact._id, {
            $pull: { tags: config.tag },
          });
        }

        return { success: true, result: { tagRemoved: config.tag } };
      }

      case 'webhook': {
        if (!config.url) {
          return { success: false, error: 'URL no especificada' };
        }

        const url = replaceVariables(config.url, context);
        const method = config.method || 'POST';
        const headers: Record<string, string> = {};

        if (config.headers) {
          for (const [key, value] of Object.entries(config.headers)) {
            headers[key] = replaceVariables(String(value), context);
          }
        }

        let body: string | undefined;
        if (config.payload && method !== 'GET') {
          const payload: Record<string, any> = {};
          for (const [key, value] of Object.entries(config.payload)) {
            payload[key] = replaceVariables(String(value), context);
          }
          body = JSON.stringify(payload);
        }

        try {
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body,
          });

          return {
            success: response.ok,
            result: {
              status: response.status,
              statusText: response.statusText,
            },
          };
        } catch (fetchError: any) {
          return { success: false, error: fetchError.message };
        }
      }

      case 'delay': {
        // Delays se manejan en el executor principal
        const delayMs = (config.delayMinutes || 0) * 60 * 1000;
        return { success: true, result: { delayMs } };
      }

      case 'create_priority': {
        const title = replaceVariables(config.priorityTitle || '', context);
        const description = replaceVariables(config.priorityDescription || '', context);

        // Calcular weekStart y weekEnd según el offset
        const weekOffset = config.priorityWeekOffset || 0;
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar al lunes

        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset + (weekOffset * 7));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 4); // Viernes
        weekEnd.setHours(23, 59, 59, 999);

        // Determinar usuario asignado
        let assignedUserId: string | undefined;
        if (config.priorityAssignTo === 'deal_owner' && context.deal?.ownerId) {
          assignedUserId = context.deal.ownerId.toString();
        } else if (config.priorityAssignTo === 'specific_user' && config.priorityAssignToId) {
          assignedUserId = config.priorityAssignToId;
        } else if (config.priorityAssignTo === 'trigger_user' && context.userId) {
          assignedUserId = context.userId;
        }

        if (!assignedUserId) {
          return { success: false, error: 'No se pudo determinar el usuario para la prioridad' };
        }

        // Determinar cliente
        let clientId: string | undefined;
        if (config.priorityClientSource === 'deal_client' && context.deal?.clientId) {
          clientId = typeof context.deal.clientId === 'object'
            ? context.deal.clientId._id?.toString()
            : context.deal.clientId?.toString();
        } else if (config.priorityClientSource === 'specific_client' && config.priorityClientId) {
          clientId = config.priorityClientId;
        } else if (context.client?._id) {
          clientId = context.client._id.toString();
        }

        if (!clientId) {
          return { success: false, error: 'No se pudo determinar el cliente para la prioridad' };
        }

        // Determinar iniciativas (requerido)
        const initiativeIds = config.priorityInitiativeIds || [];
        if (initiativeIds.length === 0) {
          return { success: false, error: 'Se requiere al menos una iniciativa estratégica' };
        }

        try {
          const priority = await Priority.create({
            title: title || 'Prioridad de workflow',
            description,
            weekStart,
            weekEnd,
            status: config.priorityStatus || 'EN_TIEMPO',
            type: config.priorityType || 'OPERATIVA',
            completionPercentage: 0,
            userId: assignedUserId,
            clientId,
            projectId: config.priorityProjectId || undefined,
            initiativeIds: initiativeIds.map(id => new mongoose.Types.ObjectId(id)),
            checklist: [],
            evidenceLinks: [],
          });

          console.log(`[CRM Workflow] Priority created: ${priority._id}`);
          return { success: true, result: { priorityId: priority._id, title: priority.title } };
        } catch (priorityError: any) {
          console.error(`[CRM Workflow] Error creating priority:`, priorityError);
          return { success: false, error: priorityError.message };
        }
      }

      case 'send_channel_message': {
        const content = replaceVariables(config.channelMessageContent || '', context);

        if (!config.channelProjectId) {
          return { success: false, error: 'Proyecto no especificado para el mensaje de canal' };
        }

        if (!config.channelId) {
          return { success: false, error: 'Canal no especificado para el mensaje' };
        }

        if (!content.trim()) {
          return { success: false, error: 'El contenido del mensaje no puede estar vacío' };
        }

        // Determinar el usuario que envía (bot/sistema o usuario del trigger)
        const senderId = context.userId || context.deal?.ownerId?.toString() || context.deal?.createdBy?.toString();

        if (!senderId) {
          return { success: false, error: 'No se pudo determinar el remitente del mensaje' };
        }

        try {
          // Extraer tags del contenido si existen
          const extractedTags: string[] = [];
          const tagMatches = content.match(/#\w+/g);
          if (tagMatches) {
            tagMatches.forEach(tag => extractedTags.push(tag.slice(1).toLowerCase()));
          }

          // Combinar tags configurados con los extraídos
          const allTags = [...new Set([...(config.channelMessageTags || []), ...extractedTags])];

          const message = await ChannelMessage.create({
            projectId: config.channelProjectId,
            channelId: config.channelId,
            userId: senderId,
            content,
            tags: allTags,
            mentions: [],
            priorityMentions: [],
            attachments: [],
            reactions: [],
            threadDepth: 0,
            replyCount: 0,
            isPinned: false,
            isEdited: false,
            isDeleted: false,
          });

          console.log(`[CRM Workflow] Channel message created: ${message._id} in channel ${config.channelId}`);
          return {
            success: true,
            result: {
              messageId: message._id,
              channelId: config.channelId,
              projectId: config.channelProjectId
            }
          };
        } catch (messageError: any) {
          console.error(`[CRM Workflow] Error creating channel message:`, messageError);
          return { success: false, error: messageError.message };
        }
      }

      default:
        return { success: false, error: `Tipo de acción no soportado: ${action.type}` };
    }
  } catch (error: any) {
    console.error(`Error executing action ${action.type}:`, error);
    return { success: false, error: error.message };
  }
}

// Disparar workflows para un evento específico
export async function triggerWorkflows(
  triggerType: CRMTriggerType,
  context: TriggerContext
): Promise<void> {
  try {
    // Asegurar conexión a la base de datos
    await connectDB();

    console.log(`[CRM Workflow] Trigger received: ${triggerType} for ${context.entityType} ${context.entityId}`);

    // Buscar workflows activos con este trigger
    const workflows = await CRMWorkflow.find({
      isActive: true,
      'trigger.type': triggerType,
    }).lean();

    console.log(`[CRM Workflow] Found ${workflows.length} active workflows for trigger ${triggerType}`);

    if (workflows.length === 0) return;

    // Construir datos completos del contexto
    const fullContext: Record<string, any> = {
      entityType: context.entityType,
      entityId: context.entityId,
      entityName: context.entityName,
      previousData: context.previousData,
      newData: context.newData,
      changedFields: context.changedFields,
      userId: context.userId,
    };

    // Cargar datos de la entidad
    switch (context.entityType) {
      case 'deal':
        fullContext.deal = await Deal.findById(context.entityId)
          .populate('clientId')
          .populate('contactId')
          .populate('stageId')
          .populate('ownerId', 'name email')
          .populate('createdBy', 'name email')
          .lean();
        if (fullContext.deal?.clientId) {
          fullContext.client = fullContext.deal.clientId;
        }
        if (fullContext.deal?.contactId) {
          fullContext.contact = fullContext.deal.contactId;
        }
        break;
      case 'contact':
        fullContext.contact = await Contact.findById(context.entityId)
          .populate('clientId')
          .populate('createdBy', 'name email')
          .lean();
        if (fullContext.contact?.clientId) {
          fullContext.client = fullContext.contact.clientId;
        }
        break;
      case 'client':
        fullContext.client = await Client.findById(context.entityId).lean();
        break;
      case 'activity':
        fullContext.activity = await Activity.findById(context.entityId)
          .populate('dealId')
          .populate('clientId')
          .populate('contactId')
          .populate('createdBy', 'name email')
          .populate('assignedTo', 'name email')
          .lean();
        if (fullContext.activity?.dealId) {
          fullContext.deal = fullContext.activity.dealId;
        }
        if (fullContext.activity?.clientId) {
          fullContext.client = fullContext.activity.clientId;
        }
        if (fullContext.activity?.contactId) {
          fullContext.contact = fullContext.activity.contactId;
        }
        break;
    }

    // Procesar cada workflow
    for (const workflow of workflows) {
      console.log(`[CRM Workflow] Evaluating workflow: ${workflow.name} (${workflow._id})`);
      console.log(`[CRM Workflow] Conditions: ${JSON.stringify(workflow.trigger.conditions)}`);

      // Evaluar condiciones
      const conditionsMet = evaluateConditions(workflow.trigger.conditions, fullContext);
      console.log(`[CRM Workflow] Conditions met: ${conditionsMet}`);

      if (!conditionsMet) {
        console.log(`[CRM Workflow] Skipping workflow ${workflow.name} - conditions not met`);
        continue;
      }

      console.log(`[CRM Workflow] Executing workflow: ${workflow.name}`);
      console.log(`[CRM Workflow] Actions to execute: ${workflow.actions.length}`);

      // Crear registro de ejecución
      const execution = await CRMWorkflowExecution.create({
        workflowId: workflow._id,
        workflowName: workflow.name,
        triggerType,
        triggerData: {
          entityType: context.entityType,
          entityId: context.entityId,
          entityName: context.entityName,
          previousData: context.previousData,
          newData: context.newData,
          changedFields: context.changedFields,
        },
        status: 'running',
        startedAt: new Date(),
        actionLogs: workflow.actions.map(a => ({
          actionId: a.id,
          actionType: a.type,
          status: 'pending' as ExecutionStatus,
        })),
      });

      const startTime = Date.now();

      try {
        // Ordenar acciones por order
        const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order);

        // Ejecutar acciones en orden
        for (const action of sortedActions) {
          // Aplicar delay si existe
          const totalDelay = (action.delay || 0) * 60 * 1000;
          if (totalDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, Math.min(totalDelay, 5000))); // Max 5s para no bloquear
          }

          // Actualizar estado a running
          await CRMWorkflowExecution.updateOne(
            { _id: execution._id, 'actionLogs.actionId': action.id },
            {
              $set: {
                'actionLogs.$.status': 'running',
                'actionLogs.$.startedAt': new Date(),
              },
            }
          );

          // Ejecutar acción
          const result = await executeAction(action, fullContext, workflow._id as mongoose.Types.ObjectId);

          // Actualizar log de acción
          await CRMWorkflowExecution.updateOne(
            { _id: execution._id, 'actionLogs.actionId': action.id },
            {
              $set: {
                'actionLogs.$.status': result.success ? 'completed' : 'failed',
                'actionLogs.$.completedAt': new Date(),
                'actionLogs.$.result': result.result,
                'actionLogs.$.error': result.error,
              },
            }
          );

          // Si falla una acción, marcar workflow como failed y salir
          if (!result.success) {
            await CRMWorkflowExecution.findByIdAndUpdate(execution._id, {
              status: 'failed',
              completedAt: new Date(),
              duration: Date.now() - startTime,
              error: result.error,
            });
            break;
          }
        }

        // Si llegamos aquí, todo fue exitoso
        const finalExecution = await CRMWorkflowExecution.findById(execution._id);
        const allCompleted = finalExecution?.actionLogs.every(l => l.status === 'completed');

        if (allCompleted) {
          await CRMWorkflowExecution.findByIdAndUpdate(execution._id, {
            status: 'completed',
            completedAt: new Date(),
            duration: Date.now() - startTime,
          });

          // Actualizar contador del workflow
          await CRMWorkflow.findByIdAndUpdate(workflow._id, {
            $inc: { executionCount: 1 },
            lastExecutedAt: new Date(),
          });
        }
      } catch (execError: any) {
        console.error(`Error executing workflow ${workflow.name}:`, execError);
        await CRMWorkflowExecution.findByIdAndUpdate(execution._id, {
          status: 'failed',
          completedAt: new Date(),
          duration: Date.now() - startTime,
          error: execError.message,
          errorStack: execError.stack,
        });
      }
    }
  } catch (error) {
    console.error('Error in triggerWorkflows:', error);
  }
}

// Helper para disparar desde APIs de forma no bloqueante
// IMPORTANTE: En Vercel serverless, setImmediate puede no ejecutarse después de enviar la respuesta
// Usamos Promise.resolve().then() que es más confiable en estos entornos
export function triggerWorkflowsAsync(
  triggerType: CRMTriggerType,
  context: TriggerContext
): void {
  // Ejecutar en el mismo tick pero sin bloquear
  Promise.resolve().then(() => {
    triggerWorkflows(triggerType, context).catch(err => {
      console.error('Background workflow trigger error:', err);
    });
  });
}

// Helper para ejecutar workflows de forma síncrona (recomendado para serverless)
export async function triggerWorkflowsSync(
  triggerType: CRMTriggerType,
  context: TriggerContext
): Promise<void> {
  try {
    await triggerWorkflows(triggerType, context);
  } catch (err) {
    console.error('Workflow trigger error:', err);
  }
}

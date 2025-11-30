import mongoose from 'mongoose';
import EmailSequence, { IEmailSequence, IEmailSequenceStep } from '@/models/EmailSequence';
import SequenceEnrollment, { ISequenceEnrollment } from '@/models/SequenceEnrollment';
import EmailTemplate from '@/models/EmailTemplate';
import Contact from '@/models/Contact';
import Deal from '@/models/Deal';
import Client from '@/models/Client';
import Activity from '@/models/Activity';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';
import { createTrackedEmail } from '@/lib/emailTracking';

interface ProcessResult {
  processed: number;
  errors: number;
  details: {
    enrollmentId: string;
    contactId: string;
    stepOrder: number;
    result: 'success' | 'error' | 'skipped';
    message?: string;
  }[];
}

/**
 * Calculate the next step time based on sequence configuration
 */
function calculateNextStepTime(
  sequence: IEmailSequence,
  step: IEmailSequenceStep,
  baseTime: Date = new Date()
): Date {
  const nextTime = new Date(baseTime);

  // Add delay
  nextTime.setDate(nextTime.getDate() + step.delayDays);
  nextTime.setHours(nextTime.getHours() + (step.delayHours || 0));

  // Adjust for sending hours
  const { start, end } = sequence.sendingHours;
  const hour = nextTime.getHours();

  if (hour < start) {
    nextTime.setHours(start, 0, 0, 0);
  } else if (hour >= end) {
    // Move to next day
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(start, 0, 0, 0);
  }

  // Adjust for weekends if not allowed
  if (!sequence.sendOnWeekends) {
    const day = nextTime.getDay();
    if (day === 0) { // Sunday
      nextTime.setDate(nextTime.getDate() + 1);
    } else if (day === 6) { // Saturday
      nextTime.setDate(nextTime.getDate() + 2);
    }
  }

  return nextTime;
}

/**
 * Replace template variables with actual data
 */
async function replaceVariables(
  text: string,
  data: {
    contact?: any;
    client?: any;
    deal?: any;
    user?: any;
  }
): Promise<string> {
  let result = text;

  // Contact variables
  if (data.contact) {
    result = result.replace(/\{\{contact\.firstName\}\}/g, data.contact.firstName || '');
    result = result.replace(/\{\{contact\.lastName\}\}/g, data.contact.lastName || '');
    result = result.replace(/\{\{contact\.fullName\}\}/g,
      `${data.contact.firstName || ''} ${data.contact.lastName || ''}`.trim());
    result = result.replace(/\{\{contact\.email\}\}/g, data.contact.email || '');
    result = result.replace(/\{\{contact\.phone\}\}/g, data.contact.phone || '');
    result = result.replace(/\{\{contact\.position\}\}/g, data.contact.position || '');
  }

  // Client variables
  if (data.client) {
    result = result.replace(/\{\{client\.name\}\}/g, data.client.name || '');
    result = result.replace(/\{\{client\.industry\}\}/g, data.client.industry || '');
    result = result.replace(/\{\{client\.website\}\}/g, data.client.website || '');
  }

  // Deal variables
  if (data.deal) {
    result = result.replace(/\{\{deal\.title\}\}/g, data.deal.title || '');
    result = result.replace(/\{\{deal\.value\}\}/g,
      data.deal.value
        ? new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: data.deal.currency || 'MXN',
          }).format(data.deal.value)
        : ''
    );
    result = result.replace(/\{\{deal\.stage\}\}/g, data.deal.stageId?.name || '');
  }

  // User variables
  if (data.user) {
    result = result.replace(/\{\{user\.name\}\}/g, data.user.name || '');
    result = result.replace(/\{\{user\.email\}\}/g, data.user.email || '');
    result = result.replace(/\{\{user\.phone\}\}/g, data.user.phone || '');
    result = result.replace(/\{\{user\.signature\}\}/g, data.user.signature || '');
  }

  // Date variables
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const dateFormat = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });
  result = result.replace(/\{\{today\}\}/g, dateFormat.format(today));
  result = result.replace(/\{\{tomorrow\}\}/g, dateFormat.format(tomorrow));
  result = result.replace(/\{\{nextWeek\}\}/g, dateFormat.format(nextWeek));

  return result;
}

/**
 * Process a single enrollment step
 */
async function processEnrollmentStep(
  enrollment: ISequenceEnrollment,
  sequence: IEmailSequence,
  step: IEmailSequenceStep,
  userId: mongoose.Types.ObjectId
): Promise<{ success: boolean; message?: string }> {
  const contact = await Contact.findById(enrollment.contactId);
  const client = enrollment.clientId ? await Client.findById(enrollment.clientId) : null;
  const deal = enrollment.dealId ? await Deal.findById(enrollment.dealId).populate('stageId') : null;

  if (!contact) {
    return { success: false, message: 'Contacto no encontrado' };
  }

  const templateData = { contact, client, deal, user: null }; // TODO: Get user data

  switch (step.type) {
    case 'email': {
      let subject = step.subject || '';
      let body = step.body || '';

      // Use template if specified
      if (step.templateId) {
        const template = await EmailTemplate.findById(step.templateId);
        if (template) {
          subject = template.subject;
          body = template.body;
          // Update template usage
          await EmailTemplate.findByIdAndUpdate(step.templateId, {
            $inc: { usageCount: 1 },
            lastUsedAt: new Date(),
          });
        }
      }

      // Replace variables
      subject = await replaceVariables(subject, templateData);
      body = await replaceVariables(body, templateData);

      // Verificar que el contacto tenga email
      if (!contact.email) {
        return { success: false, message: 'El contacto no tiene email configurado' };
      }

      // Crear actividad para tracking
      const activity = await Activity.create({
        type: 'email',
        title: `Secuencia: ${subject}`,
        description: body,
        contactId: contact._id,
        dealId: enrollment.dealId,
        clientId: enrollment.clientId,
        createdBy: userId,
        isCompleted: true,
        completedAt: new Date(),
      });

      // Preparar el HTML del email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${body.replace(/\n/g, '<br>')}
        </div>
      `;

      // Crear email con tracking (pixel de apertura y tracking de links)
      const trackedEmail = await createTrackedEmail({
        activityId: activity._id,
        dealId: enrollment.dealId,
        contactId: contact._id,
        clientId: enrollment.clientId,
        userId: userId,
        sequenceEnrollmentId: enrollment._id,
        subject: subject,
        recipientEmail: contact.email,
        recipientName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        bodyHtml: emailHtml,
      });

      // Enviar el email con tracking
      const emailResult = await sendEmail({
        to: contact.email,
        subject: subject,
        html: trackedEmail.html, // HTML con pixel de tracking incluido
      });

      if (!emailResult.success) {
        // Si falla el envío, eliminar la actividad creada
        await Activity.findByIdAndDelete(activity._id);
        return { success: false, message: 'Error al enviar email: ' + (emailResult.error || 'Error desconocido') };
      }

      // Update enrollment metrics
      await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
        $inc: { emailsSent: 1 },
        $push: {
          completedSteps: {
            step: step.order,
            type: 'email',
            completedAt: new Date(),
            result: 'sent',
            taskId: activity._id,
          },
        },
      });

      return { success: true, message: `Email enviado a ${contact.email} (tracking: ${trackedEmail.trackingId})` };
    }

    case 'task': {
      const taskTitle = await replaceVariables(step.taskTitle || 'Tarea de secuencia', templateData);
      const taskDescription = await replaceVariables(step.taskDescription || '', templateData);

      const activity = await Activity.create({
        type: 'task',
        title: taskTitle,
        description: taskDescription,
        contactId: contact._id,
        dealId: enrollment.dealId,
        clientId: enrollment.clientId,
        createdBy: userId,
        assignedTo: userId,
        isCompleted: false,
        dueDate: new Date(),
      });

      await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
        $inc: { tasksCreated: 1 },
        $push: {
          completedSteps: {
            step: step.order,
            type: 'task',
            completedAt: new Date(),
            result: 'task_created',
            taskId: activity._id,
          },
        },
      });

      return { success: true, message: 'Tarea creada' };
    }

    case 'linkedin': {
      // Create a task for manual LinkedIn action
      const linkedinActions: Record<string, string> = {
        connect: 'Enviar solicitud de conexión en LinkedIn',
        message: 'Enviar mensaje en LinkedIn',
        view_profile: 'Ver perfil de LinkedIn',
      };

      const activity = await Activity.create({
        type: 'task',
        title: linkedinActions[step.linkedinAction || 'connect'],
        description: step.linkedinMessage || `Acción de LinkedIn para ${contact.firstName} ${contact.lastName}`,
        contactId: contact._id,
        dealId: enrollment.dealId,
        clientId: enrollment.clientId,
        createdBy: userId,
        assignedTo: userId,
        isCompleted: false,
        dueDate: new Date(),
      });

      await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
        $inc: { tasksCreated: 1 },
        $push: {
          completedSteps: {
            step: step.order,
            type: 'linkedin',
            completedAt: new Date(),
            result: 'task_created',
            taskId: activity._id,
          },
        },
      });

      return { success: true, message: 'Tarea de LinkedIn creada' };
    }

    default:
      return { success: false, message: 'Tipo de paso no soportado' };
  }
}

/**
 * Process all pending sequence steps
 */
export async function processSequenceSteps(): Promise<ProcessResult> {
  await connectDB();

  const result: ProcessResult = {
    processed: 0,
    errors: 0,
    details: [],
  };

  const now = new Date();

  // Find all active enrollments with steps due
  const pendingEnrollments = await SequenceEnrollment.find({
    status: 'active',
    nextStepAt: { $lte: now },
  }).limit(100); // Process in batches

  for (const enrollment of pendingEnrollments) {
    try {
      const sequence = await EmailSequence.findById(enrollment.sequenceId);
      if (!sequence || !sequence.isActive) {
        // Sequence was deactivated, pause the enrollment
        await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
          status: 'paused',
          pausedAt: now,
        });
        continue;
      }

      const currentStep = sequence.steps.find(s => s.order === enrollment.currentStep);
      if (!currentStep) {
        // No more steps, complete the enrollment
        await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
          status: 'completed',
        });
        await EmailSequence.findByIdAndUpdate(sequence._id, {
          $inc: { activeEnrolled: -1, completedCount: 1 },
        });
        continue;
      }

      // Process the current step
      const stepResult = await processEnrollmentStep(
        enrollment,
        sequence,
        currentStep,
        enrollment.enrolledBy
      );

      if (stepResult.success) {
        result.processed++;

        // Check for next step
        const nextStep = sequence.steps.find(s => s.order === enrollment.currentStep + 1);
        if (nextStep) {
          const nextStepAt = calculateNextStepTime(sequence, nextStep);
          await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
            currentStep: enrollment.currentStep + 1,
            nextStepAt,
          });
        } else {
          // No more steps, complete
          await SequenceEnrollment.findByIdAndUpdate(enrollment._id, {
            status: 'completed',
            nextStepAt: null,
          });
          await EmailSequence.findByIdAndUpdate(sequence._id, {
            $inc: { activeEnrolled: -1, completedCount: 1 },
          });
        }

        result.details.push({
          enrollmentId: enrollment._id.toString(),
          contactId: enrollment.contactId.toString(),
          stepOrder: currentStep.order,
          result: 'success',
          message: stepResult.message,
        });
      } else {
        result.errors++;
        result.details.push({
          enrollmentId: enrollment._id.toString(),
          contactId: enrollment.contactId.toString(),
          stepOrder: currentStep.order,
          result: 'error',
          message: stepResult.message,
        });
      }
    } catch (error: any) {
      result.errors++;
      result.details.push({
        enrollmentId: enrollment._id.toString(),
        contactId: enrollment.contactId.toString(),
        stepOrder: enrollment.currentStep,
        result: 'error',
        message: error.message,
      });
    }
  }

  return result;
}

/**
 * Check for exit conditions (reply, meeting, deal status)
 */
export async function checkExitConditions(
  enrollmentId: string,
  event: 'email_replied' | 'meeting_scheduled' | 'deal_won' | 'deal_lost'
): Promise<boolean> {
  await connectDB();

  const enrollment = await SequenceEnrollment.findById(enrollmentId);
  if (!enrollment || enrollment.status !== 'active') {
    return false;
  }

  const sequence = await EmailSequence.findById(enrollment.sequenceId);
  if (!sequence) {
    return false;
  }

  let shouldExit = false;
  let exitReason = '';

  switch (event) {
    case 'email_replied':
      if (sequence.exitOnReply) {
        shouldExit = true;
        exitReason = 'Contacto respondió al email';
        await SequenceEnrollment.findByIdAndUpdate(enrollmentId, {
          $inc: { emailsReplied: 1 },
        });
      }
      break;
    case 'meeting_scheduled':
      if (sequence.exitOnMeeting) {
        shouldExit = true;
        exitReason = 'Reunión agendada';
      }
      break;
    case 'deal_won':
      if (sequence.exitOnDealWon) {
        shouldExit = true;
        exitReason = 'Deal ganado';
      }
      break;
    case 'deal_lost':
      if (sequence.exitOnDealLost) {
        shouldExit = true;
        exitReason = 'Deal perdido';
      }
      break;
  }

  if (shouldExit) {
    await SequenceEnrollment.findByIdAndUpdate(enrollmentId, {
      status: 'exited',
      exitReason,
      exitedAt: new Date(),
    });
    await EmailSequence.findByIdAndUpdate(sequence._id, {
      $inc: { activeEnrolled: -1 },
    });
    return true;
  }

  return false;
}

/**
 * Update enrollment email metrics (called from email tracking)
 */
export async function updateEnrollmentEmailMetrics(
  enrollmentId: string,
  event: 'opened' | 'clicked' | 'replied'
): Promise<void> {
  await connectDB();

  const update: any = {};
  switch (event) {
    case 'opened':
      update.$inc = { emailsOpened: 1 };
      break;
    case 'clicked':
      update.$inc = { emailsClicked: 1 };
      break;
    case 'replied':
      update.$inc = { emailsReplied: 1 };
      await checkExitConditions(enrollmentId, 'email_replied');
      break;
  }

  if (Object.keys(update).length > 0) {
    await SequenceEnrollment.findByIdAndUpdate(enrollmentId, update);
  }
}

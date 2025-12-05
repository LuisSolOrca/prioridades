import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MarketingAutomation, { TriggerType, IExecutionLog } from '@/models/MarketingAutomation';
import Contact from '@/models/Contact';
import EmailTemplate from '@/models/EmailTemplate';
import { sendEmail } from '@/lib/resend';
import mongoose from 'mongoose';

interface TriggerPayload {
  type: TriggerType;
  contactId?: string;
  dealId?: string;
  data?: Record<string, any>;
  // Specific trigger data
  formId?: string;
  landingPageId?: string;
  campaignId?: string;
  tagName?: string;
  stageId?: string;
  webhookKey?: string;
}

// POST - Trigger automation
export async function POST(request: NextRequest) {
  try {
    const body: TriggerPayload = await request.json();
    const { type, contactId, dealId, data } = body;

    if (!type) {
      return NextResponse.json({ error: 'Tipo de trigger requerido' }, { status: 400 });
    }

    await connectDB();

    // Find matching automations
    const query: Record<string, any> = {
      'trigger.type': type,
      status: 'active',
      isActive: true,
    };

    // Add specific trigger filters
    if (body.formId) {
      query['trigger.config.formId'] = body.formId;
    }
    if (body.landingPageId) {
      query['trigger.config.landingPageId'] = body.landingPageId;
    }
    if (body.campaignId) {
      query['trigger.config.campaignId'] = body.campaignId;
    }
    if (body.tagName) {
      query['trigger.config.tagName'] = body.tagName;
    }
    if (body.stageId) {
      query['trigger.config.stageId'] = body.stageId;
    }
    if (body.webhookKey) {
      query['trigger.config.webhookKey'] = body.webhookKey;
    }

    const automations = await MarketingAutomation.find(query);

    if (automations.length === 0) {
      return NextResponse.json({
        message: 'No hay automatizaciones que coincidan',
        triggered: 0,
      });
    }

    const results = [];

    for (const automation of automations) {
      try {
        // Check re-entry rules if contact is already enrolled
        if (contactId && !automation.settings.allowReentry) {
          const alreadyEnrolled = automation.enrolledContacts.some(
            (ec) => ec.contactId.toString() === contactId
          );
          if (alreadyEnrolled) {
            results.push({
              automationId: automation._id,
              status: 'skipped',
              reason: 'Contact already enrolled and re-entry not allowed',
            });
            continue;
          }
        }

        // Check max executions
        if (
          automation.settings.maxExecutions &&
          automation.stats.totalExecutions >= automation.settings.maxExecutions
        ) {
          results.push({
            automationId: automation._id,
            status: 'skipped',
            reason: 'Max executions reached',
          });
          continue;
        }

        // Create execution log
        const executionLog: IExecutionLog = {
          triggeredAt: new Date(),
          triggeredBy: {
            type: contactId ? 'contact' : dealId ? 'deal' : 'system',
            id: contactId || dealId,
          },
          status: 'running',
          actionsExecuted: [],
        };

        // Enroll contact
        if (contactId) {
          automation.enrolledContacts.push({
            contactId: new mongoose.Types.ObjectId(contactId),
            enrolledAt: new Date(),
            currentActionId: automation.actions[0]?.id,
          });
        }

        // Execute actions with branching support
        const contact = contactId ? await Contact.findById(contactId).lean() : null;

        // Recursive function to execute actions with branching
        async function executeActionsWithBranching(
          actionIds: string[],
          allActions: any[]
        ): Promise<{ success: boolean; stopped: boolean }> {
          for (const actionId of actionIds) {
            const action = allActions.find((a: any) => a.id === actionId);
            if (!action) continue;

            try {
              const actionResult = await executeAction(action, contact, data);
              executionLog.actionsExecuted.push({
                actionId: action.id,
                status: 'success',
                executedAt: new Date(),
                result: actionResult,
              });

              // Handle wait action
              if (action.type === 'wait' && contactId) {
                const waitMs = calculateWaitTime(
                  action.config.waitDuration || 0,
                  action.config.waitUnit || 'hours'
                );
                const enrolledIdx = automation.enrolledContacts.findIndex(
                  (ec: any) => ec.contactId.toString() === contactId
                );
                if (enrolledIdx >= 0) {
                  automation.enrolledContacts[enrolledIdx].waitUntil = new Date(
                    Date.now() + waitMs
                  );
                  automation.enrolledContacts[enrolledIdx].currentActionId = action.nextActionId;
                }
                return { success: true, stopped: true }; // Stop execution, will resume after wait
              }

              // Handle condition branching
              if (action.type === 'condition') {
                const conditionResult = evaluateConditions(
                  action.config.conditions || [],
                  action.config.conditionOperator || 'AND',
                  contact,
                  data
                );
                const branchToExecute = conditionResult
                  ? action.config.trueBranch || []
                  : action.config.falseBranch || [];

                if (branchToExecute.length > 0) {
                  const branchResult = await executeActionsWithBranching(branchToExecute, allActions);
                  if (!branchResult.success || branchResult.stopped) {
                    return branchResult;
                  }
                }
              }

              // Handle split A/B testing
              if (action.type === 'split') {
                const percentageA = action.config.splitPercentageA ?? 50;
                const random = Math.random() * 100;
                const selectedBranch = random < percentageA ? 'A' : 'B';
                const branchToExecute = selectedBranch === 'A'
                  ? action.config.splitBranchA || []
                  : action.config.splitBranchB || [];

                // Log the split decision
                executionLog.actionsExecuted[executionLog.actionsExecuted.length - 1].result = {
                  ...actionResult,
                  selectedBranch,
                  percentageA,
                };

                if (branchToExecute.length > 0) {
                  const branchResult = await executeActionsWithBranching(branchToExecute, allActions);
                  if (!branchResult.success || branchResult.stopped) {
                    return branchResult;
                  }
                }
              }

              // Handle go_to action
              if (action.type === 'go_to' && action.config.goToActionId) {
                const goToResult = await executeActionsWithBranching(
                  [action.config.goToActionId],
                  allActions
                );
                return goToResult;
              }

            } catch (actionError: any) {
              executionLog.actionsExecuted.push({
                actionId: action.id,
                status: 'failed',
                executedAt: new Date(),
                error: actionError.message,
              });
              return { success: false, stopped: false };
            }
          }
          return { success: true, stopped: false };
        }

        // Get main actions (without parentActionId or with branchType 'main')
        const mainActions = automation.actions
          .filter((a: any) => !a.parentActionId || a.branchType === 'main')
          .map((a: any) => a.id);

        await executeActionsWithBranching(mainActions, automation.actions);

        // Update execution log status
        executionLog.status = executionLog.actionsExecuted.some((a) => a.status === 'failed')
          ? 'failed'
          : 'completed';
        executionLog.completedAt = new Date();

        // Update automation stats
        automation.stats.totalExecutions += 1;
        if (executionLog.status === 'completed') {
          automation.stats.successfulExecutions += 1;
        } else {
          automation.stats.failedExecutions += 1;
        }
        automation.stats.lastExecutedAt = new Date();
        automation.stats.contactsEnrolled = automation.enrolledContacts.length;

        // Add execution log
        automation.executionLogs.push(executionLog);

        await automation.save();

        results.push({
          automationId: automation._id,
          name: automation.name,
          status: executionLog.status,
          actionsExecuted: executionLog.actionsExecuted.length,
        });
      } catch (automationError: any) {
        results.push({
          automationId: automation._id,
          status: 'error',
          error: automationError.message,
        });
      }
    }

    return NextResponse.json({
      message: `${results.length} automatizaciones procesadas`,
      triggered: results.filter((r) => r.status === 'completed').length,
      results,
    });
  } catch (error: any) {
    console.error('Error triggering automations:', error);
    return NextResponse.json(
      { error: error.message || 'Error al ejecutar automatizaciones' },
      { status: 500 }
    );
  }
}

// Execute a single action
async function executeAction(
  action: any,
  contact: any,
  data?: Record<string, any>
): Promise<any> {
  switch (action.type) {
    case 'send_email':
      if (contact?.email && action.config.emailTemplateId) {
        const template = await EmailTemplate.findById(action.config.emailTemplateId);
        if (template) {
          // Replace variables in template
          let subject = template.subject;
          let body = template.body;

          if (contact) {
            subject = subject.replace(/\{\{contact\.(\w+)\}\}/g, (_, key) => contact[key] || '');
            body = body.replace(/\{\{contact\.(\w+)\}\}/g, (_, key) => contact[key] || '');
          }

          await sendEmail({
            to: contact.email,
            from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
            subject,
            html: body,
          });

          return { sent: true, to: contact.email };
        }
      }
      return { sent: false, reason: 'Missing email or template' };

    case 'add_tag':
      if (contact && action.config.tagName) {
        await Contact.findByIdAndUpdate(contact._id, {
          $addToSet: { tags: action.config.tagName },
        });
        return { tagAdded: action.config.tagName };
      }
      return { tagAdded: false };

    case 'remove_tag':
      if (contact && action.config.tagName) {
        await Contact.findByIdAndUpdate(contact._id, {
          $pull: { tags: action.config.tagName },
        });
        return { tagRemoved: action.config.tagName };
      }
      return { tagRemoved: false };

    case 'update_contact':
      if (contact && action.config.fields) {
        await Contact.findByIdAndUpdate(contact._id, {
          $set: action.config.fields,
        });
        return { updated: true, fields: Object.keys(action.config.fields) };
      }
      return { updated: false };

    case 'wait':
      return {
        waiting: true,
        duration: action.config.waitDuration,
        unit: action.config.waitUnit,
      };

    case 'webhook':
      if (action.config.webhookUrl) {
        const response = await fetch(action.config.webhookUrl, {
          method: action.config.webhookMethod || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...action.config.webhookHeaders,
          },
          body: action.config.webhookBody
            ? replaceVariables(action.config.webhookBody, contact, data)
            : JSON.stringify({ contact, data }),
        });
        return { status: response.status, ok: response.ok };
      }
      return { sent: false };

    case 'condition':
      // Condition evaluation is handled in executeActionsWithBranching
      return {
        type: 'condition',
        conditions: action.config.conditions?.length || 0,
        logic: action.config.conditionOperator || 'AND',
      };

    case 'split':
      // Split execution is handled in executeActionsWithBranching
      return {
        type: 'split',
        percentageA: action.config.splitPercentageA ?? 50,
        name: action.config.splitName || 'A/B Test',
      };

    case 'go_to':
      return {
        type: 'go_to',
        targetActionId: action.config.goToActionId,
      };

    case 'send_notification':
      // TODO: Implement internal notification system
      return {
        type: 'notification',
        users: action.config.notifyUsers || [],
        message: action.config.notificationMessage,
      };

    case 'create_deal':
      if (contact && action.config.fields) {
        const Deal = (await import('@/models/Deal')).default;
        const deal = await Deal.create({
          ...action.config.fields,
          contactId: contact._id,
          clientId: contact.clientId,
          createdBy: action.config.fields.ownerId,
        });
        return { created: true, dealId: deal._id };
      }
      return { created: false };

    case 'update_deal':
      if (data?.dealId && action.config.fields) {
        const Deal = (await import('@/models/Deal')).default;
        await Deal.findByIdAndUpdate(data.dealId, {
          $set: action.config.fields,
        });
        return { updated: true, dealId: data.dealId };
      }
      return { updated: false };

    case 'add_to_list':
      if (contact && action.config.listId) {
        const MarketingAudience = (await import('@/models/MarketingAudience')).default;
        await MarketingAudience.findByIdAndUpdate(action.config.listId, {
          $addToSet: { contacts: contact._id },
        });
        return { added: true, listId: action.config.listId };
      }
      return { added: false };

    case 'remove_from_list':
      if (contact && action.config.listId) {
        const MarketingAudience = (await import('@/models/MarketingAudience')).default;
        await MarketingAudience.findByIdAndUpdate(action.config.listId, {
          $pull: { contacts: contact._id },
        });
        return { removed: true, listId: action.config.listId };
      }
      return { removed: false };

    default:
      return { executed: true, type: action.type };
  }
}

function calculateWaitTime(duration: number, unit: string): number {
  const multipliers: Record<string, number> = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };
  return duration * (multipliers[unit] || multipliers.hours);
}

function replaceVariables(text: string, contact: any, data?: Record<string, any>): string {
  let result = text;
  if (contact) {
    result = result.replace(/\{\{contact\.(\w+)\}\}/g, (_, key) => contact[key] || '');
  }
  if (data) {
    result = result.replace(/\{\{data\.(\w+)\}\}/g, (_, key) => data[key] || '');
  }
  return result;
}

// Evaluate conditions for branching
function evaluateConditions(
  conditions: { field: string; operator: string; value: any }[],
  logic: 'AND' | 'OR',
  contact: any,
  data?: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  const results = conditions.map((cond) => {
    const fieldValue = getFieldValue(cond.field, contact, data);
    return evaluateSingleCondition(cond.operator, fieldValue, cond.value);
  });

  return logic === 'OR' ? results.some((r) => r) : results.every((r) => r);
}

// Get field value from contact or data
function getFieldValue(field: string, contact: any, data?: Record<string, any>): any {
  const [source, ...pathParts] = field.split('.');
  const path = pathParts.join('.');

  let obj: any = null;
  if (source === 'contact' && contact) {
    obj = contact;
  } else if (source === 'data' && data) {
    obj = data;
  } else if (contact && contact[field] !== undefined) {
    return contact[field];
  }

  if (!obj || !path) return obj?.[source];

  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

// Evaluate single condition
function evaluateSingleCondition(operator: string, fieldValue: any, conditionValue: any): boolean {
  switch (operator) {
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
      return String(fieldValue || '').toLowerCase().includes(String(conditionValue || '').toLowerCase());
    case 'not_contains':
      return !String(fieldValue || '').toLowerCase().includes(String(conditionValue || '').toLowerCase());
    case 'starts_with':
      return String(fieldValue || '').toLowerCase().startsWith(String(conditionValue || '').toLowerCase());
    case 'ends_with':
      return String(fieldValue || '').toLowerCase().endsWith(String(conditionValue || '').toLowerCase());
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'in_list': {
      const listValues = Array.isArray(conditionValue)
        ? conditionValue
        : String(conditionValue).split(',').map((v) => v.trim());
      return listValues.includes(String(fieldValue));
    }
    case 'not_in_list': {
      const listValues = Array.isArray(conditionValue)
        ? conditionValue
        : String(conditionValue).split(',').map((v) => v.trim());
      return !listValues.includes(String(fieldValue));
    }
    case 'has_tag':
      return Array.isArray(fieldValue) && fieldValue.includes(conditionValue);
    case 'not_has_tag':
      return !Array.isArray(fieldValue) || !fieldValue.includes(conditionValue);
    default:
      return false;
  }
}

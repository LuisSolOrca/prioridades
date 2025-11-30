import mongoose, { Schema, Model } from 'mongoose';

// Re-export types and constants from shared file
export type {
  CRMTriggerType,
  ConditionOperator,
  CRMActionType,
} from '@/lib/crm/workflowConstants';

export {
  TRIGGER_LABELS,
  ACTION_LABELS,
  OPERATOR_LABELS,
  CONDITION_FIELDS,
} from '@/lib/crm/workflowConstants';

import type { CRMTriggerType, ConditionOperator, CRMActionType } from '@/lib/crm/workflowConstants';

export interface ICRMWorkflowCondition {
  id: string;
  field: string;              // 'deal.value', 'deal.stageId', 'contact.email', etc.
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';  // Para conectar con la siguiente condición
}

export interface ICRMWorkflowAction {
  id: string;
  type: CRMActionType;
  config: {
    // Para send_email
    to?: string;              // 'owner' | 'contact' | 'client' | email específico
    subject?: string;
    body?: string;
    templateId?: string;
    useTemplate?: boolean;    // Si se usa plantilla o contenido manual
    emailTemplateId?: string; // ID de la plantilla de email

    // Para send_notification
    recipientType?: 'owner' | 'admin' | 'specific_user' | 'all_sales';
    recipientId?: string;
    message?: string;
    priority?: 'low' | 'medium' | 'high';

    // Para create_task
    taskTitle?: string;
    taskDescription?: string;
    taskDueDate?: string;     // '+3 days', '+1 week', etc.
    taskAssignTo?: 'owner' | 'specific_user';
    taskAssignToId?: string;

    // Para create_activity
    activityType?: 'note' | 'call' | 'email' | 'meeting' | 'task';
    activityTitle?: string;
    activityDescription?: string;

    // Para update_field
    targetEntity?: 'deal' | 'contact' | 'client';
    fieldName?: string;
    fieldValue?: any;

    // Para move_stage
    stageId?: string;

    // Para assign_owner
    newOwnerId?: string;
    assignmentType?: 'specific' | 'round_robin' | 'least_deals';

    // Para add_tag / remove_tag
    tag?: string;

    // Para webhook
    url?: string;
    method?: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    payload?: Record<string, any>;

    // Para delay
    delayMinutes?: number;
  };
  delay?: number;             // Minutos de espera antes de ejecutar esta acción
  order: number;              // Orden de ejecución
}

export interface ICRMWorkflow {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;

  // Trigger configuration
  trigger: {
    type: CRMTriggerType;
    conditions: ICRMWorkflowCondition[];
  };

  // Actions to execute
  actions: ICRMWorkflowAction[];

  // Metadata
  executionCount: number;
  lastExecutedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowConditionSchema = new Schema<ICRMWorkflowCondition>({
  id: { type: String, required: true },
  field: { type: String, required: true },
  operator: {
    type: String,
    required: true,
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal',
      'less_or_equal', 'contains', 'not_contains', 'starts_with', 'ends_with',
      'is_empty', 'is_not_empty', 'in_list', 'not_in_list'],
  },
  value: { type: Schema.Types.Mixed },
  logicalOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
}, { _id: false });

const WorkflowActionSchema = new Schema<ICRMWorkflowAction>({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['send_email', 'send_notification', 'create_task', 'create_activity',
      'update_field', 'move_stage', 'assign_owner', 'add_tag', 'remove_tag',
      'webhook', 'delay'],
  },
  config: { type: Schema.Types.Mixed, default: {} },
  delay: { type: Number, default: 0 },
  order: { type: Number, required: true },
}, { _id: false });

const CRMWorkflowSchema = new Schema<ICRMWorkflow>({
  name: {
    type: String,
    required: [true, 'El nombre del workflow es requerido'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres'],
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  trigger: {
    type: {
      type: String,
      required: true,
      enum: ['deal_created', 'deal_updated', 'deal_stage_changed', 'deal_won', 'deal_lost',
        'deal_value_changed', 'contact_created', 'contact_updated', 'client_created',
        'activity_created', 'task_created', 'task_overdue', 'task_completed',
        'quote_sent', 'quote_accepted', 'quote_rejected'],
    },
    conditions: { type: [WorkflowConditionSchema], default: [] },
  },
  actions: {
    type: [WorkflowActionSchema],
    required: true,
    validate: {
      validator: function(v: ICRMWorkflowAction[]) {
        return v.length > 0;
      },
      message: 'El workflow debe tener al menos una acción',
    },
  },
  executionCount: { type: Number, default: 0 },
  lastExecutedAt: { type: Date },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Índices
CRMWorkflowSchema.index({ isActive: 1, 'trigger.type': 1 });
CRMWorkflowSchema.index({ createdBy: 1 });
CRMWorkflowSchema.index({ createdAt: -1 });

const CRMWorkflow: Model<ICRMWorkflow> =
  mongoose.models.CRMWorkflow ||
  mongoose.model<ICRMWorkflow>('CRMWorkflow', CRMWorkflowSchema);

export default CRMWorkflow;

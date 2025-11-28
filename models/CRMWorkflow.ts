import mongoose, { Schema, Model } from 'mongoose';

// Tipos de triggers (eventos que disparan el workflow)
export type CRMTriggerType =
  | 'deal_created'
  | 'deal_updated'
  | 'deal_stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'deal_value_changed'
  | 'contact_created'
  | 'contact_updated'
  | 'client_created'
  | 'activity_created'
  | 'task_created'
  | 'task_overdue'
  | 'task_completed'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected';

// Operadores para condiciones
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'in_list'
  | 'not_in_list';

// Tipos de acciones
export type CRMActionType =
  | 'send_email'
  | 'send_notification'
  | 'create_task'
  | 'create_activity'
  | 'update_field'
  | 'move_stage'
  | 'assign_owner'
  | 'add_tag'
  | 'remove_tag'
  | 'webhook'
  | 'delay';

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

// Constantes para UI
export const TRIGGER_LABELS: Record<CRMTriggerType, string> = {
  deal_created: 'Deal creado',
  deal_updated: 'Deal actualizado',
  deal_stage_changed: 'Deal cambió de etapa',
  deal_won: 'Deal ganado',
  deal_lost: 'Deal perdido',
  deal_value_changed: 'Valor del deal cambió',
  contact_created: 'Contacto creado',
  contact_updated: 'Contacto actualizado',
  client_created: 'Cliente creado',
  activity_created: 'Actividad creada',
  task_created: 'Tarea creada',
  task_overdue: 'Tarea vencida',
  task_completed: 'Tarea completada',
  quote_sent: 'Cotización enviada',
  quote_accepted: 'Cotización aceptada',
  quote_rejected: 'Cotización rechazada',
};

export const ACTION_LABELS: Record<CRMActionType, string> = {
  send_email: 'Enviar email',
  send_notification: 'Enviar notificación',
  create_task: 'Crear tarea',
  create_activity: 'Crear actividad',
  update_field: 'Actualizar campo',
  move_stage: 'Mover a etapa',
  assign_owner: 'Asignar responsable',
  add_tag: 'Agregar etiqueta',
  remove_tag: 'Quitar etiqueta',
  webhook: 'Llamar webhook',
  delay: 'Esperar',
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'es igual a',
  not_equals: 'no es igual a',
  greater_than: 'es mayor que',
  less_than: 'es menor que',
  greater_or_equal: 'es mayor o igual a',
  less_or_equal: 'es menor o igual a',
  contains: 'contiene',
  not_contains: 'no contiene',
  starts_with: 'comienza con',
  ends_with: 'termina con',
  is_empty: 'está vacío',
  is_not_empty: 'no está vacío',
  in_list: 'está en la lista',
  not_in_list: 'no está en la lista',
};

// Campos disponibles para condiciones por tipo de trigger
export const CONDITION_FIELDS: Record<string, { label: string; type: 'string' | 'number' | 'date' | 'boolean' | 'select'; options?: { value: string; label: string }[] }[]> = {
  deal: [
    { label: 'Valor', type: 'number' },
    { label: 'Moneda', type: 'select', options: [{ value: 'MXN', label: 'MXN' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }] },
    { label: 'Etapa', type: 'select' },
    { label: 'Probabilidad', type: 'number' },
    { label: 'Título', type: 'string' },
    { label: 'Descripción', type: 'string' },
  ],
  contact: [
    { label: 'Email', type: 'string' },
    { label: 'Nombre', type: 'string' },
    { label: 'Apellido', type: 'string' },
    { label: 'Cargo', type: 'string' },
    { label: 'Es principal', type: 'boolean' },
  ],
  activity: [
    { label: 'Tipo', type: 'select', options: [
      { value: 'note', label: 'Nota' },
      { value: 'call', label: 'Llamada' },
      { value: 'email', label: 'Email' },
      { value: 'meeting', label: 'Reunión' },
      { value: 'task', label: 'Tarea' },
    ]},
    { label: 'Título', type: 'string' },
  ],
};

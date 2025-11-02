import mongoose, { Schema, Document } from 'mongoose';

// Tipos de triggers (eventos que disparan el workflow)
export type TriggerType =
  | 'priority_status_change'    // Cuando cambia el estado de una prioridad
  | 'priority_created'           // Cuando se crea una prioridad
  | 'priority_overdue'           // Cuando una prioridad está atrasada
  | 'completion_low';            // Cuando % de completado es bajo

// Tipos de condiciones
export type ConditionType =
  | 'status_equals'              // Estado = X
  | 'status_for_days'            // Estado X por Y días
  | 'completion_less_than'       // % completado < X
  | 'completion_greater_than'    // % completado > X
  | 'day_of_week'                // Día de la semana = X
  | 'days_until_deadline'        // Días hasta deadline <= X
  | 'user_equals'                // Usuario = X
  | 'initiative_equals'          // Iniciativa = X
  | 'title_contains'             // Título contiene texto
  | 'description_contains';      // Descripción contiene texto

// Tipos de acciones
export type ActionType =
  | 'send_notification'          // Enviar notificación in-app
  | 'send_email'                 // Enviar email
  | 'change_status'              // Cambiar estado de prioridad
  | 'assign_to_user'             // Asignar a otro usuario
  | 'add_comment';               // Agregar comentario automático

export interface ICondition {
  type: ConditionType;
  field?: string;                // Campo a evaluar
  operator?: 'equals' | 'less_than' | 'greater_than' | 'contains';
  value: any;                    // Valor a comparar
  days?: number;                 // Para condiciones de tiempo
}

export interface IAction {
  type: ActionType;
  targetUserId?: mongoose.Types.ObjectId;  // Para notificaciones/asignaciones
  targetRole?: 'ADMIN' | 'USER' | 'OWNER'; // Para notificaciones por rol
  message?: string;              // Mensaje de notificación/email/comentario
  newStatus?: 'EN_TIEMPO' | 'EN_RIESGO' | 'BLOQUEADO' | 'COMPLETADO';
  emailSubject?: string;         // Para emails
}

export interface IWorkflow extends Document {
  name: string;
  description?: string;
  isActive: boolean;

  // Configuración del trigger
  triggerType: TriggerType;

  // Condiciones (todas deben cumplirse - AND)
  conditions: ICondition[];

  // Acciones a ejecutar
  actions: IAction[];

  // Configuración adicional
  executeOnce?: boolean;         // Ejecutar solo una vez por prioridad

  // Estadísticas
  executionCount: number;        // Veces que se ha ejecutado
  lastExecuted?: Date;           // Última ejecución

  // Auditoría
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConditionSchema = new Schema({
  type: {
    type: String,
    enum: [
      'status_equals',
      'status_for_days',
      'completion_less_than',
      'completion_greater_than',
      'day_of_week',
      'days_until_deadline',
      'user_equals',
      'initiative_equals',
      'title_contains',
      'description_contains'
    ],
    required: true
  },
  field: String,
  operator: {
    type: String,
    enum: ['equals', 'less_than', 'greater_than', 'contains']
  },
  value: Schema.Types.Mixed,
  days: Number
}, { _id: false });

const ActionSchema = new Schema({
  type: {
    type: String,
    enum: [
      'send_notification',
      'send_email',
      'change_status',
      'assign_to_user',
      'add_comment'
    ],
    required: true
  },
  targetUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  targetRole: {
    type: String,
    enum: ['ADMIN', 'USER', 'OWNER']
  },
  message: String,
  newStatus: {
    type: String,
    enum: ['EN_TIEMPO', 'EN_RIESGO', 'BLOQUEADO', 'COMPLETADO']
  },
  emailSubject: String
}, { _id: false });

const WorkflowSchema = new Schema<IWorkflow>({
  name: {
    type: String,
    required: [true, 'El nombre del workflow es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  triggerType: {
    type: String,
    enum: [
      'priority_status_change',
      'priority_created',
      'priority_overdue',
      'completion_low'
    ],
    required: true
  },
  conditions: {
    type: [ConditionSchema],
    default: []
  },
  actions: {
    type: [ActionSchema],
    required: true,
    validate: {
      validator: function(actions: IAction[]) {
        return actions.length > 0;
      },
      message: 'Debe haber al menos una acción'
    }
  },
  executeOnce: {
    type: Boolean,
    default: false
  },
  executionCount: {
    type: Number,
    default: 0
  },
  lastExecuted: Date,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices para optimizar búsquedas
WorkflowSchema.index({ isActive: 1, triggerType: 1 });

const Workflow = mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', WorkflowSchema);

export default Workflow;

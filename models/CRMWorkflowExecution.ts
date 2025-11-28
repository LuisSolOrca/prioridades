import mongoose, { Schema, Model } from 'mongoose';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface IActionLog {
  actionId: string;
  actionType: string;
  status: ExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface ICRMWorkflowExecution {
  _id: mongoose.Types.ObjectId;
  workflowId: mongoose.Types.ObjectId;
  workflowName: string;

  // Trigger info
  triggerType: string;
  triggerData: {
    entityType: 'deal' | 'contact' | 'client' | 'activity' | 'quote';
    entityId: mongoose.Types.ObjectId;
    entityName?: string;
    previousData?: Record<string, any>;
    newData?: Record<string, any>;
    changedFields?: string[];
  };

  // Execution status
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;

  // Action logs
  actionLogs: IActionLog[];

  // Error info
  error?: string;
  errorStack?: string;

  // Metadata
  duration?: number;  // milliseconds
  createdAt: Date;
  updatedAt: Date;
}

const ActionLogSchema = new Schema<IActionLog>({
  actionId: { type: String, required: true },
  actionType: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  error: { type: String },
  result: { type: Schema.Types.Mixed },
}, { _id: false });

const CRMWorkflowExecutionSchema = new Schema<ICRMWorkflowExecution>({
  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'CRMWorkflow',
    required: true,
    index: true,
  },
  workflowName: {
    type: String,
    required: true,
  },
  triggerType: {
    type: String,
    required: true,
  },
  triggerData: {
    entityType: {
      type: String,
      required: true,
      enum: ['deal', 'contact', 'client', 'activity', 'quote'],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    entityName: { type: String },
    previousData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
    changedFields: { type: [String] },
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  completedAt: { type: Date },
  actionLogs: {
    type: [ActionLogSchema],
    default: [],
  },
  error: { type: String },
  errorStack: { type: String },
  duration: { type: Number },
}, {
  timestamps: true,
});

// Índices para consultas comunes
CRMWorkflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
CRMWorkflowExecutionSchema.index({ 'triggerData.entityType': 1, 'triggerData.entityId': 1 });
CRMWorkflowExecutionSchema.index({ status: 1, createdAt: -1 });
CRMWorkflowExecutionSchema.index({ createdAt: -1 });

// TTL index para limpiar ejecuciones antiguas (90 días)
CRMWorkflowExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const CRMWorkflowExecution: Model<ICRMWorkflowExecution> =
  mongoose.models.CRMWorkflowExecution ||
  mongoose.model<ICRMWorkflowExecution>('CRMWorkflowExecution', CRMWorkflowExecutionSchema);

export default CRMWorkflowExecution;

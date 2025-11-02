import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkflowExecution extends Document {
  workflowId: mongoose.Types.ObjectId;
  priorityId: mongoose.Types.ObjectId;

  // Resultado de la ejecución
  success: boolean;
  error?: string;

  // Acciones ejecutadas
  actionsExecuted: Array<{
    type: string;
    success: boolean;
    error?: string;
    details?: any;
  }>;

  // Metadatos
  executedAt: Date;
  duration: number; // milisegundos
}

const WorkflowExecutionSchema = new Schema<IWorkflowExecution>({
  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
    index: true
  },
  priorityId: {
    type: Schema.Types.ObjectId,
    ref: 'Priority',
    required: true,
    index: true
  },
  success: {
    type: Boolean,
    required: true
  },
  error: String,
  actionsExecuted: [{
    type: {
      type: String,
      required: true
    },
    success: Boolean,
    error: String,
    details: Schema.Types.Mixed
  }],
  executedAt: {
    type: Date,
    default: Date.now
  },
  duration: Number
});

// Índice compuesto para evitar ejecuciones duplicadas
WorkflowExecutionSchema.index({ workflowId: 1, priorityId: 1, executedAt: -1 });

// TTL index para auto-eliminar ejecuciones antiguas después de 90 días
WorkflowExecutionSchema.index({ executedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const WorkflowExecution = mongoose.models.WorkflowExecution ||
  mongoose.model<IWorkflowExecution>('WorkflowExecution', WorkflowExecutionSchema);

export default WorkflowExecution;

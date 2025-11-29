import mongoose, { Schema, Document, Model } from 'mongoose';
import { WebhookEvent } from './CrmWebhook';

export type WebhookLogStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface ICrmWebhookLog extends Document {
  _id: mongoose.Types.ObjectId;
  webhookId: mongoose.Types.ObjectId;
  webhookName: string;
  event: WebhookEvent;

  // Payload enviado
  payload: Record<string, any>;

  // Request
  requestUrl: string;
  requestHeaders: Record<string, string>;
  requestBody: string;

  // Response
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTime?: number; // ms

  // Estado
  status: WebhookLogStatus;
  attempts: number;
  error?: string;
  nextRetryAt?: Date;

  // Metadata
  entityType: 'deal' | 'contact' | 'client' | 'activity' | 'quote';
  entityId: mongoose.Types.ObjectId;
  entityName?: string;
  triggeredBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

interface CrmWebhookLogModel extends Model<ICrmWebhookLog> {}

const CrmWebhookLogSchema = new Schema<ICrmWebhookLog, CrmWebhookLogModel>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: 'CrmWebhook',
      required: true,
      index: true,
    },
    webhookName: {
      type: String,
      required: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    requestUrl: {
      type: String,
      required: true,
    },
    requestHeaders: {
      type: Map,
      of: String,
    },
    requestBody: {
      type: String,
    },
    responseStatus: { type: Number },
    responseHeaders: {
      type: Map,
      of: String,
    },
    responseBody: {
      type: String,
      maxlength: 10000, // Limitar tamaño de respuesta almacenada
    },
    responseTime: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'retrying'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    error: { type: String },
    nextRetryAt: { type: Date, index: true },
    entityType: {
      type: String,
      enum: ['deal', 'contact', 'client', 'activity', 'quote'],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    entityName: { type: String },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos
CrmWebhookLogSchema.index({ webhookId: 1, createdAt: -1 });
CrmWebhookLogSchema.index({ status: 1, nextRetryAt: 1 });
CrmWebhookLogSchema.index({ entityType: 1, entityId: 1 });

// TTL: eliminar logs después de 30 días
CrmWebhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const CrmWebhookLog = (mongoose.models.CrmWebhookLog as CrmWebhookLogModel) ||
  mongoose.model<ICrmWebhookLog, CrmWebhookLogModel>('CrmWebhookLog', CrmWebhookLogSchema);

export default CrmWebhookLog;

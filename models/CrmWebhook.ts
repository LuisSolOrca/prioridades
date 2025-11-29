import mongoose, { Schema, Document, Model } from 'mongoose';

// Eventos que pueden disparar webhooks
export type WebhookEvent =
  | 'deal.created'
  | 'deal.updated'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'deal.lost'
  | 'deal.deleted'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'activity.created'
  | 'task.completed'
  | 'quote.created'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.rejected';

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; category: string }[] = [
  // Deals
  { value: 'deal.created', label: 'Deal creado', category: 'Deals' },
  { value: 'deal.updated', label: 'Deal actualizado', category: 'Deals' },
  { value: 'deal.stage_changed', label: 'Deal cambió de etapa', category: 'Deals' },
  { value: 'deal.won', label: 'Deal ganado', category: 'Deals' },
  { value: 'deal.lost', label: 'Deal perdido', category: 'Deals' },
  { value: 'deal.deleted', label: 'Deal eliminado', category: 'Deals' },
  // Contacts
  { value: 'contact.created', label: 'Contacto creado', category: 'Contactos' },
  { value: 'contact.updated', label: 'Contacto actualizado', category: 'Contactos' },
  { value: 'contact.deleted', label: 'Contacto eliminado', category: 'Contactos' },
  // Clients
  { value: 'client.created', label: 'Cliente creado', category: 'Clientes' },
  { value: 'client.updated', label: 'Cliente actualizado', category: 'Clientes' },
  { value: 'client.deleted', label: 'Cliente eliminado', category: 'Clientes' },
  // Activities
  { value: 'activity.created', label: 'Actividad creada', category: 'Actividades' },
  { value: 'task.completed', label: 'Tarea completada', category: 'Actividades' },
  // Quotes
  { value: 'quote.created', label: 'Cotización creada', category: 'Cotizaciones' },
  { value: 'quote.sent', label: 'Cotización enviada', category: 'Cotizaciones' },
  { value: 'quote.accepted', label: 'Cotización aceptada', category: 'Cotizaciones' },
  { value: 'quote.rejected', label: 'Cotización rechazada', category: 'Cotizaciones' },
];

export interface IWebhookFilters {
  pipelineId?: mongoose.Types.ObjectId;
  stageId?: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId;
  minValue?: number;
  maxValue?: number;
}

export interface ICrmWebhook extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  url: string;
  secret: string;

  // Eventos que disparan el webhook
  events: WebhookEvent[];

  // Filtros opcionales
  filters?: IWebhookFilters;

  // Headers personalizados
  headers?: Record<string, string>;

  // Configuración
  isActive: boolean;
  maxRetries: number;
  timeoutMs: number;

  // Estadísticas
  lastTriggeredAt?: Date;
  lastSuccessAt?: Date;
  lastErrorAt?: Date;
  lastError?: string;
  totalSent: number;
  totalFailed: number;
  consecutiveFailures: number;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface CrmWebhookModel extends Model<ICrmWebhook> {
  findActiveByEvent(event: WebhookEvent): Promise<ICrmWebhook[]>;
}

const WebhookFiltersSchema = new Schema<IWebhookFilters>({
  pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline' },
  stageId: { type: Schema.Types.ObjectId, ref: 'PipelineStage' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  minValue: { type: Number },
  maxValue: { type: Number },
}, { _id: false });

const CrmWebhookSchema = new Schema<ICrmWebhook, CrmWebhookModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'URL inválida',
      },
    },
    secret: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'Debe seleccionar al menos un evento',
      },
    },
    filters: {
      type: WebhookFiltersSchema,
      default: undefined,
    },
    headers: {
      type: Map,
      of: String,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    timeoutMs: {
      type: Number,
      default: 10000,
      min: 1000,
      max: 30000,
    },
    lastTriggeredAt: { type: Date },
    lastSuccessAt: { type: Date },
    lastErrorAt: { type: Date },
    lastError: { type: String },
    totalSent: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
CrmWebhookSchema.index({ isActive: 1, events: 1 });
CrmWebhookSchema.index({ createdBy: 1 });

// Método estático para encontrar webhooks activos por evento
CrmWebhookSchema.statics.findActiveByEvent = function(event: WebhookEvent) {
  return this.find({
    isActive: true,
    events: event,
    consecutiveFailures: { $lt: 10 }, // Desactivar temporalmente si hay muchos fallos
  });
};

const CrmWebhook = (mongoose.models.CrmWebhook as CrmWebhookModel) ||
  mongoose.model<ICrmWebhook, CrmWebhookModel>('CrmWebhook', CrmWebhookSchema);

export default CrmWebhook;

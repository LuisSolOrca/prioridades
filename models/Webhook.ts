import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWebhook extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: 'INCOMING' | 'OUTGOING';
  url?: string; // Para webhooks salientes
  secret: string; // Token de autenticación
  isActive: boolean;
  events: string[]; // Eventos que disparan el webhook (para salientes)
  channelId?: mongoose.Types.ObjectId; // Canal específico o null para todos
  createdBy: mongoose.Types.ObjectId;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface WebhookModel extends Model<IWebhook> {}

const WebhookSchema = new Schema<IWebhook, WebhookModel>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['INCOMING', 'OUTGOING'],
      required: true,
    },
    url: {
      type: String,
      trim: true,
      // Requerido solo para webhooks salientes
      validate: {
        validator: function(this: IWebhook, v: string) {
          if (this.type === 'OUTGOING') {
            return !!v && v.length > 0;
          }
          return true;
        },
        message: 'URL es requerida para webhooks salientes',
      },
    },
    secret: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    events: {
      type: [String],
      default: [],
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastTriggered: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
WebhookSchema.index({ projectId: 1, isActive: 1 });
WebhookSchema.index({ secret: 1 });
WebhookSchema.index({ type: 1, isActive: 1 });

const Webhook = (mongoose.models.Webhook as WebhookModel) ||
  mongoose.model<IWebhook, WebhookModel>('Webhook', WebhookSchema);

export default Webhook;

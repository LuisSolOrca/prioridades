import mongoose, { Schema, Model } from 'mongoose';

export interface ISlackIntegration {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  slackUserId: string; // ID del usuario en Slack (ej: U01234567)
  slackTeamId: string; // ID del workspace de Slack (ej: T01234567)
  slackTeamName: string; // Nombre del workspace
  accessToken: string; // OAuth access token (debería encriptarse en producción)
  scope: string; // Scopes otorgados
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SlackIntegrationSchema = new Schema<ISlackIntegration>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Un usuario solo puede tener una integración de Slack
  },
  slackUserId: {
    type: String,
    required: true,
  },
  slackTeamId: {
    type: String,
    required: true,
  },
  slackTeamName: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
    // TODO: En producción, encriptar este campo
  },
  scope: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Índices
SlackIntegrationSchema.index({ userId: 1 });
SlackIntegrationSchema.index({ slackUserId: 1 });

const SlackIntegration: Model<ISlackIntegration> =
  mongoose.models.SlackIntegration ||
  mongoose.model<ISlackIntegration>('SlackIntegration', SlackIntegrationSchema);

export default SlackIntegration;

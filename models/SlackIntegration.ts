import mongoose, { Schema, Model } from 'mongoose';

export interface ISlackIntegration {
  _id: mongoose.Types.ObjectId;
  configuredBy: mongoose.Types.ObjectId; // Admin que configuró la integración
  slackUserId: string; // ID del usuario admin en Slack que autorizó (ej: U01234567)
  slackTeamId: string; // ID del workspace de Slack (ej: T01234567)
  slackTeamName: string; // Nombre del workspace
  accessToken: string; // OAuth access token organizacional (debería encriptarse en producción)
  botAccessToken?: string; // Bot token si se usa
  scope: string; // Scopes otorgados
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SlackIntegrationSchema = new Schema<ISlackIntegration>({
  configuredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  botAccessToken: {
    type: String,
    required: false,
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
SlackIntegrationSchema.index({ slackTeamId: 1 }); // Solo debe existir una integración por organización

const SlackIntegration: Model<ISlackIntegration> =
  mongoose.models.SlackIntegration ||
  mongoose.model<ISlackIntegration>('SlackIntegration', SlackIntegrationSchema);

export default SlackIntegration;

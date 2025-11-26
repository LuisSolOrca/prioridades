import mongoose from 'mongoose';

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface IVoiceMessage {
  r2Key: string; // Key del archivo en R2
  duration: number; // Duration in seconds
  mimeType: string; // e.g., 'audio/webm', 'audio/mp4'
  waveform?: number[]; // Optional waveform data for visualization
  transcription?: string; // Transcripción del audio (si se generó)
}

export interface IChannelMessage {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  voiceMessage?: IVoiceMessage;
  mentions: mongoose.Types.ObjectId[]; // Array de userIds mencionados
  priorityMentions: mongoose.Types.ObjectId[]; // Array de priorityIds mencionados
  attachments: mongoose.Types.ObjectId[]; // Array de attachmentIds
  reactions: IReaction[];
  parentMessageId?: mongoose.Types.ObjectId; // Para hilos/respuestas
  rootMessageId?: mongoose.Types.ObjectId; // Mensaje raíz del hilo (para hilos anidados)
  threadDepth: number; // Nivel de anidamiento (0 = mensaje principal, 1 = respuesta, 2+ = respuesta anidada)
  replyCount: number; // Contador de respuestas directas en el hilo
  isPinned: boolean; // Si el mensaje está anclado
  pinnedAt?: Date; // Cuándo fue anclado
  pinnedBy?: mongoose.Types.ObjectId; // Quién lo ancló
  commandType?: string; // Tipo de comando slash (poll, status, etc.)
  commandData?: any; // Datos del comando (flexible para diferentes tipos)
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelMessageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  priorityMentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Priority'
  }],
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }],
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 10
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  parentMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelMessage',
    default: null,
    index: true
  },
  rootMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChannelMessage',
    default: null,
    index: true
  },
  threadDepth: {
    type: Number,
    default: 0
  },
  replyCount: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  pinnedAt: {
    type: Date,
    default: null
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  commandType: {
    type: String,
    default: null
  },
  commandData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  voiceMessage: {
    r2Key: { type: String }, // Key del archivo en R2
    duration: { type: Number }, // Duration in seconds
    mimeType: { type: String }, // e.g., 'audio/webm', 'audio/mp4'
    waveform: [{ type: Number }], // Optional waveform data for visualization
    transcription: { type: String } // Transcripción del audio
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas eficientes
ChannelMessageSchema.index({ projectId: 1, channelId: 1, createdAt: -1 });
ChannelMessageSchema.index({ projectId: 1, channelId: 1, parentMessageId: 1, createdAt: -1 });
ChannelMessageSchema.index({ projectId: 1, channelId: 1, rootMessageId: 1, createdAt: -1 }); // Para hilos anidados
ChannelMessageSchema.index({ projectId: 1, channelId: 1, isPinned: 1, pinnedAt: -1 }); // Para mensajes anclados

export default mongoose.models.ChannelMessage ||
  mongoose.model<IChannelMessage>('ChannelMessage', ChannelMessageSchema);

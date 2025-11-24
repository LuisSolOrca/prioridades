import mongoose from 'mongoose';

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface IChannelMessage {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  mentions: mongoose.Types.ObjectId[]; // Array de userIds mencionados
  priorityMentions: mongoose.Types.ObjectId[]; // Array de priorityIds mencionados
  attachments: mongoose.Types.ObjectId[]; // Array de attachmentIds
  reactions: IReaction[];
  parentMessageId?: mongoose.Types.ObjectId; // Para hilos/respuestas
  replyCount: number; // Contador de respuestas en el hilo
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
ChannelMessageSchema.index({ projectId: 1, channelId: 1, isPinned: 1, pinnedAt: -1 }); // Para mensajes anclados

export default mongoose.models.ChannelMessage ||
  mongoose.model<IChannelMessage>('ChannelMessage', ChannelMessageSchema);

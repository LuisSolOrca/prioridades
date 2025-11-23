import mongoose from 'mongoose';

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface IChannelMessage {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  mentions: mongoose.Types.ObjectId[]; // Array de userIds mencionados
  reactions: IReaction[];
  parentMessageId?: mongoose.Types.ObjectId; // Para hilos/respuestas
  replyCount: number; // Contador de respuestas en el hilo
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
ChannelMessageSchema.index({ projectId: 1, createdAt: -1 });
ChannelMessageSchema.index({ projectId: 1, parentMessageId: 1, createdAt: -1 });

export default mongoose.models.ChannelMessage ||
  mongoose.model<IChannelMessage>('ChannelMessage', ChannelMessageSchema);

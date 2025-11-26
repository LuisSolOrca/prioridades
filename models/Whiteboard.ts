import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWhiteboard extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  title: string;
  elements: any[];
  appState: any;
  files: { [key: string]: any };
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  collaborators: mongoose.Types.ObjectId[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const WhiteboardSchema = new Schema<IWhiteboard>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'ChannelMessage',
      default: null
    },
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    elements: {
      type: Schema.Types.Mixed,
      default: []
    },
    appState: {
      type: Schema.Types.Mixed,
      default: {
        viewBackgroundColor: '#ffffff',
        currentItemFontFamily: 1
      }
    },
    files: {
      type: Schema.Types.Mixed,
      default: {}
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    collaborators: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Índices compuestos para búsquedas eficientes
WhiteboardSchema.index({ projectId: 1, channelId: 1, createdAt: -1 });
WhiteboardSchema.index({ projectId: 1, isActive: 1 });
WhiteboardSchema.index({ channelId: 1, isActive: 1, createdAt: -1 });

// Evitar recompilación en desarrollo
const Whiteboard: Model<IWhiteboard> =
  mongoose.models.Whiteboard || mongoose.model<IWhiteboard>('Whiteboard', WhiteboardSchema);

export default Whiteboard;

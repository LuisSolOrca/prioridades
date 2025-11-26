import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChannelReadMarker extends Document {
  _id: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  lastReadMessageId: mongoose.Types.ObjectId;
  lastReadAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelReadMarkerSchema = new Schema<IChannelReadMarker>(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    lastReadMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'ChannelMessage',
      required: true
    },
    lastReadAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Índice compuesto único para un usuario por canal
ChannelReadMarkerSchema.index({ channelId: 1, userId: 1 }, { unique: true });

// Evitar recompilación en desarrollo
const ChannelReadMarker: Model<IChannelReadMarker> =
  mongoose.models.ChannelReadMarker || mongoose.model<IChannelReadMarker>('ChannelReadMarker', ChannelReadMarkerSchema);

export default ChannelReadMarker;

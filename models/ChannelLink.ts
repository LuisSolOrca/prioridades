import mongoose from 'mongoose';

export interface IChannelLink {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  url: string;
  title: string;
  description?: string;
  category?: 'documentation' | 'repository' | 'design' | 'meeting' | 'resource' | 'other';
  addedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelLinkSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    maxlength: 2000
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['documentation', 'repository', 'design', 'meeting', 'resource', 'other'],
    default: 'other'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
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
ChannelLinkSchema.index({ projectId: 1, isActive: 1, createdAt: -1 });

export default mongoose.models.ChannelLink ||
  mongoose.model<IChannelLink>('ChannelLink', ChannelLinkSchema);

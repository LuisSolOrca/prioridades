import mongoose from 'mongoose';

const AzureDevOpsWorkItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priorityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Priority',
    required: true
  },
  workItemId: {
    type: Number,
    required: true
  },
  workItemType: {
    type: String,
    required: true // User Story, Bug, Task, etc.
  },
  organization: {
    type: String,
    required: true
  },
  project: {
    type: String,
    required: true
  },
  lastSyncedState: {
    type: String,
    required: true
  },
  lastSyncDate: {
    type: Date,
    default: Date.now
  },
  syncErrors: [{
    error: String,
    date: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices
AzureDevOpsWorkItemSchema.index({ userId: 1, workItemId: 1 });
AzureDevOpsWorkItemSchema.index({ priorityId: 1 }, { unique: true });

export default mongoose.models.AzureDevOpsWorkItem || mongoose.model('AzureDevOpsWorkItem', AzureDevOpsWorkItemSchema);

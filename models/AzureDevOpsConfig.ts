import mongoose from 'mongoose';

const AzureDevOpsConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organization: {
    type: String,
    required: true,
    trim: true
  },
  project: {
    type: String,
    required: true,
    trim: true
  },
  personalAccessToken: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  syncEnabled: {
    type: Boolean,
    default: true
  },
  // Mapeo de estados Azure DevOps -> App
  stateMapping: {
    type: Map,
    of: String,
    default: {
      'New': 'EN_TIEMPO',
      'Active': 'EN_TIEMPO',
      'Resolved': 'COMPLETADO',
      'Closed': 'COMPLETADO',
      'Removed': 'BLOQUEADO'
    }
  },
  lastSyncDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices
AzureDevOpsConfigSchema.index({ userId: 1 });

export default mongoose.models.AzureDevOpsConfig || mongoose.model('AzureDevOpsConfig', AzureDevOpsConfigSchema);

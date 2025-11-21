import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Slack Integration
  slackChannelId: {
    type: String,
    trim: true,
    maxlength: 50
  },
  slackChannelName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  // PM BOOK Fields
  purpose: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  objectives: [{
    description: { type: String, maxlength: 500 },
    specific: { type: Boolean, default: false },
    measurable: { type: Boolean, default: false },
    achievable: { type: Boolean, default: false },
    relevant: { type: Boolean, default: false },
    timeBound: { type: Boolean, default: false }
  }],
  scope: {
    included: { type: String, maxlength: 2000 },
    excluded: { type: String, maxlength: 2000 }
  },
  requirements: {
    type: String,
    maxlength: 2000
  },
  assumptions: {
    type: String,
    maxlength: 2000
  },
  constraints: {
    type: String,
    maxlength: 2000
  },
  stakeholders: [{
    name: { type: String, maxlength: 100 },
    role: { type: String, maxlength: 100 },
    interest: { type: String, enum: ['Alto', 'Medio', 'Bajo'], default: 'Medio' },
    influence: { type: String, enum: ['Alto', 'Medio', 'Bajo'], default: 'Medio' }
  }],
  risks: [{
    description: { type: String, maxlength: 500 },
    probability: { type: String, enum: ['Alta', 'Media', 'Baja'], default: 'Media' },
    impact: { type: String, enum: ['Alto', 'Medio', 'Bajo'], default: 'Medio' },
    mitigation: { type: String, maxlength: 500 }
  }],
  budget: {
    estimated: { type: Number },
    currency: { type: String, default: 'USD', maxlength: 10 },
    notes: { type: String, maxlength: 1000 }
  },
  successCriteria: [{
    description: { type: String, maxlength: 500 }
  }],
  projectManager: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, maxlength: 100 },
    authority: { type: String, maxlength: 500 }
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

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);

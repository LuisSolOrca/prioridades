import mongoose, { Schema, Model } from 'mongoose';

export type SequenceStepType = 'email' | 'task' | 'linkedin';

export interface IEmailSequenceStep {
  order: number;
  type: SequenceStepType;

  // Para emails
  subject?: string;
  body?: string;
  templateId?: mongoose.Types.ObjectId;

  // Para tareas
  taskTitle?: string;
  taskDescription?: string;

  // Para LinkedIn
  linkedinAction?: 'connect' | 'message' | 'view_profile';
  linkedinMessage?: string;

  // Timing
  delayDays: number;
  delayHours: number;
}

export interface IEmailSequence {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;

  steps: IEmailSequenceStep[];

  // Configuración
  exitOnReply: boolean;
  exitOnMeeting: boolean;
  exitOnDealWon: boolean;
  exitOnDealLost: boolean;
  sendOnWeekends: boolean;
  sendingHours: {
    start: number; // 0-23
    end: number;   // 0-23
  };
  timezone: string;

  // Stats (cached)
  totalEnrolled: number;
  activeEnrolled: number;
  completedCount: number;
  replyRate: number;
  openRate: number;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSequenceStepSchema = new Schema<IEmailSequenceStep>({
  order: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['email', 'task', 'linkedin'],
    required: true,
  },

  // Email fields
  subject: { type: String },
  body: { type: String },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailTemplate',
  },

  // Task fields
  taskTitle: { type: String },
  taskDescription: { type: String },

  // LinkedIn fields
  linkedinAction: {
    type: String,
    enum: ['connect', 'message', 'view_profile'],
  },
  linkedinMessage: { type: String },

  // Timing
  delayDays: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  delayHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 23,
  },
}, { _id: false });

const EmailSequenceSchema = new Schema<IEmailSequence>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },

  steps: {
    type: [EmailSequenceStepSchema],
    default: [],
  },

  // Configuration
  exitOnReply: {
    type: Boolean,
    default: true,
  },
  exitOnMeeting: {
    type: Boolean,
    default: true,
  },
  exitOnDealWon: {
    type: Boolean,
    default: true,
  },
  exitOnDealLost: {
    type: Boolean,
    default: false,
  },
  sendOnWeekends: {
    type: Boolean,
    default: false,
  },
  sendingHours: {
    start: { type: Number, default: 9, min: 0, max: 23 },
    end: { type: Number, default: 18, min: 0, max: 23 },
  },
  timezone: {
    type: String,
    default: 'America/Mexico_City',
  },

  // Stats
  totalEnrolled: { type: Number, default: 0 },
  activeEnrolled: { type: Number, default: 0 },
  completedCount: { type: Number, default: 0 },
  replyRate: { type: Number, default: 0 },
  openRate: { type: Number, default: 0 },

  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
EmailSequenceSchema.index({ isActive: 1 });
EmailSequenceSchema.index({ createdBy: 1 });
EmailSequenceSchema.index({ createdAt: -1 });

// Virtual for step count
EmailSequenceSchema.virtual('stepCount').get(function() {
  return this.steps.length;
});

// Virtual for total duration in days
EmailSequenceSchema.virtual('totalDuration').get(function() {
  return this.steps.reduce((total, step) => total + step.delayDays, 0);
});

const EmailSequence: Model<IEmailSequence> =
  mongoose.models.EmailSequence ||
  mongoose.model<IEmailSequence>('EmailSequence', EmailSequenceSchema);

export default EmailSequence;

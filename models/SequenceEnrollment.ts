import mongoose, { Schema, Model } from 'mongoose';

export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'exited';
export type StepResult = 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'task_created' | 'task_completed';

export interface ICompletedStep {
  step: number;
  type: 'email' | 'task' | 'linkedin';
  completedAt: Date;
  result?: StepResult;
  emailTrackingId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
}

export interface ISequenceEnrollment {
  _id: mongoose.Types.ObjectId;
  sequenceId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;

  status: EnrollmentStatus;
  currentStep: number;
  nextStepAt?: Date;

  // History
  completedSteps: ICompletedStep[];

  // Exit info
  exitReason?: string;
  exitedAt?: Date;

  // Metrics
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  tasksCreated: number;
  tasksCompleted: number;

  // Metadata
  enrolledBy: mongoose.Types.ObjectId;
  enrolledAt: Date;
  pausedAt?: Date;
  pausedBy?: mongoose.Types.ObjectId;
  resumedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const CompletedStepSchema = new Schema<ICompletedStep>({
  step: { type: Number, required: true },
  type: {
    type: String,
    enum: ['email', 'task', 'linkedin'],
    required: true,
  },
  completedAt: { type: Date, required: true },
  result: {
    type: String,
    enum: ['sent', 'opened', 'clicked', 'replied', 'bounced', 'task_created', 'task_completed'],
  },
  emailTrackingId: { type: Schema.Types.ObjectId, ref: 'EmailTracking' },
  taskId: { type: Schema.Types.ObjectId, ref: 'Activity' },
  metadata: { type: Schema.Types.Mixed },
}, { _id: false });

const SequenceEnrollmentSchema = new Schema<ISequenceEnrollment>({
  sequenceId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailSequence',
    required: true,
    index: true,
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true,
  },
  dealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
    index: true,
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    index: true,
  },

  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'exited'],
    default: 'active',
    index: true,
  },
  currentStep: {
    type: Number,
    default: 0,
  },
  nextStepAt: {
    type: Date,
    index: true,
  },

  completedSteps: {
    type: [CompletedStepSchema],
    default: [],
  },

  exitReason: { type: String },
  exitedAt: { type: Date },

  // Metrics
  emailsSent: { type: Number, default: 0 },
  emailsOpened: { type: Number, default: 0 },
  emailsClicked: { type: Number, default: 0 },
  emailsReplied: { type: Number, default: 0 },
  tasksCreated: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },

  // Metadata
  enrolledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  pausedAt: { type: Date },
  pausedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resumedAt: { type: Date },
}, {
  timestamps: true,
});

// Compound indexes
SequenceEnrollmentSchema.index({ sequenceId: 1, status: 1 });
SequenceEnrollmentSchema.index({ contactId: 1, sequenceId: 1 }, { unique: true }); // Prevent duplicate enrollments
SequenceEnrollmentSchema.index({ status: 1, nextStepAt: 1 }); // For processing queue
SequenceEnrollmentSchema.index({ enrolledAt: -1 });

// Virtual for progress percentage
SequenceEnrollmentSchema.virtual('progress').get(function() {
  // Need to populate sequence to calculate
  return 0;
});

// Methods
SequenceEnrollmentSchema.methods.pause = function(userId: mongoose.Types.ObjectId) {
  this.status = 'paused';
  this.pausedAt = new Date();
  this.pausedBy = userId;
  return this.save();
};

SequenceEnrollmentSchema.methods.resume = function() {
  if (this.status !== 'paused') return this;

  this.status = 'active';
  this.resumedAt = new Date();
  // Recalculate nextStepAt based on current time
  const now = new Date();
  if (this.nextStepAt && this.nextStepAt < now) {
    this.nextStepAt = now;
  }
  return this.save();
};

SequenceEnrollmentSchema.methods.exit = function(reason: string) {
  this.status = 'exited';
  this.exitReason = reason;
  this.exitedAt = new Date();
  return this.save();
};

const SequenceEnrollment: Model<ISequenceEnrollment> =
  mongoose.models.SequenceEnrollment ||
  mongoose.model<ISequenceEnrollment>('SequenceEnrollment', SequenceEnrollmentSchema);

export default SequenceEnrollment;

import mongoose, { Schema, Document } from 'mongoose';

export interface IPipeline extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PipelineSchema = new Schema<IPipeline>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del pipeline es requerido'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
    },
    color: {
      type: String,
      default: '#3B82F6', // Blue
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color debe ser un código hexadecimal válido'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PipelineSchema.index({ isActive: 1, isDefault: 1 });
PipelineSchema.index({ name: 1 });

// Ensure only one default pipeline
PipelineSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default from other pipelines
    await mongoose.model('Pipeline').updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

// Static method to get default pipeline
PipelineSchema.statics.getDefault = async function () {
  let defaultPipeline = await this.findOne({ isDefault: true, isActive: true });

  // If no default exists, get the first active pipeline
  if (!defaultPipeline) {
    defaultPipeline = await this.findOne({ isActive: true });

    // If found, set it as default
    if (defaultPipeline) {
      defaultPipeline.isDefault = true;
      await defaultPipeline.save();
    }
  }

  return defaultPipeline;
};

// Virtual to get stages count
PipelineSchema.virtual('stagesCount', {
  ref: 'PipelineStage',
  localField: '_id',
  foreignField: 'pipelineId',
  count: true,
});

// Virtual to get deals count
PipelineSchema.virtual('dealsCount', {
  ref: 'Deal',
  localField: '_id',
  foreignField: 'pipelineId',
  count: true,
});

PipelineSchema.set('toJSON', { virtuals: true });
PipelineSchema.set('toObject', { virtuals: true });

const Pipeline = mongoose.models.Pipeline || mongoose.model<IPipeline>('Pipeline', PipelineSchema);

export default Pipeline;

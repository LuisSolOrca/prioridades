import mongoose, { Schema, Document } from 'mongoose';

export interface IAIPromptConfig extends Document {
  promptType: 'title' | 'description' | 'organization_analysis' | 'ppt_insights' | 'area_analysis';
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AIPromptConfigSchema = new Schema<IAIPromptConfig>({
  promptType: {
    type: String,
    required: true,
    enum: ['title', 'description', 'organization_analysis', 'ppt_insights', 'area_analysis'],
    unique: true
  },
  systemPrompt: {
    type: String,
    required: true
  },
  userPromptTemplate: {
    type: String,
    required: true
  },
  temperature: {
    type: Number,
    required: true,
    default: 0.7,
    min: 0,
    max: 2
  },
  maxTokens: {
    type: Number,
    required: true,
    default: 500,
    min: 50,
    max: 4000
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.models.AIPromptConfig || mongoose.model<IAIPromptConfig>('AIPromptConfig', AIPromptConfigSchema);

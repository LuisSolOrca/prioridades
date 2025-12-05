import mongoose, { Schema, Model } from 'mongoose';
import { replaceTemplateVariables, TemplateScope } from '@/lib/templateVariables';

export type TemplateCategory = 'outreach' | 'follow_up' | 'nurture' | 'closing' | 'meeting' | 'quote' | 'other';

// Block structure for visual editor
export interface IEmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns' | 'html' | 'social' | 'video' | 'menu';
  content: any;
  styles?: Record<string, any>;
  children?: IEmailBlock[];
}

export interface IGlobalStyles {
  backgroundColor?: string;
  contentWidth?: number;
  fontFamily?: string;
  textColor?: string;
  linkColor?: string;
}

export interface IEmailTemplate {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category: TemplateCategory;
  scope: TemplateScope; // 'sequences' | 'workflows' | 'both'

  subject: string;
  body: string; // Legacy HTML body or rendered from blocks

  // Visual editor blocks (optional - new format)
  blocks?: IEmailBlock[];
  globalStyles?: IGlobalStyles;

  // Variables disponibles (para UI)
  availableVariables: string[];

  // Stats
  usageCount: number;
  lastUsedAt?: Date;

  // Metadata
  isActive: boolean;
  isShared: boolean; // Visible para todos los usuarios
  isSystem?: boolean; // System template (CRM)
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Variables disponibles en templates
export const TEMPLATE_VARIABLES = [
  // Contact
  { key: '{{contact.firstName}}', label: 'Nombre del contacto', category: 'contact' },
  { key: '{{contact.lastName}}', label: 'Apellido del contacto', category: 'contact' },
  { key: '{{contact.fullName}}', label: 'Nombre completo', category: 'contact' },
  { key: '{{contact.email}}', label: 'Email del contacto', category: 'contact' },
  { key: '{{contact.phone}}', label: 'Teléfono', category: 'contact' },
  { key: '{{contact.position}}', label: 'Cargo', category: 'contact' },

  // Client/Company
  { key: '{{client.name}}', label: 'Nombre de la empresa', category: 'client' },
  { key: '{{client.industry}}', label: 'Industria', category: 'client' },
  { key: '{{client.website}}', label: 'Sitio web', category: 'client' },

  // Deal
  { key: '{{deal.title}}', label: 'Título del deal', category: 'deal' },
  { key: '{{deal.value}}', label: 'Valor del deal', category: 'deal' },
  { key: '{{deal.stage}}', label: 'Etapa actual', category: 'deal' },

  // User (sender)
  { key: '{{user.name}}', label: 'Tu nombre', category: 'user' },
  { key: '{{user.email}}', label: 'Tu email', category: 'user' },
  { key: '{{user.phone}}', label: 'Tu teléfono', category: 'user' },
  { key: '{{user.signature}}', label: 'Tu firma', category: 'user' },

  // Dates
  { key: '{{today}}', label: 'Fecha de hoy', category: 'date' },
  { key: '{{tomorrow}}', label: 'Fecha de mañana', category: 'date' },
  { key: '{{nextWeek}}', label: 'Próxima semana', category: 'date' },
];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  outreach: 'Prospección',
  follow_up: 'Seguimiento',
  nurture: 'Nurturing',
  closing: 'Cierre',
  meeting: 'Reuniones',
  quote: 'Cotizaciones',
  other: 'Otro',
};

const EmailTemplateSchema = new Schema<IEmailTemplate>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: ['outreach', 'follow_up', 'nurture', 'closing', 'meeting', 'quote', 'other'],
    default: 'other',
  },
  scope: {
    type: String,
    enum: ['sequences', 'workflows', 'both'],
    default: 'both',
  },

  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    default: '',
  },

  // Visual editor blocks (new format)
  blocks: {
    type: [Schema.Types.Mixed],
    default: undefined,
  },
  globalStyles: {
    type: Schema.Types.Mixed,
    default: undefined,
  },

  availableVariables: {
    type: [String],
    default: [],
  },

  // Stats
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date },

  // Metadata
  isActive: { type: Boolean, default: true },
  isShared: { type: Boolean, default: false },
  isSystem: { type: Boolean, default: false },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
EmailTemplateSchema.index({ createdBy: 1, isActive: 1 });
EmailTemplateSchema.index({ isShared: 1, isActive: 1 });
EmailTemplateSchema.index({ category: 1 });
EmailTemplateSchema.index({ scope: 1, isActive: 1 });
EmailTemplateSchema.index({ usageCount: -1 });

// Helper to extract text from blocks
function extractTextFromBlocks(blocks: any[]): string {
  let text = '';
  for (const block of blocks) {
    if (block.content) {
      if (typeof block.content === 'string') {
        text += ' ' + block.content;
      } else if (block.content.text) {
        text += ' ' + block.content.text;
      }
    }
    if (block.children && Array.isArray(block.children)) {
      text += ' ' + extractTextFromBlocks(block.children);
    }
  }
  return text;
}

// Pre-save: extract variables and generate body from blocks
EmailTemplateSchema.pre('save', function(next) {
  const variableRegex = /\{\{[\w.]+\}\}/g;
  const subjectVars = this.subject?.match(variableRegex) || [];

  let bodyVars: string[] = [];

  // If we have blocks, extract text from them for variable detection
  if (this.blocks && Array.isArray(this.blocks) && this.blocks.length > 0) {
    const blocksText = extractTextFromBlocks(this.blocks);
    bodyVars = blocksText.match(variableRegex) || [];

    // Generate a simple body from blocks for legacy compatibility
    if (!this.body || this.body === '') {
      this.body = blocksText.replace(/<[^>]*>/g, ' ').trim() || 'Email content';
    }
  } else if (this.body) {
    bodyVars = this.body.match(variableRegex) || [];
  }

  this.availableVariables = [...new Set([...subjectVars, ...bodyVars])];
  next();
});

// Static method to replace variables (uses shared utility)
EmailTemplateSchema.statics.replaceVariables = function(
  text: string,
  data: {
    contact?: any;
    client?: any;
    deal?: any;
    user?: any;
    priority?: any;
  }
): string {
  return replaceTemplateVariables(text, data);
};

const EmailTemplate: Model<IEmailTemplate> =
  mongoose.models.EmailTemplate ||
  mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);

export default EmailTemplate;

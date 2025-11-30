import mongoose, { Schema, Model } from 'mongoose';
import { replaceTemplateVariables, TemplateScope } from '@/lib/templateVariables';

export type TemplateCategory = 'outreach' | 'follow_up' | 'nurture' | 'closing' | 'other';

export interface IEmailTemplate {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category: TemplateCategory;
  scope: TemplateScope; // 'sequences' | 'workflows' | 'both'

  subject: string;
  body: string;

  // Variables disponibles (para UI)
  availableVariables: string[];

  // Stats
  usageCount: number;
  lastUsedAt?: Date;

  // Metadata
  isActive: boolean;
  isShared: boolean; // Visible para todos los usuarios
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
    enum: ['outreach', 'follow_up', 'nurture', 'closing', 'other'],
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
    required: true,
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

// Pre-save: extract variables from subject and body
EmailTemplateSchema.pre('save', function(next) {
  const variableRegex = /\{\{[\w.]+\}\}/g;
  const subjectVars = this.subject.match(variableRegex) || [];
  const bodyVars = this.body.match(variableRegex) || [];
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

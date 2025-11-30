import mongoose from 'mongoose';
import crypto from 'crypto';

export interface IWebFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox' | 'number' | 'date' | 'url';
  required: boolean;
  placeholder?: string;
  options?: string[];       // Para select
  mapTo?: string;           // 'contact.email', 'contact.phone', 'contact.firstName', etc.
  order: number;
  width?: 'full' | 'half';  // Para layout
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface IWebFormStyle {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontFamily?: string;
  fontSize?: number;
  padding?: number;
  buttonStyle?: 'filled' | 'outline';
}

export interface IWebForm {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;

  // Campos del formulario
  fields: IWebFormField[];

  // Configuración visual
  style?: IWebFormStyle;
  logoUrl?: string;

  // Configuración de submit
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  showPoweredBy?: boolean;

  // Acciones post-submit
  createContact: boolean;
  createDeal: boolean;
  defaultPipelineId?: mongoose.Types.ObjectId;
  defaultStageId?: mongoose.Types.ObjectId;
  defaultDealValue?: number;
  assignToUserId?: mongoose.Types.ObjectId;
  assignmentType?: 'specific' | 'round_robin';
  addTags?: string[];
  triggerWorkflow?: boolean;

  // Notificaciones
  notifyOnSubmission: boolean;
  notifyEmails?: string[];

  // Identificación y seguridad
  formKey: string;          // Clave única para el formulario
  allowedDomains?: string[]; // Dominios permitidos para embed
  rateLimit?: number;        // Submissions por hora permitidas
  captchaEnabled?: boolean;

  // Estado
  isActive: boolean;
  isPublished: boolean;

  // Tracking
  submissions: number;
  lastSubmissionAt?: Date;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WebFormFieldSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'email', 'phone', 'select', 'textarea', 'checkbox', 'number', 'date', 'url'],
    required: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  placeholder: String,
  options: [String],
  mapTo: String,
  order: {
    type: Number,
    default: 0,
  },
  width: {
    type: String,
    enum: ['full', 'half'],
    default: 'full',
  },
  validation: {
    minLength: Number,
    maxLength: Number,
    pattern: String,
  },
}, { _id: false });

const WebFormStyleSchema = new mongoose.Schema({
  primaryColor: {
    type: String,
    default: '#3B82F6',
  },
  backgroundColor: {
    type: String,
    default: '#FFFFFF',
  },
  textColor: {
    type: String,
    default: '#1F2937',
  },
  borderRadius: {
    type: Number,
    default: 8,
  },
  fontFamily: {
    type: String,
    default: 'Inter, system-ui, sans-serif',
  },
  fontSize: {
    type: Number,
    default: 14,
  },
  padding: {
    type: Number,
    default: 24,
  },
  buttonStyle: {
    type: String,
    enum: ['filled', 'outline'],
    default: 'filled',
  },
}, { _id: false });

const WebFormSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },

  // Campos
  fields: [WebFormFieldSchema],

  // Estilos
  style: WebFormStyleSchema,
  logoUrl: String,

  // Configuración de submit
  submitButtonText: {
    type: String,
    default: 'Enviar',
    maxlength: 100,
  },
  successMessage: {
    type: String,
    default: '¡Gracias! Hemos recibido tu información.',
    maxlength: 500,
  },
  redirectUrl: String,
  showPoweredBy: {
    type: Boolean,
    default: true,
  },

  // Acciones post-submit
  createContact: {
    type: Boolean,
    default: true,
  },
  createDeal: {
    type: Boolean,
    default: false,
  },
  defaultPipelineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CRMPipeline',
  },
  defaultStageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CRMStage',
  },
  defaultDealValue: Number,
  assignToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignmentType: {
    type: String,
    enum: ['specific', 'round_robin'],
    default: 'specific',
  },
  addTags: [String],
  triggerWorkflow: {
    type: Boolean,
    default: true,
  },

  // Notificaciones
  notifyOnSubmission: {
    type: Boolean,
    default: true,
  },
  notifyEmails: [String],

  // Identificación y seguridad
  formKey: {
    type: String,
    unique: true,
    index: true,
  },
  allowedDomains: [String],
  rateLimit: {
    type: Number,
    default: 100,
  },
  captchaEnabled: {
    type: Boolean,
    default: false,
  },

  // Estado
  isActive: {
    type: Boolean,
    default: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },

  // Tracking
  submissions: {
    type: Number,
    default: 0,
  },
  lastSubmissionAt: Date,

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Generar formKey antes de guardar
WebFormSchema.pre('save', function(next) {
  if (!this.formKey) {
    this.formKey = crypto.randomBytes(16).toString('hex');
  }
  next();
});

// Índices
WebFormSchema.index({ createdBy: 1, createdAt: -1 });
WebFormSchema.index({ isActive: 1, isPublished: 1 });

export default mongoose.models.WebForm || mongoose.model<IWebForm>('WebForm', WebFormSchema);

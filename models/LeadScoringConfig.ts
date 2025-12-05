import mongoose, { Schema, Model } from 'mongoose';

// Tipos de acciones de engagement
export type EngagementAction =
  // CRM Interactions
  | 'email_opened'
  | 'email_clicked'
  | 'email_replied'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'call_completed'
  | 'form_submitted'
  | 'website_visited'
  | 'document_downloaded'
  | 'demo_requested'
  // Marketing Interactions
  | 'landing_page_viewed'
  | 'landing_page_converted'
  | 'marketing_email_opened'
  | 'marketing_email_clicked'
  | 'ad_clicked'
  | 'ad_impression'
  | 'webinar_registered'
  | 'webinar_attended'
  | 'content_downloaded'
  | 'social_engagement'
  | 'chat_started';

// Operadores para reglas de FIT
export type FitOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in_list'
  | 'not_in_list'
  | 'is_empty'
  | 'is_not_empty';

// Interfaz para regla de FIT
export interface IFitRule {
  id: string;
  field: string;              // 'client.industry', 'client.employeeCount', 'contact.title', etc.
  operator: FitOperator;
  value: any;
  points: number;             // Puntos a sumar/restar
  description?: string;
}

// Interfaz para regla de ENGAGEMENT
export interface IEngagementRule {
  id: string;
  action: EngagementAction;
  points: number;             // Puntos por cada acción
  maxPointsPerDay?: number;   // Máximo de puntos por esta acción por día
  decayPerDay?: number;       // Puntos que se restan por día de inactividad
  description?: string;
}

// Interfaz principal
export interface ILeadScoringConfig {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;         // Solo uno puede ser default

  // Reglas de FIT (demográficas/firmográficas)
  fitRules: IFitRule[];
  fitWeight: number;          // Peso del fit score (0-100, default 40)

  // Reglas de ENGAGEMENT (comportamiento)
  engagementRules: IEngagementRule[];
  engagementWeight: number;   // Peso del engagement score (0-100, default 60)

  // Thresholds para temperatura
  hotThreshold: number;       // >= este valor = Hot 🔥
  warmThreshold: number;      // >= este valor = Warm 🌡️ (< hotThreshold)
                              // < warmThreshold = Cold ❄️

  // Decay settings
  enableDecay: boolean;
  decayStartDays: number;     // Días de inactividad antes de empezar decay
  decayPerDay: number;        // Puntos de engagement que se restan por día

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Lead Score Result
export interface ILeadScore {
  totalScore: number;
  fitScore: number;
  engagementScore: number;
  temperature: 'hot' | 'warm' | 'cold';
  breakdown: {
    fit: { rule: string; points: number }[];
    engagement: { action: string; points: number; count: number }[];
  };
  lastCalculatedAt: Date;
}

// Schemas
const FitRuleSchema = new Schema<IFitRule>({
  id: { type: String, required: true },
  field: { type: String, required: true },
  operator: {
    type: String,
    required: true,
    enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than',
      'less_than', 'in_list', 'not_in_list', 'is_empty', 'is_not_empty'],
  },
  value: { type: Schema.Types.Mixed },
  points: { type: Number, required: true },
  description: { type: String },
}, { _id: false });

const EngagementRuleSchema = new Schema<IEngagementRule>({
  id: { type: String, required: true },
  action: {
    type: String,
    required: true,
    enum: [
      // CRM Interactions
      'email_opened', 'email_clicked', 'email_replied', 'quote_viewed',
      'quote_accepted', 'meeting_scheduled', 'meeting_completed', 'call_completed',
      'form_submitted', 'website_visited', 'document_downloaded', 'demo_requested',
      // Marketing Interactions
      'landing_page_viewed', 'landing_page_converted', 'marketing_email_opened',
      'marketing_email_clicked', 'ad_clicked', 'ad_impression', 'webinar_registered',
      'webinar_attended', 'content_downloaded', 'social_engagement', 'chat_started',
    ],
  },
  points: { type: Number, required: true },
  maxPointsPerDay: { type: Number },
  decayPerDay: { type: Number, default: 0 },
  description: { type: String },
}, { _id: false });

const LeadScoringConfigSchema = new Schema<ILeadScoringConfig>({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  fitRules: {
    type: [FitRuleSchema],
    default: [],
  },
  fitWeight: {
    type: Number,
    default: 40,
    min: 0,
    max: 100,
  },
  engagementRules: {
    type: [EngagementRuleSchema],
    default: [],
  },
  engagementWeight: {
    type: Number,
    default: 60,
    min: 0,
    max: 100,
  },
  hotThreshold: {
    type: Number,
    default: 80,
    min: 0,
    max: 100,
  },
  warmThreshold: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },
  enableDecay: {
    type: Boolean,
    default: true,
  },
  decayStartDays: {
    type: Number,
    default: 7,
    min: 1,
  },
  decayPerDay: {
    type: Number,
    default: 2,
    min: 0,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Índices
LeadScoringConfigSchema.index({ isActive: 1, isDefault: 1 });
LeadScoringConfigSchema.index({ createdBy: 1 });

// Middleware para asegurar solo un default
LeadScoringConfigSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await mongoose.model('LeadScoringConfig').updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

const LeadScoringConfig: Model<ILeadScoringConfig> =
  mongoose.models.LeadScoringConfig ||
  mongoose.model<ILeadScoringConfig>('LeadScoringConfig', LeadScoringConfigSchema);

export default LeadScoringConfig;

// Constantes para UI
export const ENGAGEMENT_ACTION_LABELS: Record<EngagementAction, string> = {
  // CRM Interactions
  email_opened: 'Email CRM abierto',
  email_clicked: 'Click en email CRM',
  email_replied: 'Email CRM respondido',
  quote_viewed: 'Cotización vista',
  quote_accepted: 'Cotización aceptada',
  meeting_scheduled: 'Reunión agendada',
  meeting_completed: 'Reunión completada',
  call_completed: 'Llamada completada',
  form_submitted: 'Formulario enviado',
  website_visited: 'Visita a sitio web',
  document_downloaded: 'Documento descargado',
  demo_requested: 'Demo solicitado',
  // Marketing Interactions
  landing_page_viewed: 'Landing page visitada',
  landing_page_converted: 'Conversión en landing page',
  marketing_email_opened: 'Email marketing abierto',
  marketing_email_clicked: 'Click en email marketing',
  ad_clicked: 'Click en anuncio',
  ad_impression: 'Impresión de anuncio',
  webinar_registered: 'Registro en webinar',
  webinar_attended: 'Asistencia a webinar',
  content_downloaded: 'Contenido descargado',
  social_engagement: 'Interacción social',
  chat_started: 'Chat iniciado',
};

// Categorías de acciones para agrupar en UI
export const ENGAGEMENT_ACTION_CATEGORIES: Record<string, { label: string; actions: EngagementAction[] }> = {
  crm: {
    label: 'CRM',
    actions: [
      'email_opened', 'email_clicked', 'email_replied',
      'quote_viewed', 'quote_accepted',
      'meeting_scheduled', 'meeting_completed',
      'call_completed', 'form_submitted', 'demo_requested',
    ],
  },
  marketing: {
    label: 'Marketing',
    actions: [
      'landing_page_viewed', 'landing_page_converted',
      'marketing_email_opened', 'marketing_email_clicked',
      'ad_clicked', 'ad_impression',
      'webinar_registered', 'webinar_attended',
      'content_downloaded', 'social_engagement', 'chat_started',
    ],
  },
  web: {
    label: 'Web Analytics',
    actions: ['website_visited', 'document_downloaded'],
  },
};

export const FIT_OPERATOR_LABELS: Record<FitOperator, string> = {
  equals: 'es igual a',
  not_equals: 'no es igual a',
  contains: 'contiene',
  not_contains: 'no contiene',
  greater_than: 'es mayor que',
  less_than: 'es menor que',
  in_list: 'está en',
  not_in_list: 'no está en',
  is_empty: 'está vacío',
  is_not_empty: 'no está vacío',
};

// Campos disponibles para reglas de FIT
export const FIT_FIELDS = [
  { value: 'client.industry', label: 'Industria del cliente', type: 'select' },
  { value: 'client.employeeCount', label: 'Número de empleados', type: 'number' },
  { value: 'client.annualRevenue', label: 'Ingresos anuales', type: 'number' },
  { value: 'client.country', label: 'País', type: 'string' },
  { value: 'client.city', label: 'Ciudad', type: 'string' },
  { value: 'contact.title', label: 'Cargo del contacto', type: 'string' },
  { value: 'contact.department', label: 'Departamento', type: 'string' },
  { value: 'deal.value', label: 'Valor del deal', type: 'number' },
  { value: 'deal.currency', label: 'Moneda', type: 'select' },
  { value: 'deal.source', label: 'Fuente del lead', type: 'select' },
];

// Puntos sugeridos por acción
export const SUGGESTED_ENGAGEMENT_POINTS: Record<EngagementAction, number> = {
  // CRM Interactions
  email_opened: 5,
  email_clicked: 10,
  email_replied: 25,
  quote_viewed: 15,
  quote_accepted: 50,
  meeting_scheduled: 30,
  meeting_completed: 40,
  call_completed: 20,
  form_submitted: 35,
  website_visited: 3,
  document_downloaded: 15,
  demo_requested: 45,
  // Marketing Interactions
  landing_page_viewed: 5,
  landing_page_converted: 40,
  marketing_email_opened: 3,
  marketing_email_clicked: 8,
  ad_clicked: 10,
  ad_impression: 1,
  webinar_registered: 25,
  webinar_attended: 35,
  content_downloaded: 20,
  social_engagement: 5,
  chat_started: 15,
};

import mongoose, { Schema, Model } from 'mongoose';

// Trigger types
export type TriggerType =
  | 'form_submission'      // When a form is submitted
  | 'landing_page_visit'   // When landing page is visited
  | 'email_opened'         // When email is opened
  | 'email_clicked'        // When link in email is clicked
  | 'contact_created'      // When new contact is created
  | 'contact_updated'      // When contact is updated
  | 'tag_added'            // When tag is added to contact
  | 'deal_stage_changed'   // When deal stage changes
  | 'deal_won'             // When deal is won
  | 'date_based'           // On specific date/time
  | 'webhook';             // External webhook trigger

// Action types
export type ActionType =
  | 'send_email'           // Send an email
  | 'add_tag'              // Add tag to contact
  | 'remove_tag'           // Remove tag from contact
  | 'update_contact'       // Update contact fields
  | 'create_deal'          // Create a new deal
  | 'update_deal'          // Update deal
  | 'add_to_list'          // Add to marketing list
  | 'remove_from_list'     // Remove from marketing list
  | 'send_notification'    // Send internal notification
  | 'webhook'              // Call external webhook
  | 'wait'                 // Wait for time period
  | 'condition'            // Conditional branch (if/then/else)
  | 'split'                // A/B split testing
  | 'send_whatsapp'        // Send WhatsApp message
  | 'go_to';               // Jump to another action

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived';

// Trigger configuration
export interface ITriggerConfig {
  type: TriggerType;
  config: {
    formId?: string;           // For form_submission
    landingPageId?: string;    // For landing_page_visit
    campaignId?: string;       // For email triggers
    tagName?: string;          // For tag_added
    stageId?: string;          // For deal_stage_changed
    schedule?: {               // For date_based
      type: 'once' | 'recurring';
      date?: Date;
      time?: string;
      dayOfWeek?: number[];
      dayOfMonth?: number[];
    };
    webhookKey?: string;       // For webhook
  };
  filters?: {                  // Additional filters
    conditions: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }[];
    operator: 'AND' | 'OR';
  };
}

// Action configuration
export interface IActionConfig {
  id: string;
  type: ActionType;
  config: {
    // For send_email
    emailTemplateId?: string;
    emailCampaignId?: string;
    subject?: string;

    // For tags
    tagName?: string;

    // For contact/deal updates
    fields?: Record<string, any>;

    // For lists
    listId?: string;

    // For notifications
    notifyUsers?: string[];
    notificationMessage?: string;

    // For webhook
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT';
    webhookHeaders?: Record<string, string>;
    webhookBody?: string;

    // For wait
    waitDuration?: number;
    waitUnit?: 'minutes' | 'hours' | 'days';

    // For condition (if/then/else branching)
    conditions?: {
      field: string;
      operator: string;
      value: any;
    }[];
    conditionOperator?: 'AND' | 'OR';
    trueBranch?: string[];  // Action IDs for true
    falseBranch?: string[]; // Action IDs for false

    // For split (A/B testing)
    splitPercentageA?: number;  // Percentage for branch A (default 50)
    splitBranchA?: string[];    // Action IDs for branch A
    splitBranchB?: string[];    // Action IDs for branch B
    splitName?: string;         // Name of the split test

    // For go_to
    goToActionId?: string;      // Action ID to jump to

    // For WhatsApp
    whatsappTemplateId?: string;
    whatsappVariables?: Record<string, string>;
  };
  nextActionId?: string;  // For linear flow
  position?: { x: number; y: number }; // For visual editor
  // Metadata for branches
  parentActionId?: string;  // ID of parent condition/split action
  branchType?: 'true' | 'false' | 'A' | 'B' | 'main'; // Type of branch
}

// Execution log entry
export interface IExecutionLog {
  triggeredAt: Date;
  triggeredBy: {
    type: 'contact' | 'deal' | 'system' | 'webhook';
    id?: string;
  };
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  completedAt?: Date;
  actionsExecuted: {
    actionId: string;
    status: 'success' | 'failed' | 'skipped';
    executedAt: Date;
    error?: string;
    result?: any;
  }[];
  error?: string;
}

export interface IMarketingAutomation {
  _id: mongoose.Types.ObjectId;

  // Basic info
  name: string;
  description?: string;
  status: AutomationStatus;

  // Trigger
  trigger: ITriggerConfig;

  // Actions (workflow)
  actions: IActionConfig[];

  // Settings
  settings: {
    allowReentry: boolean;           // Can same contact trigger again
    reentryDelay?: number;           // Hours before re-entry allowed
    maxExecutions?: number;          // Max total executions
    timezone?: string;
    enabledDays?: number[];          // 0-6 (Sun-Sat)
    activeHoursStart?: string;       // HH:mm
    activeHoursEnd?: string;         // HH:mm
  };

  // Stats
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecutedAt?: Date;
    contactsEnrolled: number;
  };

  // Recent executions (last 100)
  executionLogs: IExecutionLog[];

  // Contacts currently in automation
  enrolledContacts: {
    contactId: mongoose.Types.ObjectId;
    enrolledAt: Date;
    currentActionId?: string;
    waitUntil?: Date;
  }[];

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definitions
const TriggerFilterSchema = new Schema({
  conditions: [{
    field: String,
    operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'] },
    value: Schema.Types.Mixed,
  }],
  operator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
}, { _id: false });

const TriggerConfigSchema = new Schema({
  type: {
    type: String,
    enum: [
      'form_submission', 'landing_page_visit', 'email_opened', 'email_clicked',
      'contact_created', 'contact_updated', 'tag_added', 'deal_stage_changed',
      'deal_won', 'date_based', 'webhook'
    ],
    required: true,
  },
  config: {
    formId: String,
    landingPageId: String,
    campaignId: String,
    tagName: String,
    stageId: String,
    schedule: {
      type: { type: String, enum: ['once', 'recurring'] },
      date: Date,
      time: String,
      dayOfWeek: [Number],
      dayOfMonth: [Number],
    },
    webhookKey: String,
  },
  filters: TriggerFilterSchema,
}, { _id: false });

const ActionConfigSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'send_email', 'add_tag', 'remove_tag', 'update_contact', 'create_deal',
      'update_deal', 'add_to_list', 'remove_from_list', 'send_notification',
      'webhook', 'wait', 'condition', 'split', 'send_whatsapp', 'go_to'
    ],
    required: true,
  },
  config: {
    emailTemplateId: String,
    emailCampaignId: String,
    subject: String,
    tagName: String,
    fields: Schema.Types.Mixed,
    listId: String,
    notifyUsers: [String],
    notificationMessage: String,
    webhookUrl: String,
    webhookMethod: { type: String, enum: ['GET', 'POST', 'PUT'] },
    webhookHeaders: Schema.Types.Mixed,
    webhookBody: String,
    waitDuration: Number,
    waitUnit: { type: String, enum: ['minutes', 'hours', 'days'] },
    // Condition branching
    conditions: [{
      field: String,
      operator: String,
      value: Schema.Types.Mixed,
    }],
    conditionOperator: { type: String, enum: ['AND', 'OR'] },
    trueBranch: [String],
    falseBranch: [String],
    // Split A/B testing
    splitPercentageA: { type: Number, default: 50 },
    splitBranchA: [String],
    splitBranchB: [String],
    splitName: String,
    // Go to
    goToActionId: String,
    // WhatsApp
    whatsappTemplateId: String,
    whatsappVariables: Schema.Types.Mixed,
  },
  nextActionId: String,
  position: {
    x: Number,
    y: Number,
  },
  parentActionId: String,
  branchType: { type: String, enum: ['true', 'false', 'A', 'B', 'main'] },
}, { _id: false });

const ExecutionLogSchema = new Schema({
  triggeredAt: { type: Date, required: true },
  triggeredBy: {
    type: { type: String, enum: ['contact', 'deal', 'system', 'webhook'] },
    id: String,
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled'],
    default: 'running',
  },
  completedAt: Date,
  actionsExecuted: [{
    actionId: String,
    status: { type: String, enum: ['success', 'failed', 'skipped'] },
    executedAt: Date,
    error: String,
    result: Schema.Types.Mixed,
  }],
  error: String,
}, { _id: false });

const EnrolledContactSchema = new Schema({
  contactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
  enrolledAt: { type: Date, default: Date.now },
  currentActionId: String,
  waitUntil: Date,
}, { _id: false });

const MarketingAutomationSchema = new Schema<IMarketingAutomation>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft',
  },

  trigger: TriggerConfigSchema,
  actions: [ActionConfigSchema],

  settings: {
    allowReentry: { type: Boolean, default: false },
    reentryDelay: Number,
    maxExecutions: Number,
    timezone: { type: String, default: 'America/Mexico_City' },
    enabledDays: [Number],
    activeHoursStart: String,
    activeHoursEnd: String,
  },

  stats: {
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
    lastExecutedAt: Date,
    contactsEnrolled: { type: Number, default: 0 },
  },

  executionLogs: {
    type: [ExecutionLogSchema],
    default: [],
  },

  enrolledContacts: {
    type: [EnrolledContactSchema],
    default: [],
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
MarketingAutomationSchema.index({ status: 1, isActive: 1 });
MarketingAutomationSchema.index({ 'trigger.type': 1, status: 1 });
MarketingAutomationSchema.index({ createdBy: 1 });
MarketingAutomationSchema.index({ 'enrolledContacts.contactId': 1 });
MarketingAutomationSchema.index({ 'enrolledContacts.waitUntil': 1 });

// Limit execution logs to last 100
MarketingAutomationSchema.pre('save', function(next) {
  if (this.executionLogs && this.executionLogs.length > 100) {
    this.executionLogs = this.executionLogs.slice(-100);
  }
  next();
});

const MarketingAutomation: Model<IMarketingAutomation> =
  mongoose.models.MarketingAutomation ||
  mongoose.model<IMarketingAutomation>('MarketingAutomation', MarketingAutomationSchema);

export default MarketingAutomation;

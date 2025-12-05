import mongoose, { Schema, Model } from 'mongoose';

export type ConditionOperator = 'AND' | 'OR';
export type ConditionType =
  | 'location'
  | 'age'
  | 'gender'
  | 'interest'
  | 'behavior'
  | 'industry'
  | 'job_title'
  | 'company_size'
  | 'skill'
  | 'custom_audience'
  | 'lookalike'
  | 'crm_client'
  | 'crm_contact'
  | 'crm_deal_stage'
  | 'website_visitor'
  | 'email_subscriber'
  | 'app_user';

export type ConditionComparator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in_list'
  | 'not_in_list';

export interface ICondition {
  id: string;
  type: ConditionType;
  comparator: ConditionComparator;
  value: string | number | string[] | { min: number; max: number };
  label?: string; // Human readable label
}

export interface IConditionGroup {
  id: string;
  operator: ConditionOperator;
  conditions: ICondition[];
}

export interface IAudienceRules {
  operator: ConditionOperator; // How groups relate to each other
  groups: IConditionGroup[];
}

export interface IMarketingAudience {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;

  // Platform compatibility
  platforms: ('META' | 'LINKEDIN' | 'TWITTER' | 'TIKTOK' | 'YOUTUBE' | 'WHATSAPP')[];

  // The segmentation rules
  rules: IAudienceRules;

  // Flattened targeting for direct use (generated from rules)
  targeting: {
    locations?: string[];
    excludedLocations?: string[];
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    interests?: string[];
    behaviors?: string[];
    industries?: string[];
    jobTitles?: string[];
    companySizes?: string[];
    skills?: string[];
    customAudiences?: string[];
    lookalikes?: string[];
  };

  // Estimated reach (can be updated via platform APIs)
  estimatedReach?: {
    min: number;
    max: number;
    lastUpdated: Date;
  };

  // CRM integration
  linkedCrmSegments?: {
    type: 'clients' | 'contacts' | 'deals';
    filter?: Record<string, any>;
    count?: number;
  }[];

  // Usage tracking
  usedInCampaigns?: mongoose.Types.ObjectId[];
  usageCount: number;

  // Metadata
  isTemplate: boolean; // System templates vs user created
  isActive: boolean;
  tags?: string[];
  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const ConditionSchema = new Schema<ICondition>({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'location', 'age', 'gender', 'interest', 'behavior',
      'industry', 'job_title', 'company_size', 'skill',
      'custom_audience', 'lookalike', 'crm_client', 'crm_contact',
      'crm_deal_stage', 'website_visitor', 'email_subscriber', 'app_user'
    ],
    required: true,
  },
  comparator: {
    type: String,
    enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'between', 'in_list', 'not_in_list'],
    required: true,
  },
  value: { type: Schema.Types.Mixed, required: true },
  label: String,
}, { _id: false });

const ConditionGroupSchema = new Schema<IConditionGroup>({
  id: { type: String, required: true },
  operator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND',
  },
  conditions: [ConditionSchema],
}, { _id: false });

const AudienceRulesSchema = new Schema<IAudienceRules>({
  operator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND',
  },
  groups: [ConditionGroupSchema],
}, { _id: false });

const MarketingAudienceSchema = new Schema<IMarketingAudience>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  platforms: [{
    type: String,
    enum: ['META', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'WHATSAPP', 'GOOGLE_ADS'],
  }],
  rules: {
    type: AudienceRulesSchema,
    required: true,
  },
  targeting: {
    locations: [String],
    excludedLocations: [String],
    ageMin: Number,
    ageMax: Number,
    genders: [String],
    interests: [String],
    behaviors: [String],
    industries: [String],
    jobTitles: [String],
    companySizes: [String],
    skills: [String],
    customAudiences: [String],
    lookalikes: [String],
  },
  estimatedReach: {
    min: Number,
    max: Number,
    lastUpdated: Date,
  },
  linkedCrmSegments: [{
    type: {
      type: String,
      enum: ['clients', 'contacts', 'deals'],
    },
    filter: Schema.Types.Mixed,
    count: Number,
  }],
  usedInCampaigns: [{
    type: Schema.Types.ObjectId,
    ref: 'MarketingCampaign',
  }],
  usageCount: {
    type: Number,
    default: 0,
  },
  isTemplate: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  tags: [String],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
MarketingAudienceSchema.index({ name: 'text', description: 'text' });
MarketingAudienceSchema.index({ platforms: 1 });
MarketingAudienceSchema.index({ isTemplate: 1, isActive: 1 });
MarketingAudienceSchema.index({ createdBy: 1 });
MarketingAudienceSchema.index({ tags: 1 });
MarketingAudienceSchema.index({ usageCount: -1 });

// Pre-save: Generate flattened targeting from rules
MarketingAudienceSchema.pre('save', function(next) {
  if (this.isModified('rules')) {
    this.targeting = generateTargetingFromRules(this.rules);
  }
  next();
});

// Helper function to flatten rules into targeting object
function generateTargetingFromRules(rules: IAudienceRules): IMarketingAudience['targeting'] {
  const targeting: IMarketingAudience['targeting'] = {
    locations: [],
    excludedLocations: [],
    interests: [],
    behaviors: [],
    industries: [],
    jobTitles: [],
    companySizes: [],
    skills: [],
    customAudiences: [],
    lookalikes: [],
    genders: [],
  };

  for (const group of rules.groups) {
    for (const condition of group.conditions) {
      const value = condition.value;

      switch (condition.type) {
        case 'location':
          if (condition.comparator === 'not_equals' || condition.comparator === 'not_in_list') {
            if (Array.isArray(value)) {
              targeting.excludedLocations?.push(...value);
            } else {
              targeting.excludedLocations?.push(value as string);
            }
          } else {
            if (Array.isArray(value)) {
              targeting.locations?.push(...value);
            } else {
              targeting.locations?.push(value as string);
            }
          }
          break;
        case 'age':
          if (typeof value === 'object' && 'min' in value && 'max' in value) {
            targeting.ageMin = value.min;
            targeting.ageMax = value.max;
          }
          break;
        case 'gender':
          if (Array.isArray(value)) {
            targeting.genders?.push(...value);
          } else {
            targeting.genders?.push(value as string);
          }
          break;
        case 'interest':
          if (Array.isArray(value)) {
            targeting.interests?.push(...value);
          } else {
            targeting.interests?.push(value as string);
          }
          break;
        case 'behavior':
          if (Array.isArray(value)) {
            targeting.behaviors?.push(...value);
          } else {
            targeting.behaviors?.push(value as string);
          }
          break;
        case 'industry':
          if (Array.isArray(value)) {
            targeting.industries?.push(...value);
          } else {
            targeting.industries?.push(value as string);
          }
          break;
        case 'job_title':
          if (Array.isArray(value)) {
            targeting.jobTitles?.push(...value);
          } else {
            targeting.jobTitles?.push(value as string);
          }
          break;
        case 'company_size':
          if (Array.isArray(value)) {
            targeting.companySizes?.push(...value);
          } else {
            targeting.companySizes?.push(value as string);
          }
          break;
        case 'skill':
          if (Array.isArray(value)) {
            targeting.skills?.push(...value);
          } else {
            targeting.skills?.push(value as string);
          }
          break;
        case 'custom_audience':
          if (Array.isArray(value)) {
            targeting.customAudiences?.push(...value);
          } else {
            targeting.customAudiences?.push(value as string);
          }
          break;
        case 'lookalike':
          if (Array.isArray(value)) {
            targeting.lookalikes?.push(...value);
          } else {
            targeting.lookalikes?.push(value as string);
          }
          break;
      }
    }
  }

  return targeting;
}

const MarketingAudience: Model<IMarketingAudience> =
  mongoose.models.MarketingAudience ||
  mongoose.model<IMarketingAudience>('MarketingAudience', MarketingAudienceSchema);

export default MarketingAudience;

import mongoose, { Document, Model, Schema } from 'mongoose';

// Types of conversions
export type ConversionType =
  | 'deal_won'
  | 'deal_created'
  | 'form_submit'
  | 'signup'
  | 'purchase'
  | 'mql'
  | 'sql'
  | 'demo_request'
  | 'trial_start'
  | 'subscription';

// Attribution models
export type AttributionModel =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'u_shaped'
  | 'w_shaped'
  | 'custom'
  | 'data_driven';

// Attribution result for a touchpoint
export interface IAttributionResult {
  model: AttributionModel;
  touchpointId: mongoose.Types.ObjectId;
  channel: string;
  source?: string;
  medium?: string;
  campaign?: string;
  credit: number; // 0-100
  attributedValue: number;
}

export interface IConversion extends Document {
  contactId: mongoose.Types.ObjectId;
  type: ConversionType;
  value: number;
  currency: string;
  dealId?: mongoose.Types.ObjectId;
  formSubmissionId?: mongoose.Types.ObjectId;
  touchpoints: mongoose.Types.ObjectId[];
  firstTouchpoint?: mongoose.Types.ObjectId;
  lastTouchpoint?: mongoose.Types.ObjectId;
  mqlTouchpoint?: mongoose.Types.ObjectId;
  attribution: IAttributionResult[];
  convertedAt: Date;
  journeyDuration: number;
  touchpointCount: number;
  metadata: Record<string, any>;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttributionResultSchema = new Schema<IAttributionResult>(
  {
    model: {
      type: String,
      required: true,
      enum: [
        'first_touch',
        'last_touch',
        'linear',
        'time_decay',
        'u_shaped',
        'w_shaped',
        'custom',
        'data_driven',
      ],
    },
    touchpointId: {
      type: Schema.Types.ObjectId,
      ref: 'Touchpoint',
      required: true,
    },
    channel: {
      type: String,
      required: true,
    },
    source: String,
    medium: String,
    campaign: String,
    credit: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    attributedValue: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const ConversionSchema = new Schema<IConversion>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'deal_won',
        'deal_created',
        'form_submit',
        'signup',
        'purchase',
        'mql',
        'sql',
        'demo_request',
        'trial_start',
        'subscription',
      ],
      index: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'MXN',
    },
    dealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      index: true,
    },
    formSubmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'FormSubmission',
    },
    touchpoints: [{
      type: Schema.Types.ObjectId,
      ref: 'Touchpoint',
    }],
    firstTouchpoint: {
      type: Schema.Types.ObjectId,
      ref: 'Touchpoint',
    },
    lastTouchpoint: {
      type: Schema.Types.ObjectId,
      ref: 'Touchpoint',
    },
    mqlTouchpoint: {
      type: Schema.Types.ObjectId,
      ref: 'Touchpoint',
    },
    attribution: [AttributionResultSchema],
    convertedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    journeyDuration: {
      type: Number,
      default: 0,
    },
    touchpointCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
ConversionSchema.index({ type: 1, convertedAt: -1 });
ConversionSchema.index({ contactId: 1, convertedAt: -1 });
ConversionSchema.index({ 'attribution.channel': 1, convertedAt: -1 });
ConversionSchema.index({ 'attribution.campaign': 1, convertedAt: -1 });

// Static method to get overview stats
ConversionSchema.statics.getOverview = async function(
  startDate: Date,
  endDate: Date
) {
  const pipeline = [
    {
      $match: {
        convertedAt: { $gte: startDate, $lte: endDate },
        isProcessed: true,
      },
    },
    {
      $group: {
        _id: null,
        totalConversions: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgJourneyDuration: { $avg: '$journeyDuration' },
        avgTouchpoints: { $avg: '$touchpointCount' },
        byType: {
          $push: { type: '$type', value: '$value' },
        },
      },
    },
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalConversions: 0,
    totalValue: 0,
    avgJourneyDuration: 0,
    avgTouchpoints: 0,
    byType: [],
  };
};

// Static method to get attribution by channel
ConversionSchema.statics.getAttributionByChannel = async function(
  startDate: Date,
  endDate: Date,
  model: AttributionModel = 'linear'
) {
  return this.aggregate([
    {
      $match: {
        convertedAt: { $gte: startDate, $lte: endDate },
        isProcessed: true,
      },
    },
    { $unwind: '$attribution' },
    {
      $match: {
        'attribution.model': model,
      },
    },
    {
      $group: {
        _id: '$attribution.channel',
        conversions: { $sum: 1 },
        totalCredit: { $sum: '$attribution.credit' },
        totalAttributedValue: { $sum: '$attribution.attributedValue' },
        touchpointCount: { $sum: 1 },
      },
    },
    {
      $project: {
        channel: '$_id',
        conversions: 1,
        avgCredit: { $divide: ['$totalCredit', '$touchpointCount'] },
        totalAttributedValue: 1,
      },
    },
    { $sort: { totalAttributedValue: -1 } },
  ]);
};

// Static method to get attribution by campaign
ConversionSchema.statics.getAttributionByCampaign = async function(
  startDate: Date,
  endDate: Date,
  model: AttributionModel = 'linear',
  limit: number = 20
) {
  return this.aggregate([
    {
      $match: {
        convertedAt: { $gte: startDate, $lte: endDate },
        isProcessed: true,
      },
    },
    { $unwind: '$attribution' },
    {
      $match: {
        'attribution.model': model,
        'attribution.campaign': { $ne: null, $exists: true },
      },
    },
    {
      $group: {
        _id: {
          campaign: '$attribution.campaign',
          source: '$attribution.source',
          medium: '$attribution.medium',
        },
        conversions: { $sum: 1 },
        totalCredit: { $sum: '$attribution.credit' },
        totalAttributedValue: { $sum: '$attribution.attributedValue' },
        channels: { $addToSet: '$attribution.channel' },
      },
    },
    {
      $project: {
        campaign: '$_id.campaign',
        source: '$_id.source',
        medium: '$_id.medium',
        conversions: 1,
        avgCredit: { $divide: ['$totalCredit', '$conversions'] },
        totalAttributedValue: 1,
        channels: 1,
      },
    },
    { $sort: { totalAttributedValue: -1 } },
    { $limit: limit },
  ]);
};

// Static method to compare attribution models
ConversionSchema.statics.compareModels = async function(
  startDate: Date,
  endDate: Date,
  models: AttributionModel[] = ['first_touch', 'last_touch', 'linear', 'u_shaped']
) {
  const results: Record<string, any> = {};

  for (const model of models) {
    const channelData = await this.aggregate([
      {
        $match: {
          convertedAt: { $gte: startDate, $lte: endDate },
          isProcessed: true,
        },
      },
      { $unwind: '$attribution' },
      { $match: { 'attribution.model': model } },
      {
        $group: {
          _id: '$attribution.channel',
          attributedValue: { $sum: '$attribution.attributedValue' },
          conversions: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          channel: '$_id',
          attributedValue: 1,
          conversions: { $size: '$conversions' },
        },
      },
      { $sort: { attributedValue: -1 } },
    ]);

    results[model] = channelData;
  }

  return results;
};

// Static method to get conversion paths
ConversionSchema.statics.getConversionPaths = async function(
  startDate: Date,
  endDate: Date,
  limit: number = 10
) {
  return this.aggregate([
    {
      $match: {
        convertedAt: { $gte: startDate, $lte: endDate },
        isProcessed: true,
        touchpointCount: { $gt: 0 },
      },
    },
    {
      $lookup: {
        from: 'touchpoints',
        localField: 'touchpoints',
        foreignField: '_id',
        as: 'touchpointDetails',
      },
    },
    {
      $addFields: {
        path: {
          $map: {
            input: '$touchpointDetails',
            as: 'tp',
            in: '$$tp.channel',
          },
        },
      },
    },
    {
      $group: {
        _id: '$path',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgJourneyDuration: { $avg: '$journeyDuration' },
      },
    },
    {
      $project: {
        path: '$_id',
        count: 1,
        totalValue: 1,
        avgJourneyDuration: 1,
        avgValuePerConversion: { $divide: ['$totalValue', '$count'] },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

// Interface for static methods
interface IConversionModel extends Model<IConversion> {
  getOverview(startDate: Date, endDate: Date): Promise<any>;
  getAttributionByChannel(startDate: Date, endDate: Date, model?: AttributionModel): Promise<any[]>;
  getAttributionByCampaign(startDate: Date, endDate: Date, model?: AttributionModel, limit?: number): Promise<any[]>;
  compareModels(startDate: Date, endDate: Date, models?: AttributionModel[]): Promise<Record<string, any>>;
  getConversionPaths(startDate: Date, endDate: Date, limit?: number): Promise<any[]>;
}

const Conversion = (mongoose.models.Conversion as IConversionModel) ||
  mongoose.model<IConversion, IConversionModel>('Conversion', ConversionSchema);

export default Conversion;

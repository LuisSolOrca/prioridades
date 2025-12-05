import mongoose from 'mongoose';
import Touchpoint, { ITouchpoint, MarketingChannel } from '@/models/Touchpoint';
import Conversion, { IConversion, AttributionModel, IAttributionResult } from '@/models/Conversion';

export interface TouchpointData {
  _id: mongoose.Types.ObjectId;
  channel: MarketingChannel;
  source?: string;
  medium?: string;
  campaign?: string;
  occurredAt: Date;
  type: string;
}

export interface AttributionConfig {
  models: AttributionModel[];
  customWeights?: Record<MarketingChannel, number>;
  timeDecayHalfLife?: number; // Days
}

const DEFAULT_CONFIG: AttributionConfig = {
  models: ['first_touch', 'last_touch', 'linear', 'time_decay', 'u_shaped'],
  timeDecayHalfLife: 7, // 7-day half-life for time decay
};

// Calculate first touch attribution
function calculateFirstTouch(
  touchpoints: TouchpointData[],
  conversionValue: number
): IAttributionResult[] {
  if (touchpoints.length === 0) return [];

  const first = touchpoints[0];
  return [{
    model: 'first_touch',
    touchpointId: first._id,
    channel: first.channel,
    source: first.source,
    medium: first.medium,
    campaign: first.campaign,
    credit: 100,
    attributedValue: conversionValue,
  }];
}

// Calculate last touch attribution
function calculateLastTouch(
  touchpoints: TouchpointData[],
  conversionValue: number
): IAttributionResult[] {
  if (touchpoints.length === 0) return [];

  const last = touchpoints[touchpoints.length - 1];
  return [{
    model: 'last_touch',
    touchpointId: last._id,
    channel: last.channel,
    source: last.source,
    medium: last.medium,
    campaign: last.campaign,
    credit: 100,
    attributedValue: conversionValue,
  }];
}

// Calculate linear attribution (equal distribution)
function calculateLinear(
  touchpoints: TouchpointData[],
  conversionValue: number
): IAttributionResult[] {
  if (touchpoints.length === 0) return [];

  const equalCredit = 100 / touchpoints.length;
  const equalValue = conversionValue / touchpoints.length;

  return touchpoints.map(tp => ({
    model: 'linear' as AttributionModel,
    touchpointId: tp._id,
    channel: tp.channel,
    source: tp.source,
    medium: tp.medium,
    campaign: tp.campaign,
    credit: equalCredit,
    attributedValue: equalValue,
  }));
}

// Calculate time decay attribution
function calculateTimeDecay(
  touchpoints: TouchpointData[],
  conversionValue: number,
  conversionDate: Date,
  halfLifeDays: number = 7
): IAttributionResult[] {
  if (touchpoints.length === 0) return [];

  const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
  const conversionTime = conversionDate.getTime();

  // Calculate raw weights based on time decay
  const rawWeights = touchpoints.map(tp => {
    const timeDiff = conversionTime - new Date(tp.occurredAt).getTime();
    return Math.pow(0.5, timeDiff / halfLifeMs);
  });

  // Normalize weights to sum to 100
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = rawWeights.map(w => (w / totalWeight) * 100);

  return touchpoints.map((tp, i) => ({
    model: 'time_decay' as AttributionModel,
    touchpointId: tp._id,
    channel: tp.channel,
    source: tp.source,
    medium: tp.medium,
    campaign: tp.campaign,
    credit: normalizedWeights[i],
    attributedValue: conversionValue * (normalizedWeights[i] / 100),
  }));
}

// Calculate U-shaped attribution (40% first, 40% last, 20% middle)
function calculateUShaped(
  touchpoints: TouchpointData[],
  conversionValue: number
): IAttributionResult[] {
  if (touchpoints.length === 0) return [];

  if (touchpoints.length === 1) {
    return calculateFirstTouch(touchpoints, conversionValue);
  }

  if (touchpoints.length === 2) {
    // Split 50-50 between first and last
    return [
      {
        model: 'u_shaped' as AttributionModel,
        touchpointId: touchpoints[0]._id,
        channel: touchpoints[0].channel,
        source: touchpoints[0].source,
        medium: touchpoints[0].medium,
        campaign: touchpoints[0].campaign,
        credit: 50,
        attributedValue: conversionValue * 0.5,
      },
      {
        model: 'u_shaped' as AttributionModel,
        touchpointId: touchpoints[1]._id,
        channel: touchpoints[1].channel,
        source: touchpoints[1].source,
        medium: touchpoints[1].medium,
        campaign: touchpoints[1].campaign,
        credit: 50,
        attributedValue: conversionValue * 0.5,
      },
    ];
  }

  const middleTouchpoints = touchpoints.slice(1, -1);
  const middleCredit = 20 / middleTouchpoints.length;
  const middleValue = conversionValue * 0.2 / middleTouchpoints.length;

  const results: IAttributionResult[] = [
    {
      model: 'u_shaped',
      touchpointId: touchpoints[0]._id,
      channel: touchpoints[0].channel,
      source: touchpoints[0].source,
      medium: touchpoints[0].medium,
      campaign: touchpoints[0].campaign,
      credit: 40,
      attributedValue: conversionValue * 0.4,
    },
  ];

  middleTouchpoints.forEach(tp => {
    results.push({
      model: 'u_shaped',
      touchpointId: tp._id,
      channel: tp.channel,
      source: tp.source,
      medium: tp.medium,
      campaign: tp.campaign,
      credit: middleCredit,
      attributedValue: middleValue,
    });
  });

  results.push({
    model: 'u_shaped',
    touchpointId: touchpoints[touchpoints.length - 1]._id,
    channel: touchpoints[touchpoints.length - 1].channel,
    source: touchpoints[touchpoints.length - 1].source,
    medium: touchpoints[touchpoints.length - 1].medium,
    campaign: touchpoints[touchpoints.length - 1].campaign,
    credit: 40,
    attributedValue: conversionValue * 0.4,
  });

  return results;
}

// Calculate W-shaped attribution (30% first, 30% MQL, 30% last, 10% rest)
function calculateWShaped(
  touchpoints: TouchpointData[],
  conversionValue: number,
  mqlTouchpointIndex?: number
): IAttributionResult[] {
  if (touchpoints.length === 0) return [];

  if (touchpoints.length <= 3) {
    return calculateLinear(touchpoints, conversionValue).map(r => ({
      ...r,
      model: 'w_shaped' as AttributionModel,
    }));
  }

  // If no MQL touchpoint specified, use the middle one
  const mqlIdx = mqlTouchpointIndex ?? Math.floor(touchpoints.length / 2);

  const keyIndices = [0, mqlIdx, touchpoints.length - 1];
  const otherIndices = touchpoints
    .map((_, i) => i)
    .filter(i => !keyIndices.includes(i));

  const otherCredit = otherIndices.length > 0 ? 10 / otherIndices.length : 0;
  const otherValue = conversionValue * 0.1 / Math.max(otherIndices.length, 1);

  const results: IAttributionResult[] = [];

  touchpoints.forEach((tp, i) => {
    let credit: number;
    let value: number;

    if (i === 0 || i === mqlIdx || i === touchpoints.length - 1) {
      credit = 30;
      value = conversionValue * 0.3;
    } else {
      credit = otherCredit;
      value = otherValue;
    }

    results.push({
      model: 'w_shaped',
      touchpointId: tp._id,
      channel: tp.channel,
      source: tp.source,
      medium: tp.medium,
      campaign: tp.campaign,
      credit,
      attributedValue: value,
    });
  });

  return results;
}

// Calculate custom weighted attribution
function calculateCustom(
  touchpoints: TouchpointData[],
  conversionValue: number,
  customWeights: Record<MarketingChannel, number>
): IAttributionResult[] {
  if (touchpoints.length === 0) return [];

  // Get weights for each touchpoint's channel
  const weights = touchpoints.map(tp => customWeights[tp.channel] || 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  return touchpoints.map((tp, i) => {
    const normalizedWeight = (weights[i] / totalWeight) * 100;
    return {
      model: 'custom' as AttributionModel,
      touchpointId: tp._id,
      channel: tp.channel,
      source: tp.source,
      medium: tp.medium,
      campaign: tp.campaign,
      credit: normalizedWeight,
      attributedValue: conversionValue * (normalizedWeight / 100),
    };
  });
}

// Main function to calculate attribution for all models
export function calculateAttribution(
  touchpoints: TouchpointData[],
  conversionValue: number,
  conversionDate: Date,
  config: AttributionConfig = DEFAULT_CONFIG
): IAttributionResult[] {
  const allResults: IAttributionResult[] = [];

  for (const model of config.models) {
    let results: IAttributionResult[] = [];

    switch (model) {
      case 'first_touch':
        results = calculateFirstTouch(touchpoints, conversionValue);
        break;
      case 'last_touch':
        results = calculateLastTouch(touchpoints, conversionValue);
        break;
      case 'linear':
        results = calculateLinear(touchpoints, conversionValue);
        break;
      case 'time_decay':
        results = calculateTimeDecay(
          touchpoints,
          conversionValue,
          conversionDate,
          config.timeDecayHalfLife
        );
        break;
      case 'u_shaped':
        results = calculateUShaped(touchpoints, conversionValue);
        break;
      case 'w_shaped':
        results = calculateWShaped(touchpoints, conversionValue);
        break;
      case 'custom':
        if (config.customWeights) {
          results = calculateCustom(touchpoints, conversionValue, config.customWeights);
        }
        break;
      // data_driven would require ML implementation
    }

    allResults.push(...results);
  }

  return allResults;
}

// Process a conversion - get touchpoints and calculate attribution
export async function processConversion(
  conversionId: mongoose.Types.ObjectId,
  config: AttributionConfig = DEFAULT_CONFIG
): Promise<IConversion | null> {
  const conversion = await Conversion.findById(conversionId);
  if (!conversion || conversion.isProcessed) return conversion;

  // Get all touchpoints for this contact before conversion
  const touchpoints = await Touchpoint.find({
    contactId: conversion.contactId,
    occurredAt: { $lte: conversion.convertedAt },
  })
    .sort({ occurredAt: 1 })
    .lean();

  if (touchpoints.length === 0) {
    conversion.isProcessed = true;
    conversion.touchpointCount = 0;
    await conversion.save();
    return conversion;
  }

  // Convert to TouchpointData
  const touchpointData: TouchpointData[] = touchpoints.map(tp => ({
    _id: tp._id as mongoose.Types.ObjectId,
    channel: tp.channel as MarketingChannel,
    source: tp.source,
    medium: tp.medium,
    campaign: tp.campaign,
    occurredAt: tp.occurredAt,
    type: tp.type,
  }));

  // Calculate attribution
  const attribution = calculateAttribution(
    touchpointData,
    conversion.value,
    conversion.convertedAt,
    config
  );

  // Calculate journey duration
  const firstTouchpoint = touchpoints[0];
  const lastTouchpoint = touchpoints[touchpoints.length - 1];
  const journeyDuration = Math.ceil(
    (conversion.convertedAt.getTime() - new Date(firstTouchpoint.occurredAt).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  // Update conversion
  conversion.touchpoints = touchpoints.map(tp => tp._id as mongoose.Types.ObjectId);
  conversion.firstTouchpoint = firstTouchpoint._id as mongoose.Types.ObjectId;
  conversion.lastTouchpoint = lastTouchpoint._id as mongoose.Types.ObjectId;
  conversion.attribution = attribution;
  conversion.journeyDuration = journeyDuration;
  conversion.touchpointCount = touchpoints.length;
  conversion.isProcessed = true;

  await conversion.save();
  return conversion;
}

// Recalculate attribution for all unprocessed conversions
export async function processUnprocessedConversions(
  config: AttributionConfig = DEFAULT_CONFIG,
  limit: number = 100
): Promise<number> {
  const unprocessed = await Conversion.find({ isProcessed: false })
    .limit(limit)
    .select('_id')
    .lean() as unknown as { _id: mongoose.Types.ObjectId }[];

  let processed = 0;
  for (const conv of unprocessed) {
    await processConversion(conv._id, config);
    processed++;
  }

  return processed;
}

// Recalculate all conversions for a date range
export async function recalculateAttribution(
  startDate: Date,
  endDate: Date,
  config: AttributionConfig = DEFAULT_CONFIG
): Promise<number> {
  // Reset isProcessed for conversions in range
  await Conversion.updateMany(
    { convertedAt: { $gte: startDate, $lte: endDate } },
    { $set: { isProcessed: false, attribution: [] } }
  );

  const conversions = await Conversion.find({
    convertedAt: { $gte: startDate, $lte: endDate },
    isProcessed: false,
  }).select('_id').lean() as unknown as { _id: mongoose.Types.ObjectId }[];

  let processed = 0;
  for (const conv of conversions) {
    await processConversion(conv._id, config);
    processed++;
  }

  return processed;
}

// Create conversion from deal won
export async function createDealConversion(
  dealId: mongoose.Types.ObjectId,
  contactId: mongoose.Types.ObjectId,
  value: number,
  currency: string = 'MXN',
  closedAt: Date = new Date()
): Promise<IConversion> {
  const conversion = new Conversion({
    contactId,
    type: 'deal_won',
    value,
    currency,
    dealId,
    convertedAt: closedAt,
    isProcessed: false,
  });

  await conversion.save();

  // Process immediately
  await processConversion(conversion._id as mongoose.Types.ObjectId);

  return conversion;
}

// Create conversion from form submission
export async function createFormConversion(
  contactId: mongoose.Types.ObjectId,
  formSubmissionId: mongoose.Types.ObjectId,
  submittedAt: Date = new Date()
): Promise<IConversion> {
  const conversion = new Conversion({
    contactId,
    type: 'form_submit',
    value: 0,
    formSubmissionId,
    convertedAt: submittedAt,
    isProcessed: false,
  });

  await conversion.save();

  // Process immediately
  await processConversion(conversion._id as mongoose.Types.ObjectId);

  return conversion;
}

// Get ROI by channel
export async function getChannelROI(
  startDate: Date,
  endDate: Date,
  channelCosts: Record<MarketingChannel, number>,
  model: AttributionModel = 'linear'
): Promise<Record<MarketingChannel, { revenue: number; cost: number; roi: number }>> {
  const attribution = await Conversion.getAttributionByChannel(startDate, endDate, model);

  const result: Record<MarketingChannel, { revenue: number; cost: number; roi: number }> = {} as any;

  for (const item of attribution) {
    const channel = item.channel as MarketingChannel;
    const revenue = item.totalAttributedValue || 0;
    const cost = channelCosts[channel] || 0;
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

    result[channel] = { revenue, cost, roi };
  }

  return result;
}

export default {
  calculateAttribution,
  processConversion,
  processUnprocessedConversions,
  recalculateAttribution,
  createDealConversion,
  createFormConversion,
  getChannelROI,
};

import LeadScoringConfig, {
  ILeadScoringConfig,
  IFitRule,
  IEngagementRule,
  EngagementAction,
  FitOperator,
} from '@/models/LeadScoringConfig';
import Deal from '@/models/Deal';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import Activity from '@/models/Activity';
import EmailTracking from '@/models/EmailTracking';
import Touchpoint from '@/models/Touchpoint';
import LandingPageView from '@/models/LandingPageView';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import WebAnalyticsEvent from '@/models/WebAnalyticsEvent';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export interface ScoreResult {
  totalScore: number;
  fitScore: number;
  engagementScore: number;
  temperature: 'hot' | 'warm' | 'cold';
  breakdown: {
    fit: { rule: string; points: number }[];
    engagement: { action: string; points: number; count: number }[];
  };
}

// Obtener configuración activa
async function getActiveConfig(): Promise<ILeadScoringConfig | null> {
  await connectDB();

  // Primero buscar el default activo
  let config = await LeadScoringConfig.findOne({ isDefault: true, isActive: true });

  // Si no hay default, buscar cualquier config activa
  if (!config) {
    config = await LeadScoringConfig.findOne({ isActive: true });
  }

  return config;
}

// Evaluar una regla de FIT
function evaluateFitRule(
  rule: IFitRule,
  data: { deal?: any; contact?: any; client?: any }
): number {
  const { field, operator, value } = rule;

  // Parsear el campo (e.g., 'client.industry' -> { entity: 'client', field: 'industry' })
  const [entity, fieldName] = field.split('.');
  const entityData = data[entity as keyof typeof data];

  if (!entityData) return 0;

  const fieldValue = entityData[fieldName];

  // Evaluar según el operador
  let matches = false;

  switch (operator as FitOperator) {
    case 'equals':
      matches = fieldValue === value;
      break;
    case 'not_equals':
      matches = fieldValue !== value;
      break;
    case 'contains':
      matches = typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(String(value).toLowerCase());
      break;
    case 'not_contains':
      matches = typeof fieldValue === 'string' && !fieldValue.toLowerCase().includes(String(value).toLowerCase());
      break;
    case 'greater_than':
      matches = typeof fieldValue === 'number' && fieldValue > Number(value);
      break;
    case 'less_than':
      matches = typeof fieldValue === 'number' && fieldValue < Number(value);
      break;
    case 'in_list':
      const inList = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
      matches = inList.includes(String(fieldValue));
      break;
    case 'not_in_list':
      const notInList = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
      matches = !notInList.includes(String(fieldValue));
      break;
    case 'is_empty':
      matches = !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');
      break;
    case 'is_not_empty':
      matches = !!fieldValue && (typeof fieldValue !== 'string' || fieldValue.trim() !== '');
      break;
  }

  return matches ? rule.points : 0;
}

// Obtener acciones de engagement para un deal/contacto
async function getEngagementActions(
  dealId?: string,
  contactId?: string,
  clientId?: string,
  daysBack: number = 90
): Promise<Map<EngagementAction, number>> {
  const actions = new Map<EngagementAction, number>();
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  // Helper para incrementar conteo
  const addAction = (action: EngagementAction, count: number) => {
    if (count > 0) {
      actions.set(action, (actions.get(action) || 0) + count);
    }
  };

  // ========================================
  // 1. CRM Activities (calls, meetings, etc.)
  // ========================================
  const activityFilter: any = { createdAt: { $gte: since } };
  if (dealId) activityFilter.dealId = dealId;
  if (contactId) activityFilter.contactId = contactId;
  if (clientId) activityFilter.clientId = clientId;

  const activities = await Activity.aggregate([
    { $match: activityFilter },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  const activityTypeMap: Record<string, EngagementAction> = {
    call: 'call_completed',
    meeting: 'meeting_completed',
    email: 'email_replied',
    task: 'form_submitted', // Tasks creadas desde formularios
  };

  activities.forEach((a: { _id: string; count: number }) => {
    const action = activityTypeMap[a._id];
    if (action) addAction(action, a.count);
  });

  // ========================================
  // 2. CRM Email Tracking (emails enviados desde CRM)
  // ========================================
  if (dealId || contactId) {
    const emailFilter: any = { sentAt: { $gte: since } };
    if (dealId) emailFilter.dealId = dealId;
    if (contactId) emailFilter.contactId = contactId;

    const emailStats = await EmailTracking.aggregate([
      { $match: emailFilter },
      {
        $group: {
          _id: null,
          opened: { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
          replied: { $sum: { $cond: [{ $ne: ['$repliedAt', null] }, 1, 0] } },
        },
      },
    ]);

    if (emailStats.length > 0) {
      const stats = emailStats[0];
      addAction('email_opened', stats.opened);
      addAction('email_clicked', stats.clicked);
      addAction('email_replied', stats.replied);
    }
  }

  // ========================================
  // 3. Quotes (cotizaciones)
  // ========================================
  try {
    const Quote = mongoose.models.Quote;
    if (Quote && dealId) {
      const quoteStats = await Quote.aggregate([
        { $match: { dealId: new mongoose.Types.ObjectId(dealId), createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            viewed: { $sum: { $cond: [{ $ne: ['$viewedAt', null] }, 1, 0] } },
            accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          },
        },
      ]);

      if (quoteStats.length > 0) {
        const stats = quoteStats[0];
        addAction('quote_viewed', stats.viewed);
        addAction('quote_accepted', stats.accepted);
      }
    }
  } catch (e) {
    // Quote model may not exist
  }

  // ========================================
  // 4. Marketing Touchpoints
  // ========================================
  if (contactId) {
    const touchpointStats = await Touchpoint.aggregate([
      {
        $match: {
          contactId: new mongoose.Types.ObjectId(contactId),
          occurredAt: { $gte: since },
        },
      },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Mapear tipos de touchpoint a acciones de engagement
    const touchpointTypeMap: Record<string, EngagementAction> = {
      landing_page_view: 'landing_page_viewed',
      landing_page_conversion: 'landing_page_converted',
      ad_click: 'ad_clicked',
      ad_impression: 'ad_impression',
      form_submission: 'form_submitted',
      content_download: 'content_downloaded',
      webinar_registration: 'webinar_registered',
      webinar_attendance: 'webinar_attended',
      social_engagement: 'social_engagement',
      chat_started: 'chat_started',
      meeting_booked: 'meeting_scheduled',
      email_open: 'marketing_email_opened',
      email_click: 'marketing_email_clicked',
    };

    touchpointStats.forEach((tp: { _id: string; count: number }) => {
      const action = touchpointTypeMap[tp._id];
      if (action) addAction(action, tp.count);
    });
  }

  // ========================================
  // 5. Marketing Email Campaigns (Resend/bulk)
  // ========================================
  if (contactId) {
    const campaignRecipientStats = await EmailCampaignRecipient.aggregate([
      {
        $match: {
          contactId: new mongoose.Types.ObjectId(contactId),
          sentAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          opened: { $sum: { $cond: ['$opened', 1, 0] } },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
        },
      },
    ]);

    if (campaignRecipientStats.length > 0) {
      const stats = campaignRecipientStats[0];
      addAction('marketing_email_opened', stats.opened);
      addAction('marketing_email_clicked', stats.clicked);
    }
  }

  // ========================================
  // 6. Landing Page Views (additional tracking)
  // ========================================
  if (contactId) {
    // Buscar visitorId asociado al contacto desde touchpoints
    const contactTouchpoint = await Touchpoint.findOne({
      contactId: new mongoose.Types.ObjectId(contactId),
    }).select('visitorId').lean();

    if (contactTouchpoint?.visitorId) {
      const lpStats = await LandingPageView.aggregate([
        {
          $match: {
            visitorId: contactTouchpoint.visitorId,
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: null,
            views: { $sum: 1 },
            conversions: { $sum: { $cond: ['$converted', 1, 0] } },
          },
        },
      ]);

      if (lpStats.length > 0) {
        const stats = lpStats[0];
        addAction('landing_page_viewed', stats.views);
        addAction('landing_page_converted', stats.conversions);
      }
    }
  }

  // ========================================
  // 7. Web Analytics Events (downloads, page views)
  // ========================================
  if (contactId) {
    const webAnalyticsStats = await WebAnalyticsEvent.aggregate([
      {
        $match: {
          linkedContactId: new mongoose.Types.ObjectId(contactId),
          eventTimestamp: { $gte: since },
        },
      },
      { $group: { _id: '$eventCategory', count: { $sum: 1 } } },
    ]);

    const webAnalyticsMap: Record<string, EngagementAction> = {
      PAGE_VIEW: 'website_visited',
      DOWNLOAD: 'document_downloaded',
      FORM_SUBMIT: 'form_submitted',
    };

    webAnalyticsStats.forEach((wa: { _id: string; count: number }) => {
      const action = webAnalyticsMap[wa._id];
      if (action) addAction(action, wa.count);
    });
  }

  return actions;
}

// Calcular score de engagement
function calculateEngagementScore(
  rules: IEngagementRule[],
  actions: Map<EngagementAction, number>,
  daysSinceLastEngagement: number,
  config: ILeadScoringConfig
): { score: number; breakdown: { action: string; points: number; count: number }[] } {
  let score = 0;
  const breakdown: { action: string; points: number; count: number }[] = [];

  // Calcular puntos por acción
  rules.forEach(rule => {
    const count = actions.get(rule.action) || 0;
    if (count > 0) {
      let points = rule.points * count;

      // Aplicar máximo diario si está configurado
      if (rule.maxPointsPerDay) {
        points = Math.min(points, rule.maxPointsPerDay);
      }

      score += points;
      breakdown.push({
        action: rule.action,
        points,
        count,
      });
    }
  });

  // Aplicar decay si está habilitado
  if (config.enableDecay && daysSinceLastEngagement > config.decayStartDays) {
    const decayDays = daysSinceLastEngagement - config.decayStartDays;
    const decay = decayDays * config.decayPerDay;
    score = Math.max(0, score - decay);
  }

  return { score, breakdown };
}

// Determinar temperatura basada en score y thresholds
function getTemperature(
  score: number,
  config: ILeadScoringConfig
): 'hot' | 'warm' | 'cold' {
  if (score >= config.hotThreshold) return 'hot';
  if (score >= config.warmThreshold) return 'warm';
  return 'cold';
}

// Calcular score para un Deal
export async function calculateDealScore(dealId: string): Promise<ScoreResult | null> {
  await connectDB();

  const config = await getActiveConfig();
  if (!config) {
    console.log('No active lead scoring config found');
    return null;
  }

  const deal = await Deal.findById(dealId)
    .populate('clientId')
    .populate('contactId')
    .lean();

  if (!deal) return null;

  // Preparar datos para evaluación de FIT
  const data = {
    deal,
    client: deal.clientId,
    contact: deal.contactId,
  };

  // Calcular FIT score
  let fitScore = 0;
  const fitBreakdown: { rule: string; points: number }[] = [];

  config.fitRules.forEach(rule => {
    const points = evaluateFitRule(rule, data);
    if (points !== 0) {
      fitScore += points;
      fitBreakdown.push({
        rule: rule.description || rule.field,
        points,
      });
    }
  });

  // Normalizar FIT score (0-100)
  const maxFitPoints = config.fitRules.reduce((sum, r) => sum + Math.max(0, r.points), 0);
  const normalizedFitScore = maxFitPoints > 0 ? Math.min(100, (fitScore / maxFitPoints) * 100) : 0;

  // Obtener acciones de engagement
  const actions = await getEngagementActions(dealId, deal.contactId?.toString(), deal.clientId?.toString());

  // Calcular días desde último engagement
  const lastEngagement = deal.lastEngagementAt || deal.createdAt;
  const daysSinceLastEngagement = Math.floor(
    (Date.now() - new Date(lastEngagement).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calcular ENGAGEMENT score
  const engagementResult = calculateEngagementScore(
    config.engagementRules,
    actions,
    daysSinceLastEngagement,
    config
  );

  // Normalizar engagement score (0-100)
  const maxEngagementPoints = config.engagementRules.reduce((sum, r) => sum + r.points * 5, 0); // Asumiendo max 5 de cada acción
  const normalizedEngagementScore = maxEngagementPoints > 0
    ? Math.min(100, (engagementResult.score / maxEngagementPoints) * 100)
    : 0;

  // Calcular score total ponderado
  const totalScore = Math.round(
    (normalizedFitScore * config.fitWeight / 100) +
    (normalizedEngagementScore * config.engagementWeight / 100)
  );

  const temperature = getTemperature(totalScore, config);

  return {
    totalScore,
    fitScore: Math.round(normalizedFitScore),
    engagementScore: Math.round(normalizedEngagementScore),
    temperature,
    breakdown: {
      fit: fitBreakdown,
      engagement: engagementResult.breakdown,
    },
  };
}

// Calcular score para un Contact
export async function calculateContactScore(contactId: string): Promise<ScoreResult | null> {
  await connectDB();

  const config = await getActiveConfig();
  if (!config) return null;

  const contact = await Contact.findById(contactId)
    .populate('clientId')
    .lean();

  if (!contact) return null;

  // Preparar datos para evaluación de FIT
  const data = {
    contact,
    client: contact.clientId,
  };

  // Calcular FIT score
  let fitScore = 0;
  const fitBreakdown: { rule: string; points: number }[] = [];

  config.fitRules.forEach(rule => {
    const points = evaluateFitRule(rule, data);
    if (points !== 0) {
      fitScore += points;
      fitBreakdown.push({
        rule: rule.description || rule.field,
        points,
      });
    }
  });

  // Normalizar FIT score (0-100)
  const maxFitPoints = config.fitRules.reduce((sum, r) => sum + Math.max(0, r.points), 0);
  const normalizedFitScore = maxFitPoints > 0 ? Math.min(100, (fitScore / maxFitPoints) * 100) : 0;

  // Obtener acciones de engagement
  const actions = await getEngagementActions(undefined, contactId, contact.clientId?.toString());

  // Calcular días desde último engagement
  const lastEngagement = contact.lastEngagementAt || contact.createdAt;
  const daysSinceLastEngagement = Math.floor(
    (Date.now() - new Date(lastEngagement).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calcular ENGAGEMENT score
  const engagementResult = calculateEngagementScore(
    config.engagementRules,
    actions,
    daysSinceLastEngagement,
    config
  );

  // Normalizar engagement score (0-100)
  const maxEngagementPoints = config.engagementRules.reduce((sum, r) => sum + r.points * 5, 0);
  const normalizedEngagementScore = maxEngagementPoints > 0
    ? Math.min(100, (engagementResult.score / maxEngagementPoints) * 100)
    : 0;

  // Calcular score total ponderado
  const totalScore = Math.round(
    (normalizedFitScore * config.fitWeight / 100) +
    (normalizedEngagementScore * config.engagementWeight / 100)
  );

  const temperature = getTemperature(totalScore, config);

  return {
    totalScore,
    fitScore: Math.round(normalizedFitScore),
    engagementScore: Math.round(normalizedEngagementScore),
    temperature,
    breakdown: {
      fit: fitBreakdown,
      engagement: engagementResult.breakdown,
    },
  };
}

// Actualizar score de un Deal y notificar si se vuelve hot
export async function updateDealScore(dealId: string): Promise<void> {
  await connectDB();

  const deal = await Deal.findById(dealId);
  if (!deal) return;

  const previousTemperature = deal.leadTemperature;
  const scoreResult = await calculateDealScore(dealId);

  if (!scoreResult) return;

  // Actualizar Deal
  await Deal.findByIdAndUpdate(dealId, {
    leadScore: scoreResult.totalScore,
    leadTemperature: scoreResult.temperature,
    leadScoreUpdatedAt: new Date(),
    scoreBreakdown: {
      fit: scoreResult.fitScore,
      engagement: scoreResult.engagementScore,
      fitDetails: scoreResult.breakdown.fit,
      engagementDetails: scoreResult.breakdown.engagement,
    },
  });

  // Notificar si cambió a hot
  if (scoreResult.temperature === 'hot' && previousTemperature !== 'hot') {
    try {
      await Notification.create({
        userId: deal.ownerId,
        type: 'crm_update',
        title: '🔥 Lead caliente detectado',
        message: `El deal "${deal.title}" se ha convertido en un lead hot con score ${scoreResult.totalScore}`,
        relatedEntity: 'deal',
        relatedId: deal._id,
        priority: 'high',
        actionUrl: `/crm/deals/${deal._id}`,
      });
    } catch (e) {
      console.error('Error creating hot lead notification:', e);
    }
  }
}

// Actualizar score de un Contact
export async function updateContactScore(contactId: string): Promise<void> {
  await connectDB();

  const contact = await Contact.findById(contactId);
  if (!contact) return;

  const scoreResult = await calculateContactScore(contactId);

  if (!scoreResult) return;

  await Contact.findByIdAndUpdate(contactId, {
    leadScore: scoreResult.totalScore,
    leadTemperature: scoreResult.temperature,
    leadScoreUpdatedAt: new Date(),
    scoreBreakdown: {
      fit: scoreResult.fitScore,
      engagement: scoreResult.engagementScore,
      fitDetails: scoreResult.breakdown.fit,
      engagementDetails: scoreResult.breakdown.engagement,
    },
  });
}

// Recalcular scores para todos los deals activos
export async function recalculateAllScores(): Promise<{ updated: number; errors: number }> {
  await connectDB();

  let updated = 0;
  let errors = 0;

  // Obtener deals en etapas no cerradas
  const PipelineStage = mongoose.models.PipelineStage;
  const closedStages = await PipelineStage?.find({ isWonStage: true }).select('_id').lean() || [];
  const lostStages = await PipelineStage?.find({ isLostStage: true }).select('_id').lean() || [];
  const excludeStageIds = [...closedStages, ...lostStages].map(s => s._id);

  const deals = await Deal.find({
    stageId: { $nin: excludeStageIds },
  }).select('_id').lean();

  for (const deal of deals) {
    try {
      await updateDealScore(deal._id.toString());
      updated++;
    } catch (e) {
      console.error(`Error updating score for deal ${deal._id}:`, e);
      errors++;
    }
  }

  return { updated, errors };
}

// Obtener estadísticas de leads por temperatura
export async function getLeadTemperatureStats(): Promise<{
  hot: number;
  warm: number;
  cold: number;
  totalValue: { hot: number; warm: number; cold: number };
}> {
  await connectDB();

  const stats = await Deal.aggregate([
    {
      $group: {
        _id: '$leadTemperature',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
      },
    },
  ]);

  const result = {
    hot: 0,
    warm: 0,
    cold: 0,
    totalValue: { hot: 0, warm: 0, cold: 0 },
  };

  stats.forEach((s: { _id: 'hot' | 'warm' | 'cold'; count: number; totalValue: number }) => {
    if (s._id) {
      result[s._id] = s.count;
      result.totalValue[s._id] = s.totalValue;
    }
  });

  return result;
}

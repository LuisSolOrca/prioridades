import { v4 as uuidv4 } from 'uuid';
import EmailTracking, { IEmailTracking } from '@/models/EmailTracking';
import mongoose from 'mongoose';

// Base URL para tracking - usar variable de entorno en producción
const getBaseUrl = () => process.env.NEXTAUTH_URL || 'http://localhost:3000';

export interface EmailTrackingOptions {
  activityId: string | mongoose.Types.ObjectId;
  dealId?: string | mongoose.Types.ObjectId;
  contactId?: string | mongoose.Types.ObjectId;
  clientId?: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  sequenceEnrollmentId?: string | mongoose.Types.ObjectId;
  subject: string;
  recipientEmail: string;
  recipientName?: string;
  bodyHtml: string;
}

export interface TrackedEmail {
  trackingId: string;
  html: string;
  tracking: IEmailTracking;
}

/**
 * Agrega tracking pixel y reescribe links en el HTML del email
 */
export function addTrackingToHtml(html: string, trackingId: string): string {
  const baseUrl = getBaseUrl();

  // 1. Reescribir todos los links para tracking de clics
  // Buscar links href="http..." o href="https..."
  let trackedHtml = html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (match, url) => {
      // No trackear links internos de la aplicación
      if (url.includes(baseUrl) && (url.includes('/api/track/') || url.includes('/unsubscribe'))) {
        return match;
      }
      const encodedUrl = encodeURIComponent(url);
      return `href="${baseUrl}/api/track/click/${trackingId}?url=${encodedUrl}"`;
    }
  );

  // 2. Agregar pixel de tracking al final del body (antes de </body> si existe)
  const trackingPixel = `<img src="${baseUrl}/api/track/open/${trackingId}" width="1" height="1" style="display:none;visibility:hidden;width:1px;height:1px;border:0;" alt="" />`;

  // Intentar insertar antes de </body>
  if (trackedHtml.includes('</body>')) {
    trackedHtml = trackedHtml.replace('</body>', `${trackingPixel}</body>`);
  } else {
    // Si no hay </body>, agregar al final
    trackedHtml += trackingPixel;
  }

  return trackedHtml;
}

/**
 * Crea un registro de tracking y procesa el HTML del email
 */
export async function createTrackedEmail(options: EmailTrackingOptions): Promise<TrackedEmail> {
  const trackingId = uuidv4();

  // Extraer preview del body (sin HTML)
  const bodyPreview = options.bodyHtml
    .replace(/<[^>]*>/g, ' ')  // Remover tags HTML
    .replace(/\s+/g, ' ')       // Normalizar espacios
    .trim()
    .substring(0, 200);

  // Crear registro de tracking
  const tracking = await EmailTracking.create({
    activityId: options.activityId,
    dealId: options.dealId,
    contactId: options.contactId,
    clientId: options.clientId,
    userId: options.userId,
    sequenceEnrollmentId: options.sequenceEnrollmentId,
    subject: options.subject,
    bodyPreview,
    recipientEmail: options.recipientEmail,
    recipientName: options.recipientName,
    trackingId,
    sentAt: new Date(),
    status: 'sent',
    openCount: 0,
    clickCount: 0,
    clickedLinks: [],
  });

  // Agregar tracking al HTML
  const trackedHtml = addTrackingToHtml(options.bodyHtml, trackingId);

  return {
    trackingId,
    html: trackedHtml,
    tracking,
  };
}

/**
 * Marca un email como entregado
 */
export async function markAsDelivered(trackingId: string): Promise<void> {
  await EmailTracking.updateOne(
    { trackingId, status: 'sent' },
    {
      $set: {
        deliveredAt: new Date(),
        status: 'delivered',
      },
    }
  );
}

/**
 * Marca un email como respondido
 */
export async function markAsReplied(trackingId: string): Promise<void> {
  await EmailTracking.updateOne(
    { trackingId },
    {
      $set: {
        repliedAt: new Date(),
        status: 'replied',
      },
    }
  );
}

/**
 * Marca un email como rebotado
 */
export async function markAsBounced(trackingId: string, reason?: string): Promise<void> {
  await EmailTracking.updateOne(
    { trackingId },
    {
      $set: {
        bouncedAt: new Date(),
        bounceReason: reason,
        status: 'bounced',
      },
    }
  );
}

/**
 * Obtiene estadísticas de tracking para un usuario
 */
export async function getTrackingStats(userId: string, dateFrom?: Date, dateTo?: Date) {
  const match: any = { userId: new mongoose.Types.ObjectId(userId) };

  if (dateFrom || dateTo) {
    match.sentAt = {};
    if (dateFrom) match.sentAt.$gte = dateFrom;
    if (dateTo) match.sentAt.$lte = dateTo;
  }

  const stats = await EmailTracking.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        totalOpened: {
          $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] },
        },
        totalClicked: {
          $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] },
        },
        totalReplied: {
          $sum: { $cond: [{ $ifNull: ['$repliedAt', false] }, 1, 0] },
        },
        totalBounced: {
          $sum: { $cond: [{ $ifNull: ['$bouncedAt', false] }, 1, 0] },
        },
        avgOpenCount: { $avg: '$openCount' },
        avgClickCount: { $avg: '$clickCount' },
      },
    },
    {
      $project: {
        _id: 0,
        totalSent: 1,
        totalOpened: 1,
        totalClicked: 1,
        totalReplied: 1,
        totalBounced: 1,
        openRate: {
          $cond: [
            { $gt: ['$totalSent', 0] },
            { $multiply: [{ $divide: ['$totalOpened', '$totalSent'] }, 100] },
            0,
          ],
        },
        clickRate: {
          $cond: [
            { $gt: ['$totalOpened', 0] },
            { $multiply: [{ $divide: ['$totalClicked', '$totalOpened'] }, 100] },
            0,
          ],
        },
        replyRate: {
          $cond: [
            { $gt: ['$totalSent', 0] },
            { $multiply: [{ $divide: ['$totalReplied', '$totalSent'] }, 100] },
            0,
          ],
        },
        bounceRate: {
          $cond: [
            { $gt: ['$totalSent', 0] },
            { $multiply: [{ $divide: ['$totalBounced', '$totalSent'] }, 100] },
            0,
          ],
        },
        avgOpenCount: { $round: ['$avgOpenCount', 1] },
        avgClickCount: { $round: ['$avgClickCount', 1] },
      },
    },
  ]);

  return stats[0] || {
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalReplied: 0,
    totalBounced: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
    bounceRate: 0,
    avgOpenCount: 0,
    avgClickCount: 0,
  };
}

/**
 * Obtiene emails sin abrir para seguimiento
 */
export async function getUnopenedEmails(
  userId: string,
  daysSinceSent: number = 3,
  limit: number = 20
) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysSinceSent);

  return EmailTracking.find({
    userId: new mongoose.Types.ObjectId(userId),
    sentAt: { $lte: dateThreshold },
    openCount: 0,
    status: { $in: ['sent', 'delivered'] },
  })
    .populate('dealId', 'title')
    .populate('contactId', 'firstName lastName')
    .sort({ sentAt: -1 })
    .limit(limit)
    .lean();
}

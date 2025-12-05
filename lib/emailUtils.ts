import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'default-secret-key-32-chars-long!';

/**
 * Encrypt a string (used for contact IDs in unsubscribe links)
 */
export function encryptId(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt a string (used for contact IDs from unsubscribe links)
 */
export function decryptId(text: string): string {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    return '';
  }
}

/**
 * Generate an unsubscribe URL for a contact
 */
export function generateUnsubscribeUrl(
  contactId: string,
  campaignId?: string,
  baseUrl?: string
): string {
  const token = encryptId(contactId);
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  let url = `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
  if (campaignId) {
    url += `&campaign=${campaignId}`;
  }
  return url;
}

/**
 * Generate a tracked link URL
 */
export function generateTrackedLink(
  originalUrl: string,
  contactId: string,
  campaignId: string,
  linkId: string,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    url: originalUrl,
    c: encryptId(contactId),
    campaign: campaignId,
    link: linkId,
  });
  return `${base}/api/email/track/click?${params.toString()}`;
}

/**
 * Generate an open tracking pixel URL
 */
export function generateOpenTrackingPixel(
  contactId: string,
  campaignId: string,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    c: encryptId(contactId),
    campaign: campaignId,
  });
  return `${base}/api/email/track/open?${params.toString()}`;
}

/**
 * Replace links in HTML with tracked versions
 */
export function replaceLinksWithTracking(
  html: string,
  contactId: string,
  campaignId: string,
  baseUrl?: string
): string {
  let linkIndex = 0;

  // Replace href links (but not unsubscribe links or anchor links)
  return html.replace(
    /href="([^"]+)"/gi,
    (match, url) => {
      // Skip unsubscribe links, mailto, tel, and anchor links
      if (
        url.includes('unsubscribe') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:') ||
        url.startsWith('#')
      ) {
        return match;
      }

      linkIndex++;
      const trackedUrl = generateTrackedLink(
        url,
        contactId,
        campaignId,
        `link-${linkIndex}`,
        baseUrl
      );
      return `href="${trackedUrl}"`;
    }
  );
}

/**
 * Add open tracking pixel to HTML email
 */
export function addOpenTracking(
  html: string,
  contactId: string,
  campaignId: string,
  baseUrl?: string
): string {
  const pixelUrl = generateOpenTrackingPixel(contactId, campaignId, baseUrl);
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;visibility:hidden;" alt="" />`;

  // Add before closing body tag or at the end
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * Add unsubscribe footer to HTML email
 */
export function addUnsubscribeFooter(
  html: string,
  contactId: string,
  campaignId: string,
  companyName: string = 'Nuestra empresa',
  baseUrl?: string
): string {
  const unsubscribeUrl = generateUnsubscribeUrl(contactId, campaignId, baseUrl);

  const footer = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px; border-top: 1px solid #e5e5e5;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px; font-size: 12px; color: #999;">
            Recibes este email porque te suscribiste a ${companyName}.
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
              Cancelar suscripción
            </a>
            &nbsp;|&nbsp;
            <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
              Administrar preferencias
            </a>
          </p>
        </td>
      </tr>
    </table>
  `;

  // Add before closing body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }

  // Add before closing table if it's a table-based email
  if (html.includes('</table>')) {
    const lastTableIndex = html.lastIndexOf('</table>');
    return html.slice(0, lastTableIndex) + footer + html.slice(lastTableIndex);
  }

  return html + footer;
}

/**
 * Prepare email HTML with all tracking and unsubscribe elements
 */
export function prepareEmailHtml(
  html: string,
  contactId: string,
  campaignId: string,
  options: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    includeUnsubscribe?: boolean;
    companyName?: string;
    baseUrl?: string;
  } = {}
): string {
  const {
    trackOpens = true,
    trackClicks = true,
    includeUnsubscribe = true,
    companyName = 'Nuestra empresa',
    baseUrl,
  } = options;

  let result = html;

  // Add click tracking
  if (trackClicks) {
    result = replaceLinksWithTracking(result, contactId, campaignId, baseUrl);
  }

  // Add unsubscribe footer
  if (includeUnsubscribe) {
    result = addUnsubscribeFooter(result, contactId, campaignId, companyName, baseUrl);
  }

  // Add open tracking (should be last to be at the bottom)
  if (trackOpens) {
    result = addOpenTracking(result, contactId, campaignId, baseUrl);
  }

  return result;
}

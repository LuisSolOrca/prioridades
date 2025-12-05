import { Resend } from 'resend';

// Lazy initialization of Resend client
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface EmailRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface BatchEmailItem {
  to: string;
  from: string;
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

// Send a single email
export async function sendEmail(options: SendEmailOptions) {
  const { to, from, subject, html, replyTo, tags } = options;

  try {
    const resend = getResend();
    const response = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
      tags,
    });

    return { success: true, data: response };
  } catch (error: any) {
    console.error('Error sending email via Resend:', error);
    return { success: false, error: error.message };
  }
}

// Send batch emails (max 100 per batch)
export async function sendBatchEmails(emails: BatchEmailItem[]) {
  if (emails.length === 0) {
    return { success: true, data: [], errors: [], totalSent: 0, totalFailed: 0 };
  }

  const resend = getResend();

  // Resend batch API accepts max 100 emails at once
  const BATCH_SIZE = 100;
  const batches: BatchEmailItem[][] = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    batches.push(emails.slice(i, i + BATCH_SIZE));
  }

  const results: { id?: string; email: string; error?: string }[] = [];
  const errors: { email: string; error: string }[] = [];

  for (const batch of batches) {
    try {
      const response = await resend.batch.send(
        batch.map(email => ({
          from: email.from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          replyTo: email.replyTo,
          tags: email.tags,
        }))
      );

      if (response.data) {
        // Response contains array of { id } for each email
        response.data.data?.forEach((item: any, index: number) => {
          results.push({
            id: item.id,
            email: batch[index].to,
          });
        });
      }

      if (response.error) {
        // Handle batch error
        batch.forEach(email => {
          errors.push({
            email: email.to,
            error: response.error?.message || 'Unknown error',
          });
        });
      }
    } catch (error: any) {
      console.error('Error sending batch emails:', error);
      batch.forEach(email => {
        errors.push({
          email: email.to,
          error: error.message || 'Batch send failed',
        });
      });
    }
  }

  return {
    success: errors.length === 0,
    data: results,
    errors,
    totalSent: results.length,
    totalFailed: errors.length,
  };
}

// Personalize email content with recipient data
export function personalizeContent(
  content: string,
  recipient: EmailRecipient
): string {
  let personalized = content;

  // Replace common merge tags
  personalized = personalized.replace(/\{\{firstName\}\}/g, recipient.firstName || '');
  personalized = personalized.replace(/\{\{lastName\}\}/g, recipient.lastName || '');
  personalized = personalized.replace(/\{\{email\}\}/g, recipient.email);
  personalized = personalized.replace(
    /\{\{fullName\}\}/g,
    [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || ''
  );

  // Clean up empty personalization tags
  personalized = personalized.replace(/\{\{[^}]+\}\}/g, '');

  return personalized;
}

// Verify if Resend is configured
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Export getResend for direct access if needed
export { getResend };

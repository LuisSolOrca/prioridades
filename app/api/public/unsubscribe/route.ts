import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import EmailCampaignRecipient from '@/models/EmailCampaignRecipient';
import crypto from 'crypto';

// Helper to encrypt/decrypt contact IDs
const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'default-secret-key-32-chars-long!';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    return '';
  }
}

// GET - Get contact preferences by token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token && !email) {
      return NextResponse.json({ error: 'Token o email requerido' }, { status: 400 });
    }

    await connectDB();

    let contact;

    if (token) {
      const contactId = decrypt(token);
      if (!contactId) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
      }
      contact = await Contact.findById(contactId).lean();
    } else if (email) {
      contact = await Contact.findOne({ email: email.toLowerCase() }).lean();
    }

    if (!contact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      firstName: contact.firstName,
      email: contact.email,
      preferences: {
        marketing: !contact.unsubscribed,
        newsletter: contact.emailPreferences?.newsletter !== false,
        promotions: contact.emailPreferences?.promotions !== false,
        productUpdates: contact.emailPreferences?.productUpdates !== false,
        events: contact.emailPreferences?.events !== false,
      },
      unsubscribedAt: contact.unsubscribedAt,
    });
  } catch (error: any) {
    console.error('Error getting preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener preferencias' },
      { status: 500 }
    );
  }
}

// POST - Update preferences or unsubscribe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, action, preferences, reason, campaignId } = body;

    if (!token && !email) {
      return NextResponse.json({ error: 'Token o email requerido' }, { status: 400 });
    }

    await connectDB();

    let contactId: string | null = null;
    let contact;

    if (token) {
      contactId = decrypt(token);
      if (!contactId) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
      }
      contact = await Contact.findById(contactId);
    } else if (email) {
      contact = await Contact.findOne({ email: email.toLowerCase() });
      if (contact) {
        contactId = contact._id.toString();
      }
    }

    if (!contact) {
      return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'unsubscribe_all') {
      // Complete unsubscribe
      await Contact.findByIdAndUpdate(contactId, {
        unsubscribed: true,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason || 'No especificado',
        emailPreferences: {
          marketing: false,
          newsletter: false,
          promotions: false,
          productUpdates: false,
          events: false,
        },
      });

      // Update campaign recipient if provided
      if (campaignId) {
        await EmailCampaignRecipient.findOneAndUpdate(
          { campaignId, contactId },
          { unsubscribed: true, unsubscribedAt: new Date() }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Te has dado de baja exitosamente de todas las comunicaciones',
      });
    } else if (action === 'update_preferences' && preferences) {
      // Update specific preferences
      const allDisabled = Object.values(preferences).every((v) => v === false);

      await Contact.findByIdAndUpdate(contactId, {
        unsubscribed: allDisabled,
        unsubscribedAt: allDisabled ? new Date() : undefined,
        emailPreferences: {
          marketing: preferences.marketing ?? true,
          newsletter: preferences.newsletter ?? true,
          promotions: preferences.promotions ?? true,
          productUpdates: preferences.productUpdates ?? true,
          events: preferences.events ?? true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Tus preferencias han sido actualizadas',
      });
    } else if (action === 'resubscribe') {
      // Re-subscribe
      await Contact.findByIdAndUpdate(contactId, {
        unsubscribed: false,
        unsubscribedAt: null,
        unsubscribeReason: null,
        emailPreferences: {
          marketing: true,
          newsletter: true,
          promotions: true,
          productUpdates: true,
          events: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Te has suscrito nuevamente a nuestras comunicaciones',
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar preferencias' },
      { status: 500 }
    );
  }
}


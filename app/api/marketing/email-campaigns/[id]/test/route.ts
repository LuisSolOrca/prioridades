import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import mongoose from 'mongoose';

// POST - Send test email
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { emails, variant } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un email de prueba' },
        { status: 400 }
      );
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e: string) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Emails inválidos: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    if (emails.length > 5) {
      return NextResponse.json(
        { error: 'Máximo 5 emails de prueba' },
        { status: 400 }
      );
    }

    const campaign = await EmailCampaign.findById(params.id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      );
    }

    // Validate campaign has content
    if (!campaign.content?.html && (!campaign.content?.json?.blocks || campaign.content.json.blocks.length === 0)) {
      return NextResponse.json(
        { error: 'La campaña no tiene contenido' },
        { status: 400 }
      );
    }

    // Get the content to send (from variant if A/B testing)
    let subject = campaign.subject;
    let content = campaign.content;
    let fromName = campaign.fromName;
    let fromEmail = campaign.fromEmail;

    if (variant && campaign.abTest?.enabled) {
      const variantData = campaign.abTest.variants.find((v) => v.id === variant);
      if (variantData) {
        subject = variantData.subject || subject;
        content = variantData.content || content;
        fromName = variantData.fromName || fromName;
        fromEmail = variantData.fromEmail || fromEmail;
      }
    }

    // Replace variables with test data
    const testData = {
      firstName: 'Juan',
      lastName: 'Prueba',
      email: emails[0],
      company: 'Empresa de Prueba',
    };

    let html = content.html || '';
    html = html.replace(/\{\{contact\.firstName\}\}/g, testData.firstName);
    html = html.replace(/\{\{contact\.lastName\}\}/g, testData.lastName);
    html = html.replace(/\{\{contact\.email\}\}/g, testData.email);
    html = html.replace(/\{\{contact\.company\}\}/g, testData.company);

    // TODO: Actually send the test email via email provider
    // For now, just simulate success
    console.log(`Sending test email to: ${emails.join(', ')}`);
    console.log(`Subject: [PRUEBA] ${subject}`);

    return NextResponse.json({
      message: `Email de prueba enviado a ${emails.length} destinatario(s)`,
      emails,
      subject: `[PRUEBA] ${subject}`,
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar email de prueba' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Deal from '@/models/Deal';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import Activity from '@/models/Activity';
import PipelineStage from '@/models/PipelineStage';
import { generateEmail } from '@/lib/crm/aiService';

// Ensure models are registered for populate
void PipelineStage;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      dealId,
      contactId,
      clientId,
      emailType = 'followup',
      customInstructions,
      tone = 'formal',
    } = body;

    // Gather context from related entities
    let dealTitle: string | undefined;
    let dealValue: number | undefined;
    let dealStage: string | undefined;
    let clientName: string | undefined;
    let contactName: string | undefined;
    let contactEmail: string | undefined;
    const previousInteractions: string[] = [];

    // Get deal info
    if (dealId) {
      const deal = await Deal.findById(dealId)
        .populate('clientId', 'name')
        .populate('contactId', 'firstName lastName email')
        .populate('stageId', 'name')
        .lean() as any;

      if (deal) {
        dealTitle = deal.title;
        dealValue = deal.value;
        dealStage = deal.stageId?.name;
        if (deal.clientId) {
          clientName = deal.clientId.name;
        }
        if (deal.contactId) {
          contactName = `${deal.contactId.firstName} ${deal.contactId.lastName}`;
          contactEmail = deal.contactId.email;
        }

        // Get recent activities for context
        const activities = await Activity.find({ dealId: deal._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        activities.forEach((a: any) => {
          const date = new Date(a.createdAt).toLocaleDateString('es-MX');
          previousInteractions.push(`${date}: ${a.type} - ${a.title}${a.outcome ? ` (${a.outcome})` : ''}`);
        });
      }
    }

    // Get contact info if provided separately
    if (contactId && !contactName) {
      const contact = await Contact.findById(contactId).populate('clientId', 'name').lean() as any;
      if (contact) {
        contactName = `${contact.firstName} ${contact.lastName}`;
        contactEmail = contact.email;
        if (contact.clientId && !clientName) {
          clientName = contact.clientId.name;
        }
      }
    }

    // Get client info if provided separately
    if (clientId && !clientName) {
      const client = await Client.findById(clientId);
      if (client) {
        clientName = client.name;
      }
    }

    // Generate email using AI
    const emailResult = await generateEmail({
      dealTitle,
      dealValue,
      dealStage,
      clientName,
      contactName,
      contactEmail,
      emailType,
      customInstructions,
      previousInteractions,
      tone,
      language: 'español',
    });

    return NextResponse.json({
      success: true,
      email: emailResult,
      context: {
        dealTitle,
        clientName,
        contactName,
        contactEmail,
      },
    });
  } catch (error: any) {
    console.error('Error generating email:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar email' },
      { status: 500 }
    );
  }
}

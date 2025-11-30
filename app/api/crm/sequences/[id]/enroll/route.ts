import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailSequence from '@/models/EmailSequence';
import SequenceEnrollment from '@/models/SequenceEnrollment';
import Contact from '@/models/Contact';
import { hasPermission } from '@/lib/permissions';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Get enrollments for a sequence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'viewCRM')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Mongoose automatically casts string to ObjectId when schema defines it as ObjectId
    const query: any = { sequenceId: id };
    if (status) {
      query.status = status;
    }

    console.log('[Enrollments API] Query:', JSON.stringify(query));

    // Debug: check all enrollments for this sequence
    const allEnrollments = await SequenceEnrollment.find({}).select('sequenceId').lean();
    console.log('[Enrollments API] All enrollments sequenceIds:', allEnrollments.map(e => e.sequenceId?.toString()));

    const [enrollments, total] = await Promise.all([
      SequenceEnrollment.find(query)
        .populate('contactId', 'firstName lastName email phone')
        .populate('dealId', 'title value')
        .populate('clientId', 'name')
        .populate('enrolledBy', 'name')
        .sort({ enrolledAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      SequenceEnrollment.countDocuments(query),
    ]);

    console.log('[Enrollments API] Found:', enrollments.length, 'Total:', total);

    return NextResponse.json({
      enrollments,
      total,
      hasMore: offset + enrollments.length < total,
    });
  } catch (error: any) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Enroll contacts in a sequence
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManageDeals')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    // Validate sequence
    const sequence = await EmailSequence.findById(id);
    if (!sequence) {
      return NextResponse.json({ error: 'Secuencia no encontrada' }, { status: 404 });
    }

    if (!sequence.isActive) {
      return NextResponse.json({ error: 'La secuencia no está activa' }, { status: 400 });
    }

    if (sequence.steps.length === 0) {
      return NextResponse.json({ error: 'La secuencia no tiene pasos configurados' }, { status: 400 });
    }

    const { contactIds, dealId, clientId } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un contacto' }, { status: 400 });
    }

    // Validate contacts exist
    const contacts = await Contact.find({ _id: { $in: contactIds } });
    if (contacts.length !== contactIds.length) {
      return NextResponse.json({ error: 'Algunos contactos no fueron encontrados' }, { status: 400 });
    }

    // Check for existing enrollments
    const existingEnrollments = await SequenceEnrollment.find({
      sequenceId: id,
      contactId: { $in: contactIds },
      status: { $in: ['active', 'paused'] },
    });

    if (existingEnrollments.length > 0) {
      const existingIds = existingEnrollments.map(e => e.contactId.toString());
      return NextResponse.json({
        error: `${existingEnrollments.length} contacto(s) ya están enrollados en esta secuencia`,
        existingContactIds: existingIds,
      }, { status: 400 });
    }

    // Calculate first step timing
    const now = new Date();
    const firstStep = sequence.steps.find(s => s.order === 1);
    const delayMs = firstStep
      ? (firstStep.delayDays * 24 * 60 * 60 * 1000) + ((firstStep.delayHours || 0) * 60 * 60 * 1000)
      : 0;
    const nextStepAt = new Date(now.getTime() + delayMs);

    // Create enrollments
    const enrollments = await Promise.all(
      contactIds.map(async (contactId: string) => {
        const contact = contacts.find(c => c._id.toString() === contactId);
        return SequenceEnrollment.create({
          sequenceId: id,
          contactId,
          dealId: dealId || undefined,
          clientId: clientId || contact?.clientId,
          status: 'active',
          currentStep: 1,
          nextStepAt,
          enrolledBy: userId,
          enrolledAt: now,
        });
      })
    );

    // Update sequence stats
    await EmailSequence.findByIdAndUpdate(id, {
      $inc: {
        totalEnrolled: enrollments.length,
        activeEnrolled: enrollments.length,
      },
    });

    return NextResponse.json({
      success: true,
      enrolled: enrollments.length,
      enrollments,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error enrolling contacts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

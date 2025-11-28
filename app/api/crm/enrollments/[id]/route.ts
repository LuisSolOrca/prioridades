import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SequenceEnrollment from '@/models/SequenceEnrollment';
import EmailSequence from '@/models/EmailSequence';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Get single enrollment
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
    const enrollment = await SequenceEnrollment.findById(id)
      .populate('sequenceId', 'name steps')
      .populate('contactId', 'firstName lastName email phone')
      .populate('dealId', 'title value')
      .populate('clientId', 'name')
      .populate('enrolledBy', 'name');

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment no encontrado' }, { status: 404 });
    }

    return NextResponse.json(enrollment);
  } catch (error: any) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update enrollment (pause, resume, exit)
export async function PUT(
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
    const body = await request.json();
    const userId = (session.user as any).id;

    const enrollment = await SequenceEnrollment.findById(id);
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment no encontrado' }, { status: 404 });
    }

    const { action, reason } = body;

    switch (action) {
      case 'pause':
        if (enrollment.status !== 'active') {
          return NextResponse.json({ error: 'Solo se pueden pausar enrollments activos' }, { status: 400 });
        }
        enrollment.status = 'paused';
        enrollment.pausedAt = new Date();
        enrollment.pausedBy = userId;

        await EmailSequence.findByIdAndUpdate(enrollment.sequenceId, {
          $inc: { activeEnrolled: -1 },
        });
        break;

      case 'resume':
        if (enrollment.status !== 'paused') {
          return NextResponse.json({ error: 'Solo se pueden reanudar enrollments pausados' }, { status: 400 });
        }
        enrollment.status = 'active';
        enrollment.resumedAt = new Date();

        // Recalculate nextStepAt if it's in the past
        const now = new Date();
        if (enrollment.nextStepAt && enrollment.nextStepAt < now) {
          enrollment.nextStepAt = now;
        }

        await EmailSequence.findByIdAndUpdate(enrollment.sequenceId, {
          $inc: { activeEnrolled: 1 },
        });
        break;

      case 'exit':
        if (!['active', 'paused'].includes(enrollment.status)) {
          return NextResponse.json({ error: 'Este enrollment ya finalizó' }, { status: 400 });
        }

        const wasActive = enrollment.status === 'active';
        enrollment.status = 'exited';
        enrollment.exitReason = reason || 'Manual exit';
        enrollment.exitedAt = new Date();

        if (wasActive) {
          await EmailSequence.findByIdAndUpdate(enrollment.sequenceId, {
            $inc: { activeEnrolled: -1 },
          });
        }
        break;

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    await enrollment.save();

    const updated = await SequenceEnrollment.findById(id)
      .populate('sequenceId', 'name')
      .populate('contactId', 'firstName lastName email')
      .populate('dealId', 'title')
      .populate('enrolledBy', 'name');

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating enrollment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete enrollment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar enrollments' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const enrollment = await SequenceEnrollment.findById(id);

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment no encontrado' }, { status: 404 });
    }

    // Update sequence stats
    if (enrollment.status === 'active') {
      await EmailSequence.findByIdAndUpdate(enrollment.sequenceId, {
        $inc: { activeEnrolled: -1, totalEnrolled: -1 },
      });
    } else {
      await EmailSequence.findByIdAndUpdate(enrollment.sequenceId, {
        $inc: { totalEnrolled: -1 },
      });
    }

    await SequenceEnrollment.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting enrollment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
